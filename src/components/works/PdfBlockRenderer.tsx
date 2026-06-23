"use client";

import { useState, useEffect, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type PdfBlockRendererProps = {
  storageKey: string;
  caption?: string;
};

export function PdfBlockRenderer({ storageKey, caption }: PdfBlockRendererProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => {
    return buildPublicMediaUrl(storageKey);
  }, [storageKey]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({ url: url });
        const pdfDocument = await loadingTask.promise;

        const pageImages: string[] = [];
        
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          
          // Create canvas to render the page
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          const viewport = page.getViewport({ scale: 1.5 });
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render the page
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          }).promise;
          
          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL();
          pageImages.push(dataUrl);
        }
        
        setPages(pageImages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-white/50">正在加载 PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-red-400">PDF 加载失败: {error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-block space-y-4">
      {pages.map((pageUrl, index) => (
        <div key={index} className="pdf-page">
          <img
            src={pageUrl}
            alt={`PDF 第 ${index + 1} 页`}
            className="w-full rounded-md"
          />
        </div>
      ))}
      
      {caption ? (
        <p className="text-center text-sm text-white/60">{caption}</p>
      ) : null}
    </div>
  );
}
