"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { DragDropUpload } from "@/components/admin/DragDropUpload";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [currentFile, setCurrentFile] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = useCallback(async (file: File, altText: string = "") => {
    // Step 1: Request signed upload URL
    const signRes = await fetch("/api/media/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    const signData = await signRes.json();
    if (!signRes.ok) {
      throw new Error(signData.error || "获取上传凭证失败");
    }

    // Step 2: Upload file directly to Supabase Storage
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress((prev) => ({ ...prev, [file.name]: pct }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`文件上传失败 (HTTP ${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error("网络连接失败，请检查网络"));
      xhr.ontimeout = () => reject(new Error("上传超时，请重试"));

      xhr.timeout = 600000; // 10分钟超时
      xhr.open("PUT", signData.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });

    // Step 3: Register media in database
    const regRes = await fetch("/api/media/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_key: signData.storageKey,
        original_name: file.name,
        mime_type: file.type,
        byte_size: file.size,
        alt_text: altText,
      }),
    });

    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(regData.error || "数据库记录保存失败");
    }
  }, []);

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
    const altText = (e.currentTarget.elements.namedItem("alt_text") as HTMLInputElement)?.value?.trim() || "";
    
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFile(file.name);
        setProgress((prev) => ({ ...prev, [file.name]: 0 }));

        await uploadSingleFile(file, altText);
      }

      setMessage({ type: "ok", text: `成功上传 ${files.length} 个文件` });
      fileInput.value = "";
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setUploading(false);
      setCurrentFile("");
    }
  }, [uploadSingleFile]);

  return (
    <div>
      {/* 拖拽上传区域 */}
      <DragDropUpload
        onUpload={async (files) => {
          // 将文件设置到 file input
          const dataTransfer = new DataTransfer();
          files.forEach((file) => dataTransfer.items.add(file));
          if (fileRef.current) {
            fileRef.current.files = dataTransfer.files;
          }
          // 自动提交表单
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

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_1fr_auto]">
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
        <input
          name="alt_text"
          placeholder="替代文本（应用于所有文件）"
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

      {/* 上传进度 */}
      {uploading ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/48">正在上传: {currentFile}</p>
          {Object.entries(progress).map(([filename, pct]) => (
            <div key={filename}>
              <div className="flex justify-between text-xs">
                <span className="truncate">{filename}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-200"
                  style={{ width: `${pct}%` }}
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
