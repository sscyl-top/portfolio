import COS from "cos-nodejs-sdk-v5";

export type CosConfig = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  cdnDomain?: string;
};

export function isCosConfigured(): boolean {
  return Boolean(
    process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      process.env.COS_BUCKET &&
      process.env.COS_REGION,
  );
}

export function getCosConfig(): CosConfig {
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error(
      "腾讯云 COS 环境变量未配置（需要 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION）",
    );
  }

  return {
    secretId,
    secretKey,
    bucket,
    region,
    cdnDomain: process.env.COS_CDN_DOMAIN || undefined,
  };
}

let clientInstance: COS | null = null;

export function getCosClient(): COS {
  if (clientInstance) return clientInstance;

  const config = getCosConfig();
  clientInstance = new COS({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
  });
  return clientInstance;
}

export function buildCosPublicUrl(storageKey: string): string {
  const config = getCosConfig();

  if (config.cdnDomain) {
    const domain = config.cdnDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}/${storageKey}`;
  }

  return `https://${config.bucket}.cos.${config.region}.myqcloud.com/${storageKey}`;
}

export type CosSignedUploadResult = {
  signedUrl: string;
  url: string;
  storageKey: string;
  id: string;
};

export async function createCosSignedUploadUrl(
  storageKey: string,
  contentType: string,
): Promise<CosSignedUploadResult> {
  const config = getCosConfig();
  const client = getCosClient();
  const { randomUUID } = await import("node:crypto");
  const id = randomUUID();

  return new Promise((resolve, reject) => {
    client.getObjectUrl(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: storageKey,
        Sign: true,
        Method: "PUT",
        Headers: {
          "Content-Type": contentType || "application/octet-stream",
        },
        Expires: 3600,
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          signedUrl: data.Url,
          url: buildCosPublicUrl(storageKey),
          storageKey,
          id,
        });
      },
    );
  });
}

export async function deleteCosObject(storageKey: string): Promise<void> {
  const config = getCosConfig();
  const client = getCosClient();

  return new Promise((resolve, reject) => {
    client.deleteObject(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: storageKey,
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function uploadCosObject(
  storageKey: string,
  body: Buffer | Blob | File,
  contentType: string,
): Promise<void> {
  const config = getCosConfig();
  const client = getCosClient();

  return new Promise((resolve, reject) => {
    client.putObject(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: storageKey,
        Body: body as never,
        ContentType: contentType || "application/octet-stream",
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}
