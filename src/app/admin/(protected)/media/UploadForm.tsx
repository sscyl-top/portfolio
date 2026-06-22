"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// 客户端Supabase实例（用于直传Storage）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
      // Step 1: 客户端直传Supabase Storage（绕过Vercel限制）
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("portfolio-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setMessage({ type: "error", text: `上传失败: ${uploadError.message}` });
        return;
      }

      // Step 2: 通知服务器创建数据库记录
      const res = await fetch("/api/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_key: uploadData.path,
          original_name: file.name,
          mime_type: file.type,
          byte_size: file.size,
          alt_text: altText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "数据库记录失败" });
        return;
      }

      setMessage({ type: "ok", text: `${file.name} 上传成功` });
      fileInput.value = "";
      window.location.reload();
    } catch (err) {
      setMessage({ type: "error", text: `上传失败: ${(err as Error).message}` });
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
