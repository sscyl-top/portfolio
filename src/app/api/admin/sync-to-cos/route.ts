import { NextResponse } from "next/server";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isCosConfigured, getCosConfig } from "@/lib/cos/config";
import { getCosClient } from "@/lib/cos/client";

export const runtime = "nodejs";

const BUCKET = "portfolio-media";

async function listAllKeys(
  service: ReturnType<typeof createSupabaseServiceClient>,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await service.storage
      .from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`Supabase list error at "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (!item.name) continue;
      const fullKey = prefix ? `${prefix}${item.name}` : item.name;
      if (item.id) {
        keys.push(fullKey);
      } else {
        const subKeys = await listAllKeys(service, `${fullKey}/`);
        keys.push(...subKeys);
      }
    }

    if (data.length < limit) break;
    offset += data.length;
  }

  return keys;
}

async function fileExistsOnCos(key: string): Promise<boolean> {
  const cos = getCosClient();
  const config = getCosConfig();
  return new Promise((resolve) => {
    cos.headObject(
      { Bucket: config.bucket, Region: config.region, Key: key },
      (err) => resolve(!err),
    );
  });
}

async function uploadToCos(key: string, body: Buffer, contentType: string): Promise<void> {
  const cos = getCosClient();
  const config = getCosConfig();
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: key,
        Body: body as never,
        ContentType: contentType || "application/octet-stream",
      },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  if (!isCosConfigured()) {
    return NextResponse.json({ error: "COS 未配置" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  try {
    const keys = await listAllKeys(service, "uploads/");
    const results = { total: keys.length, synced: 0, skipped: 0, failed: 0, errors: [] as { key: string; error: string }[] };

    for (const key of keys) {
      const exists = await fileExistsOnCos(key);
      if (exists) {
        results.skipped++;
        continue;
      }
      try {
        const { data: fileData, error: dlErr } = await service.storage
          .from(BUCKET)
          .download(key);
        if (dlErr || !fileData) {
          throw new Error(dlErr?.message || "download failed");
        }
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = fileData.type || "application/octet-stream";
        await uploadToCos(key, buffer, contentType);
        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push({ key, error: (err as Error).message });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: `同步失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
