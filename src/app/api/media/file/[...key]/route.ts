import { getR2Object } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 60;

// R2 文件代理：通过应用域名访问 R2 对象，绕过 r2.dev 开发域名的速率限制。
// 路径形式：/api/media/file/r2/uploads/2026/06/xxx.png
// 也支持不带 r2/ 前缀的旧 key（自动补 r2/ 前缀从 R2 拉取）
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: keyParts } = await context.params;
  const key = keyParts.join("/");

  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  // storage_key 可能以 "r2/" 前缀开头（当前方案）或不带前缀（兼容旧记录已标记的情况）
  const storageKey = key.startsWith("r2/") ? key : `r2/${key}`;

  try {
    const obj = await getR2Object(storageKey);
    if (!obj) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", obj.contentType);
    headers.set("Content-Length", String(obj.contentLength));
    // 浏览器长期缓存（immutable）：文件 key 含 UUID，不会变更
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (obj.etag) {
      headers.set("ETag", obj.etag);
    }

    return new Response(obj.body as BodyInit, { headers });
  } catch (err) {
    console.error("[R2 proxy] Failed to fetch object:", storageKey, err);
    return new Response("Internal error", { status: 500 });
  }
}
