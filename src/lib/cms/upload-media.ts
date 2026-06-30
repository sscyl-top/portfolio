/**
 * 客户端媒体上传工具函数
 * 使用 R2 预签名 URL 直传，避免 Vercel 函数 4.5MB 请求体限制
 * 流程：sign-upload（拿预签名 URL）→ 浏览器 PUT 直传 R2 → register（写库 + 查重）
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB（R2 单次 PUT 上限）

export type UploadProgress = Record<string, number>;

export type UploadResult = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
};

async function signUpload(
  filename: string,
  contentType: string,
  byteSize: number,
): Promise<{ signedUrl: string; id: string; storageKey: string }> {
  const res = await fetch("/api/media/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, fileSize: byteSize }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`生成上传URL失败 (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.signedUrl) {
    throw new Error(data.error || "生成上传URL失败：响应缺少 signedUrl");
  }
  return {
    signedUrl: data.signedUrl,
    id: data.id,
    storageKey: data.storageKey,
  };
}

async function putToR2(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`R2 直传失败 (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("R2 直传网络失败，请检查网络"));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

async function registerAsset(
  storageKey: string,
  file: File,
): Promise<UploadResult> {
  const res = await fetch("/api/media/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_key: storageKey,
      original_name: file.name,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
      alt_text: file.name,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`注册媒体记录失败 (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "注册媒体记录失败");
  }
  return {
    id: data.id,
    storage_key: data.storage_key || data.storageKey || "",
    mime_type: data.mime_type || file.type || "application/octet-stream",
    original_name: data.original_name || data.name || file.name,
    byte_size: data.byte_size || data.size || file.size,
  };
}

async function uploadSingleFile(
  file: File,
  onProgress: (filename: string, pct: number) => void,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `「${file.name}」超过 ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB 单文件限制（${(file.size / 1024 / 1024).toFixed(2)}MB）`,
    );
  }

  onProgress(file.name, 0);

  // 步骤1：拿预签名 URL
  const { signedUrl, storageKey } = await signUpload(
    file.name,
    file.type || "application/octet-stream",
    file.size,
  );

  // 步骤2：浏览器直传 R2
  await putToR2(signedUrl, file, (pct) => onProgress(file.name, pct));

  // 步骤3：注册到数据库（含查重：命中已存在/软删记录则复活，不重复存储）
  const result = await registerAsset(storageKey, file);

  return result;
}

export async function uploadMediaBlob(
  blob: Blob,
  filename: string,
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const results = await uploadMediaFiles([file], onProgress);
  return results[0];
}

export async function uploadMediaFiles(
  files: File[],
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const progress: UploadProgress = {};

  for (const file of files) {
    try {
      const result = await uploadSingleFile(file, (filename, pct) => {
        progress[filename] = pct;
        onProgress({ ...progress });
      });
      results.push(result);
    } catch (err) {
      progress[file.name] = -1;
      onProgress({ ...progress });
      throw err;
    }
  }

  return results;
}

export function getBlockTypeFromFile(file: File): "media" | "video" | "pdf" | "image_gallery" {
  if (file.type.startsWith("image/")) return "media";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "media";
}
