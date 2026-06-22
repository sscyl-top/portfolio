"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const fileInput = fileRef.current;
    if (!fileInput?.files?.[0]) {
      setMessage({ type: "error", text: "请选择一个文件" });
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    const altInput = (e.currentTarget.elements.namedItem("alt_text") as HTMLInputElement)?.value || "";
    formData.append("alt_text", altInput);

    setUploading(true);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || `上传失败 (${res.status})` });
        return;
      }

      setMessage({ type: "ok", text: `${data.name} 上传成功` });
      fileInput.value = "";
      // Refresh the media list
      window.location.reload();
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_1fr_auto]">
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
          {uploading ? "上传中…" : "上传"}
        </button>
      </form>
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
