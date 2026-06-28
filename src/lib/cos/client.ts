import COS from "cos-nodejs-sdk-v5";
import { getCosConfig } from "./config";

export type { CosConfig } from "./config";
export { isCosConfigured, getCosConfig, buildCosPublicUrl } from "./config";

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
          url: `https://${config.bucket}.cos.${config.region}.myqcloud.com/${storageKey}`,
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
