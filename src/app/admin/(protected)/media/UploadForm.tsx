"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
      // Step 1: Upload directly to Supabase Storage (bypasses Vercel body limit)
      const supabase = createSupabaseBrowserClient();
      const id = crypto.randomUUID();
      const storageKey = buildStorageKey(file.name, id);
      const mimeType = file.type || "application/octet-stream";

      const { error: uploadError } = await supabase.storage
        .from("portfolio-media")
        .upload(storageKey, file, { contentType: mimeType, upsert: false });

      if (uploadError) {
        setMessage({ type: "error", text: `文件上传失败：${uploadError.message}` });
        return;
      }

      // Step 2: Detect image dimensions locally
      let width: number | null = null;
      let height: number | null = null;
      if (mimeType.startsWith("image/")) {
        try {
          const buffer = await file.arrayBuffer();
          const head = Buffer.from(new Uint8Array(buffer, 0, Math.min(2048, buffer.byteLength)));
          const dims = detectImageDimensions(mimeType, head);
          if (dims) {
            width = dims.width;
            height = dims.height;
          }
        } catch {
          // dimension detection is best-effort
        }
      }

      // Step 3: Register metadata in database via lightweight API call
      const res = await fetch("/api/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_key: storageKey,
          mime_type: mimeType,
          original_name: file.name,
          byte_size: file.size,
          width,
          height,
          alt_text: altText,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Rollback: remove the already-uploaded storage file
        await supabase.storage.from("portfolio-media").remove([storageKey]);
        setMessage({ type: "error", text: data.error || "数据库保存失败" });
        return;
      }

      setMessage({ type: "ok", text: `${file.name} 上传成功` });
      fileInput.value = "";
      window.location.reload();
    } catch (err) {
      setMessage({ type: "error", text: `上传失败：${(err as Error).message}` });
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
