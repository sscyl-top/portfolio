import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
