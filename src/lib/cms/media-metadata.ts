/**
 * Detects image dimensions from the first KiB of a file buffer.
 * Supports PNG, JPEG, GIF, and WebP — the formats accepted by the
 * media upload form. Returns null for unsupported or corrupt headers.
 */
export function detectImageDimensions(
  mimeType: string,
  head: Buffer,
): { width: number; height: number } | null {
  try {
    if (mimeType === "image/png") return detectPng(head);
    if (mimeType === "image/jpeg") return detectJpeg(head);
    if (mimeType === "image/gif") return detectGif(head);
    if (mimeType === "image/webp") return detectWebp(head);
  } catch {
    // Corrupt or truncated header — skip silently.
  }
  return null;
}

function detectPng(head: Buffer) {
  // PNG IHDR is at offset 16: 4 bytes width (big-endian), 4 bytes height.
  if (head.length < 24) return null;
  if (head[1] !== 0x50 || head[2] !== 0x4e || head[3] !== 0x47) return null; // "PNG"
  return {
    width: head.readUInt32BE(16),
    height: head.readUInt32BE(20),
  };
}

function detectJpeg(head: Buffer) {
  // Scan for SOFn marker (0xff 0xc0 - 0xff 0xc3) to get dimensions.
  if (head.length < 4 || head[0] !== 0xff || head[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 <= head.length) {
    if (head[offset] !== 0xff) break;
    const marker = head[offset + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: head.readUInt16BE(offset + 5),
        width: head.readUInt16BE(offset + 7),
      };
    }
    offset += head.readUInt16BE(offset + 2);
  }
  return null;
}

function detectGif(head: Buffer) {
  // GIF87a / GIF89a header at offset 6: width (2 bytes LE), height (2 bytes LE).
  if (head.length < 10) return null;
  const sig = head.toString("ascii", 0, 6);
  if (sig !== "GIF89a" && sig !== "GIF87a") return null;
  return {
    width: head.readUInt16LE(6),
    height: head.readUInt16LE(8),
  };
}

function detectWebp(head: Buffer) {
  // VP8 / VP8L / VP8X chunk layout.
  if (head.length < 30) return null;
  if (head[0] !== 0x52 || head[1] !== 0x49 || head[2] !== 0x46 || head[3] !== 0x46) return null; // "RIFF"
  // "WEBP"
  if (head[8] !== 0x57 || head[9] !== 0x45 || head[10] !== 0x42 || head[11] !== 0x50) return null;
  const chunk = head.toString("ascii", 12, 16);
  if (chunk === "VP8 " || chunk === "VP8L") {
    // Lossy / lossless: width and height are 14 bits each at offset 26.
    const w16 = head.readUInt16LE(26);
    return { width: (w16 & 0x3fff) + 1, height: (head.readUInt16LE(28) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    // Extended: width/height at offset 24.
    return {
      width: (head.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (head.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  return null;
}