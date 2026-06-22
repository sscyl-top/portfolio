"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setProgress(0);
    const fileInput = fileRef.current;
    if (!fileInput?.files?.[0]) {
      setMessage({ type: "error", text: "请选择一个文件" });
      return;
    }

    const file = fileInput.files[0];
    const altText =
      (e.currentTarget.elements.namedItem("alt_text") as HTMLInputElement)?.value?.trim() || "";

    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage({
        type: "error",
        text: `文件大小超出限制（最大 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB）`,
      });
      return;
    }

    setUploading(true);
    try {
      // 使用 XMLHttpRequest 显示上传进度
      await new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (altText) formData.append("alt_text", altText);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`上传失败 (HTTP ${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("网络连接失败，请检查网络"));
        xhr.ontimeout = () => reject(new Error("请求超时，请重试"));

        xhr.timeout = 300000; // 5分钟超时
        xhr.open("POST", "/api/media/upload");
        xhr.send(formData);
      });

      setMessage({ type: "ok", text: `${file.name} 上传成功` });
      fileInput.value = "";
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_1fr_auto]">
        <input
          ref={fileRef}
          name="file"
          type="file"
          required
          accept="image/*,video/*,application/pdf"
          disabled={uploading}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
        />
        <input
          name="alt_text"
          placeholder="替代文本"
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        />
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          {uploading ? `上传中...${progress > 0 ? ` ${progress}%` : ""}` : "上传"}
        </button>
      </form>
      {uploading && progress > 0 ? (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/40">{progress}%</p>
        </div>
      ) : null}
      {message && (
        <p
          className={`mt-2 rounded-md px-3 py-1.5 text-sm ${
            message.type === "ok"
              ? "bg-green-300/10 text-green-200"
              : "bg-red-300/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
