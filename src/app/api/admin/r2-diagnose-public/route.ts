import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isR2Configured,
  getR2Config,
  buildR2PublicUrl,
  uploadR2Object,
  deleteR2Object,
} from "@/lib/r2/client";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

export const runtime = "nodejs";
export const maxDuration = 300;

// 临时一次性token——只在本次诊断期间有效
// 用环境变量 R2_DIAG_TOKEN 控制；如果未设置则只允许 token=r2diag-onetime-2026
const ALLOWED_TOKEN = process.env.R2_DIAG_TOKEN || "r2diag-onetime-2026";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token !== ALLOWED_TOKEN) {
    return Response.json({ error: "无效token" }, { status: 403 });
  }

  const action = url.searchParams.get("action") ?? "diagnose";

  // 诊断模式
  if (action === "diagnose") {
    const r2Configured = isR2Configured();
    const envVars: Record<string, boolean> = {
      R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID),
      R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID),
      R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY),
      R2_BUCKET: Boolean(process.env.R2_BUCKET),
      R2_PUBLIC_URL: Boolean(process.env.R2_PUBLIC_URL),
    };

    let r2ConfigInfo: Record<string, unknown> = {};
    let defaultR2PublicUrl = "";
    if (r2Configured) {
      const config = getR2Config();
      r2ConfigInfo = {
        bucket: config.bucket,
        accountId: config.accountId,
        publicUrl: config.publicUrl ?? "(未配置，将使用r2.dev默认)",
      };
      defaultR2PublicUrl = config.publicUrl
        ? config.publicUrl.replace(/\/$/, "")
        : `https://${config.bucket}.${config.accountId}.r2.dev`;
    }

    // 测试R2上传：上传一个1x1的测试图片
    let testUploadResult: Record<string, unknown> = {};
    if (r2Configured) {
      const testKey = `r2/_diagnostic/test-${randomUUID()}.png`;
      // 1x1 transparent PNG
      const testPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
      );
      try {
        await uploadR2Object(testKey, testPng, "image/png");
        const testUrl = buildR2PublicUrl(testKey);
        testUploadResult = {
          success: true,
          testKey,
          testUrl,
          message: "测试文件已上传到R2，下一步会尝试验证testUrl是否可访问",
        };

        // 立即验证testUrl是否可访问（服务端fetch）
        try {
          const verifyResp = await fetch(testUrl, { method: "HEAD" });
          testUploadResult.verifyStatus = verifyResp.status;
          testUploadResult.verifyOk = verifyResp.ok;
          testUploadResult.verifyHeaders = {
            "content-type": verifyResp.headers.get("content-type"),
            "content-length": verifyResp.headers.get("content-length"),
            "cache-control": verifyResp.headers.get("cache-control"),
          };
        } catch (verifyErr) {
          testUploadResult.verifyOk = false;
          testUploadResult.verifyError = (verifyErr as Error).message;
        }

        // 清理测试文件
        await deleteR2Object(testKey).catch(() => {});
      } catch (err) {
        testUploadResult = {
          success: false,
          error: (err as Error).message,
          stack: (err as Error).stack,
        };
      }
    }

    // 统计需要迁移的文件
    const service = createSupabaseServiceClient();
    const { count: totalCount } = await service
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const { count: r2Count } = await service
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .like("storage_key", "r2/%")
      .is("deleted_at", null);

    const { count: supabaseCount } = await service
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .not("storage_key", "like", "r2/%")
      .is("deleted_at", null);

    // 取几个示例文件，展示它们当前的URL
    const { data: samples } = await service
      .from("media_assets")
      .select("id,storage_key,mime_type,original_name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const sampleUrls = (samples ?? []).map((s) => ({
      id: s.id,
      storage_key: s.storage_key,
      original_name: s.original_name,
      isR2: s.storage_key.startsWith("r2/"),
      publicUrl: buildPublicMediaUrl(s.storage_key),
    }));

    return Response.json({
      r2Configured,
      envVars,
      r2ConfigInfo,
      defaultR2PublicUrl,
      testUploadResult,
      migrationStats: {
        total: totalCount ?? 0,
        alreadyR2: r2Count ?? 0,
        needMigration: supabaseCount ?? 0,
      },
      sampleUrls,
    });
  }

  // 迁移模式
  if (action === "migrate") {
    if (!isR2Configured()) {
      return Response.json({ error: "R2未配置" }, { status: 500 });
    }

    const service = createSupabaseServiceClient();

    // 获取所有需要迁移的文件（没有r2/前缀的）
    const { data: mediaItems, error: queryError } = await service
      .from("media_assets")
      .select("id,storage_key,mime_type")
      .not("storage_key", "like", "r2/%")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (queryError) {
      return Response.json({ error: `查询失败: ${queryError.message}` }, { status: 500 });
    }

    const items = mediaItems ?? [];
    const results: Array<{
      id: string;
      oldKey: string;
      newKey: string;
      success: boolean;
      error?: string;
    }> = [];

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      const oldKey = item.storage_key;
      const newKey = `r2/${oldKey}`;

      try {
        // 1. 从Supabase Storage下载文件
        const { data: fileData, error: downloadError } = await service.storage
          .from("portfolio-media")
          .download(oldKey);

        if (downloadError || !fileData) {
          results.push({
            id: item.id,
            oldKey,
            newKey,
            success: false,
            error: `下载失败: ${downloadError?.message ?? "无数据"}`,
          });
          failCount++;
          continue;
        }

        // 2. 转为Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = item.mime_type || "application/octet-stream";

        // 3. 上传到R2
        await uploadR2Object(newKey, buffer, mimeType);

        // 4. 更新数据库中的storage_key
        const { error: updateError } = await service
          .from("media_assets")
          .update({ storage_key: newKey })
          .eq("id", item.id);

        if (updateError) {
          results.push({
            id: item.id,
            oldKey,
            newKey,
            success: false,
            error: `数据库更新失败: ${updateError.message}`,
          });
          failCount++;
          continue;
        }

        results.push({
          id: item.id,
          oldKey,
          newKey,
          success: true,
        });
        successCount++;
      } catch (err) {
        results.push({
          id: item.id,
          oldKey,
          newKey,
          success: false,
          error: (err as Error).message,
        });
        failCount++;
      }
    }

    return Response.json({
      total: items.length,
      success: successCount,
      failed: failCount,
      results: results.slice(0, 50), // 只返回前50条详情
    });
  }

  return Response.json({ error: "未知操作" }, { status: 400 });
}
