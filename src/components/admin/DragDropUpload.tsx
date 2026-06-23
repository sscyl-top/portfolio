"use client";

import { useState, useCallback, type DragEvent, type ReactNode } from "react";

type DragDropUploadProps = {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  children?: ReactNode;
  className?: string;
};

export function DragDropUpload({
  onUpload,
  accept = "image/*,video/*,application/pdf",
  multiple = true,
  maxSize = 25 * 1024 * 1024,
  children,
  className = "",
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateFiles = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (file.size > maxSize) {
          errors.push(`文件 "${file.name}" 超出大小限制（最大 ${Math.round(maxSize / 1024 / 1024)}MB）`);
          continue;
        }
        validFiles.push(file);
      }

      if (errors.length > 0) {
        alert(errors.join("\n"));
      }

      return validFiles;
    },
    [maxSize],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(droppedFiles);

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [onUpload, validateFiles],
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const selectedFiles = Array.from(target.files);
        const validFiles = validateFiles(selectedFiles);

        if (validFiles.length > 0) {
          onUpload(validFiles);
        }
      }
    };

    input.click();
  }, [onUpload, accept, multiple, validateFiles]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`cursor-pointer transition-colors ${
        isDragging
          ? "border-cyan bg-cyan/10"
          : "border-white/20 hover:border-white/40"
      } ${className}`}
    >
      {children || (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-12 w-12 transition-colors ${
              isDragging ? "text-cyan" : "text-white/30"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-white/70">
              拖拽文件到此处，或点击上传
            </p>
            <p className="mt-1 text-xs text-white/30">
              支持图片、视频、PDF
              {multiple ? "（可多选）" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
