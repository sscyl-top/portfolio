import sharp from "sharp";

/**
 * 图片多尺寸生成工具
 *
 * 策略：
 * - thumb:  800px 宽，quality 78，适合卡片展示（封面卡片压小无所谓）
 * - large:  2400px 宽，quality 88，适合详情页大图（不压得太狠，保留质感）
 * - original: 原图不处理（供下载）
 *
 * 输出格式：
 * - PNG 透明图保持 PNG 格式（保留无损透明通道，兼容性最好）
 * - 其他图片统一转 WebP（比 JPEG 小 25-35%，浏览器支持率 97%+）
 *   注：不走 Vercel Image Optimization，零额度消耗。
 *   AVIF 压缩率更好但编码慢 5-10 倍，serverless 易超时，暂不采用。
 */

const THUMB_WIDTH = 800;
const LARGE_WIDTH = 2400;
const THUMB_QUALITY = 78;
const LARGE_QUALITY = 88;

export type ImageVariants = {
  thumb: Buffer;
  large: Buffer;
  thumbContentType: string;
  largeContentType: string;
};

/**
 * 判断是否为需要生成多尺寸的图片（非 GIF、非 SVG）
 */
export function isOptimizableImage(mimeType: string): boolean {
  return (
    (mimeType.startsWith("image/") &&
      mimeType !== "image/gif" &&
      mimeType !== "image/svg+xml") ||
    false
  );
}

/**
 * 判断是否为 PNG（带透明通道）
 */
function isPng(mimeType: string): boolean {
  return mimeType === "image/png";
}

/**
 * 生成图片的 thumb 和 large 两个尺寸
 *
 * PNG 保持 PNG 格式（无损透明），其他转 WebP（体积更小）。
 *
 * @param buffer 原图 Buffer
 * @param mimeType 原图 MIME 类型
 * @returns { thumb, large } 两个尺寸的 Buffer
 */
export async function generateImageVariants(
  buffer: Buffer,
  mimeType: string,
): Promise<ImageVariants> {
  const png = isPng(mimeType);
  const thumbContentType = png ? "image/png" : "image/webp";
  const largeContentType = png ? "image/png" : "image/webp";

  // 并行生成两个尺寸
  const [thumb, large] = await Promise.all([
    sharp(buffer)
      .resize(THUMB_WIDTH, undefined, {
        withoutEnlargement: true,
        fit: "inside",
      })
      [png ? "png" : "webp"]({ quality: THUMB_QUALITY })
      .toBuffer(),
    sharp(buffer)
      .resize(LARGE_WIDTH, undefined, {
        withoutEnlargement: true,
        fit: "inside",
      })
      [png ? "png" : "webp"]({ quality: LARGE_QUALITY })
      .toBuffer(),
  ]);

  return { thumb, large, thumbContentType, largeContentType };
}

/**
 * 从原始 storage_key 生成 thumb/large 的 storage_key
 * 规则：在文件名后加 -thumb / -large 后缀
 *
 * PNG 保持原扩展名（.png），其他输出 .webp 扩展名
 *
 * 例：r2/uploads/2026/06/abc-photo.jpg
 *  → r2/uploads/2026/06/abc-photo-thumb.webp
 *  → r2/uploads/2026/06/abc-photo-large.webp
 *
 * 例：r2/uploads/2026/06/cover.png
 *  → r2/uploads/2026/06/cover-thumb.png
 *  → r2/uploads/2026/06/cover-large.png
 */
export function buildVariantStorageKey(
  originalKey: string,
  variant: "thumb" | "large",
): string {
  const lastSlash = originalKey.lastIndexOf("/");
  if (lastSlash === -1) return `${originalKey}-${variant}`;

  const dir = originalKey.substring(0, lastSlash + 1);
  const filename = originalKey.substring(lastSlash + 1);

  // 在文件名最后一段加后缀
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${dir}${filename}-${variant}`;
  }

  const name = filename.substring(0, dotIndex);
  const originalExt = filename.substring(dotIndex).toLowerCase();
  // PNG 保持 .png 扩展名，其他统一用 .webp
  const ext = originalExt === ".png" ? ".png" : ".webp";
  return `${dir}${name}-${variant}${ext}`;
}
