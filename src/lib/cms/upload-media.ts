/**
 * 客户端媒体上传工具函数
 * 复用 MediaPicker 的上传逻辑，供 VisualBlockEditor 使用
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export type UploadProgress = Record<string, number>;

export type UploadResult = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
};

/**
 * 上传单个文件到 Supabase Storage 并注册到数据库
 */
async function uploadSingleFile(
  file: File,
  onProgress: (filename: string, pct: number) => void,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `「${file.name}」超过 10GB 单文件限制（${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB）`,
    );
  }

  onProgress(file.name, 0);

  // Step 1: 请求签名上传 URL
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

  onProgress(file.name, 50);

  // Step 2: 直接上传到 Supabase Storage
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = 50 + Math.round((event.loaded / event.total) * 50);
        onProgress(file.name, pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let errorMsg = `文件上传失败 (HTTP ${xhr.status})`;
        try {
          const responseText = xhr.responseText;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (parsed.message || parsed.error) {
              errorMsg = `文件上传失败: ${parsed.message || parsed.error}`;
            } else if (responseText.length < 200) {
              errorMsg = `文件上传失败 (HTTP ${xhr.status}): ${responseText}`;
            }
          }
        } catch {
          // 响应不是JSON，忽略
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error("网络连接失败，请检查网络"));

    xhr.open("PUT", signData.signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });

  onProgress(file.name, 100);

  // Step 3: 注册到数据库
  const regRes = await fetch("/api/media/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_key: signData.storageKey,
      original_name: file.name,
      mime_type: file.type,
      byte_size: file.size,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok) {
    throw new Error(regData.error || "数据库记录保存失败");
  }

  return {
    id: regData.id as string,
    storage_key: signData.storageKey as string,
    mime_type: file.type,
    original_name: file.name,
    byte_size: file.size,
  };
}

/**
 * 上传 Blob 到 Supabase Storage 并注册到数据库
 * 适用于裁剪后的图片等场景
 */
export async function uploadMediaBlob(
  blob: Blob,
  filename: string,
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  // 将 Blob 转换为 File
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const results = await uploadMediaFiles([file], onProgress);
  return results[0];
}

/**
 * 批量上传文件
 * @returns 上传成功的文件信息数组
 */
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
      progress[file.name] = -1; // 标记失败
      onProgress({ ...progress });
      throw err;
    }
  }

  return results;
}

/**
 * 根据 MIME 类型判断应创建的块类型
 */
export function getBlockTypeFromFile(file: File): "media" | "video" | "pdf" | "image_gallery" {
  if (file.type.startsWith("image/")) return "media";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "media";
}
