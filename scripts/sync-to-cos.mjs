import { loadEnvFile, getRequiredEnv } from "./env.mjs";
import COS from "cos-nodejs-sdk-v5";

loadEnvFile(".env.local");
loadEnvFile(".env.production");

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = getRequiredEnv("SUPABASE_SECRET_KEY") || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const cosBucket = getRequiredEnv("COS_BUCKET");
const cosRegion = getRequiredEnv("COS_REGION");
const cosSecretId = getRequiredEnv("COS_SECRET_ID");
const cosSecretKey = getRequiredEnv("COS_SECRET_KEY");

const cos = new COS({ SecretId: cosSecretId, SecretKey: cosSecretKey });
const BUCKET = "portfolio-media";
const PREFIX = "uploads/";

function cosHeadObject(key) {
  return new Promise((resolve) => {
    cos.headObject(
      { Bucket: cosBucket, Region: cosRegion, Key: key },
      (err) => resolve(!err),
    );
  });
}

function cosPutObject(key, body, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: cosBucket,
        Region: cosRegion,
        Key: key,
        Body: body,
        ContentType: contentType || "application/octet-stream",
      },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

async function supabaseList(offset = 0, limit = 100) {
  const url = `${supabaseUrl}/storage/v1/object/list/${BUCKET}?prefix=${encodeURIComponent(PREFIX)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
  return res.json();
}

async function supabaseDownload(key) {
  const url = `${supabaseUrl}/storage/v1/object/authenticated/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${key}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

async function main() {
  console.log("开始同步 Supabase Storage -> COS...");
  let offset = 0;
  let total = 0;
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  while (true) {
    const files = await supabaseList(offset, 100);
    if (!files || files.length === 0) break;

    for (const f of files) {
      if (!f.name) continue;
      total++;
      const key = `${PREFIX}${f.name}`;
      const exists = await cosHeadObject(key);
      if (exists) {
        skipped++;
        continue;
      }
      try {
        process.stdout.write(`  同步: ${key} ...`);
        const { buffer, contentType } = await supabaseDownload(key);
        await cosPutObject(key, buffer, contentType);
        synced++;
        process.stdout.write(" OK\n");
      } catch (err) {
        failed++;
        process.stdout.write(` FAIL: ${err.message}\n`);
      }
    }

    offset += files.length;
    if (files.length < 100) break;
  }

  console.log(`\n完成! 总计: ${total}, 已同步: ${synced}, 已存在: ${skipped}, 失败: ${failed}`);
}

main().catch((err) => {
  console.error("同步失败:", err);
  process.exit(1);
});
