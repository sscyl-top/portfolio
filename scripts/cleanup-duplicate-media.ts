/**
 * 媒体库去重清理脚本
 *
 * 按 content_hash 合并重复的 media_assets 记录：
 * - 每组保留 created_at 最早的一条
 * - 将 works / site_settings / text_content 中对重复记录的引用更新为保留记录
 * - 软删除多余的重复记录（设置 deleted_at）
 *
 * 用法：npx tsx scripts/cleanup-duplicate-media.ts
 *
 * 注意：此脚本为手动运行，不集成到页面加载流程中。
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

// ---- 环境变量加载（与 scripts/env.mjs 保持一致） ----
function loadEnvFile(fileName = ".env.local"): void {
  const envPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.PG_DATABASE_URL ??
    null
  );
}

// works 表中引用 media_assets 的外键列
const WORKS_MEDIA_COLUMNS = [
  "cover_media_id",
  "hover_media_id",
  "representative_cover_media_id",
  "share_media_id",
] as const;

// site_settings 表中引用 media_assets 的外键列
const SETTINGS_MEDIA_COLUMNS = [
  "logo_media_id",
  "name_media_id",
  "avatar_media_id",
  "share_media_id",
  "cta_card_media_id",
  "cta_figure_media_id",
  "cta_figure_light_media_id",
  "cta_ticker_logo_media_id",
  "cta_center_logo_media_id",
  "hero_main_video_media_id",
  "hero_side1_video_media_id",
  "hero_side2_video_media_id",
  "hero_side3_video_media_id",
] as const;

type DuplicateGroup = {
  content_hash: string;
  ids: string[]; // 按 created_at 升序，ids[0] 为保留记录
};

async function main(): Promise<void> {
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error("[cleanup] 未找到数据库连接字符串（DATABASE_URL / POSTGRES_URL / SUPABASE_DB_URL / PG_DATABASE_URL）");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. 查询所有重复组（content_hash 相同、未删除、count > 1）
    const dupResult = await pool.query<{
      content_hash: string;
      ids: string[];
    }>(`
      SELECT content_hash, array_agg(id ORDER BY created_at ASC) AS ids
      FROM public.media_assets
      WHERE content_hash IS NOT NULL AND deleted_at IS NULL
      GROUP BY content_hash
      HAVING count(*) > 1
    `);

    const groups: DuplicateGroup[] = dupResult.rows.map((r) => ({
      content_hash: r.content_hash,
      ids: r.ids,
    }));

    if (groups.length === 0) {
      console.log("[cleanup] 未发现重复记录，无需清理。");
      return;
    }

    console.log(`[cleanup] 发现 ${groups.length} 组重复，开始合并...`);

    let totalReplaced = 0;
    let totalSoftDeleted = 0;

    for (const group of groups) {
      const keeperId = group.ids[0];
      const duplicateIds = group.ids.slice(1);

      console.log(
        `[cleanup] content_hash=${group.content_hash.slice(0, 12)}... 保留=${keeperId} 删除=${duplicateIds.length} 条`,
      );

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        let replacedCount = 0;

        // 2a. 更新 works 表的外键引用
        for (const col of WORKS_MEDIA_COLUMNS) {
          const res = await client.query(
            `UPDATE public.works SET ${col} = $1
             WHERE ${col} = ANY($2::uuid[]) AND deleted_at IS NULL`,
            [keeperId, duplicateIds],
          );
          replacedCount += res.rowCount ?? 0;
        }

        // 2b. 更新 site_settings 表的外键引用
        for (const col of SETTINGS_MEDIA_COLUMNS) {
          const res = await client.query(
            `UPDATE public.site_settings SET ${col} = $1
             WHERE ${col} = ANY($2::uuid[])`,
            [keeperId, duplicateIds],
          );
          replacedCount += res.rowCount ?? 0;
        }

        // 2c. 更新 text_content 中单值 media_id 后备值
        const textSingleRes = await client.query(
          `UPDATE public.text_content SET content = $1
           WHERE content = ANY($2::text[])
             AND key LIKE '%_media_id'
             AND key != 'cta_ticker_logo_media_ids'
             AND is_active = true
             AND deleted_at IS NULL`,
          [keeperId, duplicateIds],
        );
        replacedCount += textSingleRes.rowCount ?? 0;

        // 2d. 更新 text_content 中 cta_ticker_logo_media_ids（逗号分隔列表）
        const tickerRows = await client.query<{ key: string; content: string }>(
          `SELECT key, content FROM public.text_content
           WHERE key = 'cta_ticker_logo_media_ids'
             AND is_active = true
             AND deleted_at IS NULL`,
        );
        for (const row of tickerRows.rows) {
          const ids = row.content.split(",").map((s) => s.trim()).filter(Boolean);
          let changed = false;
          for (let i = 0; i < ids.length; i++) {
            if (duplicateIds.includes(ids[i])) {
              ids[i] = keeperId;
              changed = true;
            }
          }
          if (changed) {
            // 去重（keeper 可能已在列表中）
            const unique = Array.from(new Set(ids));
            const newContent = unique.join(",");
            await client.query(
              `UPDATE public.text_content SET content = $1
               WHERE key = 'cta_ticker_logo_media_ids' AND content = $2`,
              [newContent, row.content],
            );
            replacedCount += 1;
          }
        }

        // 2e. 软删除重复记录
        const deleteRes = await client.query(
          `UPDATE public.media_assets SET deleted_at = now()
           WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
          [duplicateIds],
        );
        totalSoftDeleted += deleteRes.rowCount ?? 0;
        totalReplaced += replacedCount;

        await client.query("COMMIT");
        console.log(`  └ 引用更新 ${replacedCount} 处，软删除 ${deleteRes.rowCount ?? 0} 条`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`[cleanup] 合并失败 (keeper=${keeperId}):`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`\n[cleanup] 完成！共合并 ${groups.length} 组，更新引用 ${totalReplaced} 处，软删除 ${totalSoftDeleted} 条记录。`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("[cleanup] 脚本执行失败:", err);
  process.exit(1);
});
