import { describe, expect, it } from "vitest";

import { detectImageDimensions } from "./media-metadata";

describe("detectImageDimensions", () => {
  it("detects PNG dimensions from IHDR", () => {
    // Minimal valid PNG: signature + IHDR chunk
    const head = Buffer.alloc(33);
    // PNG signature
    head[0] = 0x89;
    head.write("PNG\r\n\x1a\n", 1, "ascii");
    // IHDR: length = 13
    head.writeUInt32BE(13, 8);
    head.write("IHDR", 12, "ascii");
    head.writeUInt32BE(1920, 16); // width
    head.writeUInt32BE(1080, 20); // height

    expect(detectImageDimensions("image/png", head)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("detects JPEG dimensions from SOF0 marker", () => {
    // Minimal JPEG: SOI + APP0 + SOF0 (3 components)
    const head = Buffer.alloc(32);
    // SOI
    head[0] = 0xff;
    head[1] = 0xd8;
    // APP0 marker (skipped by parser)
    head[2] = 0xff;
    head[3] = 0xe0;
    head.writeUInt16BE(10, 4); // APP0 length including 2-byte length field
    // SOF0 (Baseline DCT)
    head[12] = 0xff;
    head[13] = 0xc0;
    head.writeUInt16BE(17, 14); // segment length = 8 + 3*3 = 17 (includes length field)
    head[16] = 8; // sample precision
    head.writeUInt16BE(800, 17); // height
    head.writeUInt16BE(600, 19); // width
    head[21] = 3; // component count
    // 3 component descriptors (id, sampling, qtable) at 22..30
    head[22] = 1; head[23] = 0x22; head[24] = 0;
    head[25] = 2; head[26] = 0x11; head[27] = 1;
    head[28] = 3; head[29] = 0x11; head[30] = 1;

    expect(detectImageDimensions("image/jpeg", head)).toEqual({
      width: 600,
      height: 800,
    });
  });

  it("detects GIF dimensions", () => {
    const head = Buffer.alloc(10);
    head.write("GIF89a", 0, "ascii");
    head.writeUInt16LE(320, 6); // width (LE)
    head.writeUInt16LE(240, 8); // height (LE)

    expect(detectImageDimensions("image/gif", head)).toEqual({
      width: 320,
      height: 240,
    });
  });

  it("detects WebP lossy dimensions", () => {
    const head = Buffer.alloc(30);
    head.write("RIFF", 0, "ascii");
    head.writeUInt32LE(100, 4);
    head.write("WEBP", 8, "ascii");
    head.write("VP8 ", 12, "ascii");
    // VP8 frame header: 14-bit (width-1) at bits 0-13, 14-bit (height-1) at bits 16-29.
    // Write 639 (640-1) = 0x027f for both.
    head[26] = 0x7f;
    head[27] = 0x02;
    head[28] = 0x7f;
    head[29] = 0x02;

    const result = detectImageDimensions("image/webp", head);
    // VP8 stores (width-1) and (height-1). 0x027f+1=640.
    expect(result).toEqual({ width: 640, height: 640 });
  });

  it("returns null for unsupported mime types", () => {
    const buf = Buffer.alloc(32);
    expect(detectImageDimensions("application/pdf", buf)).toBeNull();
  });

  it("returns null for corrupt headers", () => {
    const buf = Buffer.alloc(8);
    expect(detectImageDimensions("image/png", buf)).toBeNull();
  });
});