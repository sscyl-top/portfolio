"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setProgress(0);
    setPhase("");

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
      // ===== Step 1: 向服务器请求签名上传URL =====
      setPhase("正在获取上传凭证...");

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

      // ===== Step 2: 浏览器直接 PUT 文件到 Supabase Storage =====
      setPhase("正在上传文件...");
      setProgress(0);

      await new Promise<void>((resolve, reject) => {
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

      // ===== Step 3: 通知服务器保存数据库记录 =====
      setPhase("正在保存记录...");

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

      setMessage({ type: "ok", text: `${file.name} 上传成功` });
      fileInput.value = "";
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setUploading(false);
      setPhase("");
      setProgress(0);
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

      {uploading ? (
        <div className="mt-3 space-y-2">
          {phase ? (
            <p className="text-xs text-white/48">{phase}</p>
          ) : null}
          {progress > 0 ? (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/40">{progress}%</p>
            </div>
          ) : null}
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
