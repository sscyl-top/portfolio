import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildStorageKey } from "@/lib/cms/admin-model";

export const runtime = "nodejs";

/**
 * 生成 Supabase Storage 签名上传 URL
 * 浏览器拿到 URL 后直接 PUT 文件到 Supabase，不经过 Vercel
 * 彻底绕过 Vercel 4.5MB 请求体限制
 */
export async function POST(request: Request) {
  // 认证
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  try {
    const body = await request.json();
    const { filename, fileSize } = body;

    if (!filename || typeof filename !== "string") {
      return Response.json({ error: "缺少文件名" }, { status: 400 });
    }

    if (typeof fileSize !== "number" || fileSize <= 0) {
      return Response.json({ error: "缺少文件大小" }, { status: 400 });
    }

    // 10GB 单文件上限
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { error: `单文件大小不能超过 10GB（当前 ${Math.round(fileSize / 1024 / 1024 / 1024)}GB）` },
        { status: 413 },
      );
    }

    const id = randomUUID();
    const storageKey = buildStorageKey(filename, id);

    // 用 service_role 生成签名上传 URL
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
