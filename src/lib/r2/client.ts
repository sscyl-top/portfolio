import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config, getR2Endpoint } from "./config";

export type { R2Config } from "./config";
export { isR2Configured, getR2Config, buildR2PublicUrl, getR2Endpoint } from "./config";

let clientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (clientInstance) return clientInstance;

  const config = getR2Config();
  clientInstance = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return clientInstance;
}

export async function uploadR2Object(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
}

export async function deleteR2Object(storageKey: string): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    }),
  );
}

export type R2SignedUploadResult = {
  signedUrl: string;
  storageKey: string;
  id: string;
};

/**
 * 生成 R2 预签名上传 URL，让浏览器直接 PUT 到 R2，
 * 避免文件经过 Vercel 函数导致带宽消耗。
 */
export async function createR2SignedUploadUrl(
  storageKey: string,
  contentType: string,
): Promise<R2SignedUploadResult> {
  const config = getR2Config();
  const client = getR2Client();
  const { randomUUID } = await import("node:crypto");
  const id = randomUUID();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ContentType: contentType || "application/octet-stream",
  });

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });

  return {
    signedUrl,
    storageKey,
    id,
  };
}

export type R2ObjectResult = {
  body: Uint8Array | Buffer;
  contentType: string;
  contentLength: number;
  etag?: string;
};

export async function getR2Object(storageKey: string): Promise<R2ObjectResult | null> {
  const config = getR2Config();
  const client = getR2Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      }),
    );

    if (!response.Body) return null;

    // R2 SDK body is a stream; convert to Buffer
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - SDK body has async iterator
    for await (const chunk of response.Body) {
      chunks.push(chunk as Uint8Array);
    }
    const body = Buffer.concat(chunks);

    return {
      body,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength || body.length,
      etag: response.ETag,
    };
  } catch (err) {
    const msg = (err as Error).message || "";
    // Key not found is a soft error
    if (msg.includes("NoSuchKey") || msg.includes("404")) return null;
    throw err;
  }
}
