/**
 * 客户端媒体上传工具函数
 * 使用服务端中转上传，避免COS/Supabase直传的CORS和签名问题
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export type UploadProgress = Record<string, number>;

export type UploadResult = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
};

async function uploadSingleFile(
  file: File,
  onProgress: (filename: string, pct: number) => void,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `「${file.name}」超过 ${MAX_FILE_SIZE / (1024 * 1024)}MB 单文件限制（${(file.size / 1024 / 1024).toFixed(2)}MB）`,
    );
  }

  onProgress(file.name, 0);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("alt_text", file.name);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(file.name, pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) {
            onProgress(file.name, 100);
            resolve({
              id: data.id,
              storage_key: data.storage_key,
              mime_type: data.mime_type || file.type,
              original_name: data.original_name || file.name,
              byte_size: data.byte_size || file.size,
            });
          } else {
            reject(new Error(data.error || "上传失败"));
          }
        } catch {
          reject(new Error("上传响应解析失败"));
        }
      } else {
        let errorMsg = `文件上传失败 (HTTP ${xhr.status})`;
        try {
          const responseText = xhr.responseText;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (parsed.error || parsed.message) {
              errorMsg = `文件上传失败: ${parsed.error || parsed.message}`;
            } else if (responseText.length < 200) {
              errorMsg = `文件上传失败 (HTTP ${xhr.status}): ${responseText}`;
            }
          }
        } catch {
          // ignore
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error("网络连接失败，请检查网络"));

    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  });
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
