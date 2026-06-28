"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { DragDropUpload } from "@/components/admin/DragDropUpload";
import { uploadMediaFiles } from "@/lib/cms/upload-media";

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [currentFile, setCurrentFile] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setProgress({});
    setCurrentFile("");

    const fileInput = fileRef.current;
    if (!fileInput?.files?.length) {
      setMessage({ type: "error", text: "请选择文件" });
      return;
    }

    const files = Array.from(fileInput.files);

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFile(file.name);
        setProgress((prev) => ({ ...prev, [file.name]: 0 }));
      }

      await uploadMediaFiles(files, (p) => setProgress({ ...p }));

      setMessage({ type: "ok", text: `成功上传 ${files.length} 个文件` });
      fileInput.value = "";
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setUploading(false);
      setCurrentFile("");
    }
  }, []);

  return (
    <div>
      <DragDropUpload
        onUpload={async (files) => {
          const dataTransfer = new DataTransfer();
          files.forEach((file) => dataTransfer.items.add(file));
          if (fileRef.current) {
            fileRef.current.files = dataTransfer.files;
          }
          const form = fileRef.current?.closest("form");
          if (form) {
            form.requestSubmit();
          }
        }}
      >
        <div className="mb-4">
          拖拽文件到此处上传
        </div>
      </DragDropUpload>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_auto]">
        <input
          ref={fileRef}
          name="file"
          type="file"
          required
          multiple
          accept="image/*,video/*,application/pdf"
          disabled={uploading}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
        />
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          {uploading ? "上传中…" : "上传"}
        </button>
      </form>

      {uploading ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/48">正在上传: {currentFile}</p>
          {Object.entries(progress).map(([filename, pct]) => (
            <div key={filename}>
              <div className="flex justify-between text-xs">
                <span className="truncate">{filename}</span>
                <span>{pct >= 0 ? `${pct}%` : "失败"}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-200"
                  style={{ width: `${Math.max(0, pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {message ? (
        <p
          className={`mt-2 rounded-md px-3 py-1.5 text-sm ${
            message.type === "ok"
              ? "bg-green-300/10 text-green-200"
              : "bg-red-300/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
