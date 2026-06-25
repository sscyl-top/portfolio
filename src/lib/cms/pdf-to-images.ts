"use client";

import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type PdfPageImage = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  pageNumber: number;
};

/**
 * 将PDF文件的每一页渲染为JPEG图片Blob
 * @param file PDF文件
 * @param scale 渲染缩放比例（默认2.0保证清晰度）
 * @param onProgress 进度回调 (currentPage, totalPages)
 */
export async function pdfToImages(
  file: File,
  scale = 2.0,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfPageImage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdf.numPages;
  const baseName = file.name.replace(/\.pdf$/i, "");

  const pages: PdfPageImage[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.(i - 1, total);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`第${i}页转图片失败`))),
        "image/jpeg",
        0.92,
      );
    });

    pages.push({
      blob,
      filename: `${baseName}-p${String(i).padStart(2, "0")}.jpg`,
      width: viewport.width,
      height: viewport.height,
      pageNumber: i,
    });

    onProgress?.(i, total);
  }

  return pages;
}
