"use client";

import { useState, useCallback, useRef } from "react";
import { X, Check } from "lucide-react";
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type Props = {
  imageSrc: string;       // 原始图片 URL
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
  aspect?: number;        // 裁剪比例，undefined = 自由
};

/**
 * 图片裁剪模态框
 * 使用 react-image-crop + Canvas 实现客户端裁剪
 */
export function ImageCropper({ imageSrc, onCropComplete, onClose, aspect }: Props) {
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 图片加载后初始化裁剪区域
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      const crop = aspect
        ? centerCrop(
            makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
            width,
            height,
          )
        : { unit: "%" as const, width: 90, height: 90, x: 5, y: 5 };
      setCrop(crop);
    },
    [aspect],
  );

  // 生成裁剪后的 Blob
  const generateCroppedBlob = useCallback(() => {
    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!image || !previewCanvas || !completedCrop?.width || !completedCrop?.height) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 使用 react-image-crop 推荐的 canvas 绘制方式
    const cropWidth = (completedCrop.width || 0) * image.naturalWidth / 100;
    const cropHeight = (completedCrop.height || 0) * image.naturalHeight / 100;
    const cropXPos = (completedCrop.x || 0) * image.naturalWidth / 100;
    const cropYPos = (completedCrop.y || 0) * image.naturalHeight / 100;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(
      image,
      cropXPos,
      cropYPos,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      "image/jpeg",
      0.92,
    );
  }, [completedCrop, onCropComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-[90vw] max-w-3xl overflow-auto rounded-2xl border border-white/15 bg-[#1a1a2e] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">裁剪图片</h4>
          <button onClick={onClose} className="rounded p-1 text-white/30 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 裁剪区域 */}
        <div className="flex justify-center bg-black/30 rounded-lg p-2 mb-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
            aspect={aspect}
            className="max-h-[60vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="裁剪预览"
              className="max-h-[60vh] w-auto"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* 隐藏的预览 canvas */}
        <canvas ref={previewCanvasRef} className="hidden" />

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* 比例快捷按钮 */}
            {[undefined, 1, 4/3, 16/9].map((asp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (imgRef.current) {
                    const { naturalWidth: w, naturalHeight: h } = imgRef.current;
                    setCrop(
                      asp
                        ? centerCrop(makeAspectCrop({ unit: "%", width: 80 }, asp, w, h), w, h)
                        : { unit: "%" as const, width: 90, height: 90, x: 5, y: 5 }
                    );
                  }
                }}
                className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40 transition hover:border-white/20 hover:text-white/70"
              >
                {asp === undefined ? "自由" : asp === 1 ? "1:1" : asp === 4/3 ? "4:3" : "16:9"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/50 transition hover:bg-white/5"
            >
              取消
            </button>
            <button
              type="button"
              onClick={generateCroppedBlob}
              className="flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan/80"
            >
              <Check className="h-4 w-4" />
              确认裁剪
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
