import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { runBucketSizeLimitMigration } from "@/lib/cms/migrations";
import { isCosConfigured, createCosSignedUploadUrl } from "@/lib/cos/client";
import { isR2Configured, createR2SignedUploadUrl } from "@/lib/r2/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, fileSize, contentType } = body;

    if (!filename || typeof filename !== "string") {
      return Response.json({ error: "缺少文件名" }, { status: 400 });
    }

    if (typeof fileSize !== "number" || fileSize <= 0) {
      return Response.json({ error: "缺少文件大小" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { error: `单文件大小不能超过 10GB（当前 ${Math.round(fileSize / 1024 / 1024 / 1024)}GB）` },
        { status: 413 },
      );
    }

    const id = randomUUID();
    const storageKey = buildStorageKey(filename, id);

    // 优先 R2（直传，避免 Vercel 函数带宽消耗）
    if (isR2Configured()) {
      // 确保 storageKey 以 r2/ 前缀开头，标记为 R2 存储
      const r2StorageKey = storageKey.startsWith("r2/") ? storageKey : `r2/${storageKey}`;
      const result = await createR2SignedUploadUrl(
        r2StorageKey,
        contentType || "application/octet-stream",
      );

      return Response.json({
        signedUrl: result.signedUrl,
        id: result.id,
        storageKey: result.storageKey,
      });
    }

    // 次选 COS（仍支持，但已被 R2 取代）
    if (isCosConfigured()) {
      const result = await createCosSignedUploadUrl(
        storageKey,
        contentType || "application/octet-stream",
      );

      return Response.json({
        signedUrl: result.signedUrl,
        id: result.id,
        storageKey: result.storageKey,
      });
    }

    // 最后降级到 Supabase Storage
    await runBucketSizeLimitMigration().catch(() => {});

    const service = createSupabaseServiceClient();
    const { data, error } = await service.storage
      .from("portfolio-media")
      .createSignedUploadUrl(storageKey);

    if (error) {
      return Response.json(
        { error: `生成上传URL失败: ${error.message}` },
        { status: 500 },
      );
    }

    return Response.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      id,
      storageKey,
    });
  } catch (error) {
    return Response.json(
      { error: `生成上传URL失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
