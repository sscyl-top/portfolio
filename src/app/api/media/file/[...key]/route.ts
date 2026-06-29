import { getR2Object } from "@/lib/r2/client";
import { buildR2PublicUrl, isR2Configured } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * R2 文件代理路由（已降级为兜底，仅在以下场景使用）：
 * 1. 旧版缓存 HTML 中仍引用 /api/media/file/r2/... 路径
 * 2. 本地开发环境未配置 NEXT_PUBLIC_R2_* 客户端变量
 *
 * 生产环境优先使用 buildPublicMediaUrl() 返回的 R2 直连 URL，
 * 此路由仅作为兼容兜底，并添加 s-maxage 让 Vercel CDN 缓存响应，
 * 减少函数调用次数与带宽消耗。
 *
 * 路径形式：/api/media/file/r2/uploads/2026/06/xxx.png
 * 也支持不带 r2/ 前缀的旧 key（自动补 r2/ 前缀从 R2 拉取）
 */
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

  // 如果 R2 直连 URL 已配置（生产环境），优先 301 重定向到直连 URL
  // 这样可以彻底绕过 Vercel 函数，由浏览器直接从 R2 CDN 拉取
  if (isR2Configured()) {
    try {
      const directUrl = buildR2PublicUrl(storageKey);
      return new Response(null, {
        status: 308, // 308 Permanent Redirect（保持 GET 方法）
        headers: {
          Location: directUrl,
          // CDN 永久缓存重定向响应，避免后续请求再走函数
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // R2 未配置时降级到代理拉取
    }
  }

  try {
    const obj = await getR2Object(storageKey);
    if (!obj) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", obj.contentType);
    headers.set("Content-Length", String(obj.contentLength));
    // 浏览器长期缓存（immutable）：文件 key 含 UUID，不会变更
    // 同时添加 s-maxage 让 Vercel CDN 缓存响应，减少函数调用
    headers.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    if (obj.etag) {
      headers.set("ETag", obj.etag);
    }

    return new Response(obj.body as BodyInit, { headers });
  } catch (err) {
    console.error("[R2 proxy] Failed to fetch object:", storageKey, err);
    return new Response("Internal error", { status: 500 });
  }
}
