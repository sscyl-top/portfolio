import { Pool } from "pg";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

let heroMigrationDone = false;
let ctaTransformMigrationDone = false;
let tickerLogosMigrationDone = false;
let centerLogoMigrationDone = false;
let musicSettingsMigrationDone = false;
let workTablesMigrationDone = false;
let mediaBackendMigrationDone = false;
let representativeCoverMigrationDone = false;
let nameMediaMigrationDone = false;
let ctaFigureLightMigrationDone = false;
let ctaFigureLightTransformMigrationDone = false;
let mediaContentHashMigrationDone = false;

function getDbConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.PG_DATABASE_URL ??
    null
  );
}

function createPool(): Pool | null {
  const connectionString = getDbConnectionString();
  if (!connectionString) return null;
  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

export function getDbPool(): Pool | null {
  return createPool();
}

/**
 * 通过 Supabase service role client 调用 exec_ddl RPC 函数执行 DDL。
 * 这是 DATABASE_URL 不可用时的 fallback 方案。
 *
 * 前置条件：需要在数据库中先创建 exec_ddl 函数（见 SQL 脚本）：
 *   CREATE OR REPLACE FUNCTION public.exec_ddl(sql text) RETURNS void
 *   LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN EXECUTE sql; END; $$;
 *   REVOKE EXECUTE ON FUNCTION public.exec_ddl(text) FROM PUBLIC, anon, authenticated;
 *   GRANT EXECUTE ON FUNCTION public.exec_ddl(text) TO service_role;
 *
 * 如果 exec_ddl 函数不存在，RPC 调用会失败，返回 false，调用方应静默忽略。
 */
async function runDdlViaRpc(sql: string): Promise<boolean> {
  try {
    const client = createSupabaseServiceClient();
    const { error } = await client.rpc("exec_ddl", { sql });
    if (error) {
      console.warn("[DB Migration] runDdlViaRpc failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[DB Migration] runDdlViaRpc exception:", err);
    return false;
  }
}

/**
 * 通用 DDL 执行入口：优先使用 pg Pool（DATABASE_URL），不可用时 fallback 到 service role RPC。
 * 成功后发送 NOTIFY pgrst, 'reload schema' 让 PostgREST 刷新 schema cache。
 */
async function runDdl(ddlSql: string, notifyKey = "pgrst"): Promise<boolean> {
  const fullSql = notifyKey
    ? `${ddlSql}\nNOTIFY ${notifyKey}, 'reload schema';`
    : ddlSql;

  const pool = createPool();
  if (pool) {
    try {
      await pool.query(fullSql);
      return true;
    } catch (err) {
      console.error("[DB Migration] pool.query failed:", err);
      return false;
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // fallback: 通过 service role client 调用 exec_ddl RPC
  const rpcOk = await runDdlViaRpc(ddlSql);
  if (rpcOk && notifyKey) {
    // NOTIFY 通过 RPC 也能生效，但 PostgREST schema cache 可能需要单独刷新
    // 再次调用一次空 NOTIFY 来确保刷新
    await runDdlViaRpc(`NOTIFY ${notifyKey}, 'reload schema'`).catch(() => {});
  }
  return rpcOk;
}

export async function runMusicSettingsMigration(): Promise<boolean> {
  if (musicSettingsMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found for music settings");
    return false;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.music_settings (
        id boolean PRIMARY KEY DEFAULT true,
        hide_frontend boolean NOT NULL DEFAULT false,
        hide_backend boolean NOT NULL DEFAULT false,
        tip_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
        playing_label text NOT NULL DEFAULT '正在播放',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT music_settings_single_row CHECK (id = true)
      );

      INSERT INTO public.music_settings (id, hide_frontend, hide_backend, tip_messages, playing_label)
      VALUES (true, false, false, '[]'::jsonb, '正在播放')
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE public.music_categories ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '🎵';
      UPDATE public.music_categories SET emoji = '🌿' WHERE key = 'relax' AND emoji = '🎵';
      UPDATE public.music_categories SET emoji = '🔥' WHERE key = 'energetic' AND emoji = '🎵';
      UPDATE public.music_categories SET emoji = '🌊' WHERE key = 'summer' AND emoji = '🎵';
      UPDATE public.music_categories SET emoji = '😎' WHERE key = 'badass' AND emoji = '🎵';

      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] Music settings table ready, categories emoji column ready, schema reloaded");
    musicSettingsMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run music settings migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runHeroVideosMigration(): Promise<boolean> {
  if (heroMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found in env vars");
    return false;
  }

  try {
    await pool.query(`
      ALTER TABLE public.site_settings
        ADD COLUMN IF NOT EXISTS hero_main_video_media_id uuid REFERENCES public.media_assets(id),
        ADD COLUMN IF NOT EXISTS hero_side1_video_media_id uuid REFERENCES public.media_assets(id),
        ADD COLUMN IF NOT EXISTS hero_side2_video_media_id uuid REFERENCES public.media_assets(id),
        ADD COLUMN IF NOT EXISTS hero_side3_video_media_id uuid REFERENCES public.media_assets(id);
      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] Hero video columns added successfully");
    heroMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run hero videos migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runCtaTransformMigration(): Promise<boolean> {
  if (ctaTransformMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found for CTA transform settings");
    return false;
  }

  try {
    await pool.query(`
      ALTER TABLE public.site_settings
        ADD COLUMN IF NOT EXISTS cta_card_scale numeric NOT NULL DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS cta_card_offset_x numeric NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cta_card_offset_y numeric NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cta_figure_scale numeric NOT NULL DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS cta_figure_offset_x numeric NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cta_figure_offset_y numeric NOT NULL DEFAULT 0;
      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] CTA transform columns added successfully");
    ctaTransformMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run CTA transform migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runTickerLogosMigration(): Promise<boolean> {
  if (tickerLogosMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found for ticker logos");
    return false;
  }

  try {
    await pool.query(`
      ALTER TABLE public.site_settings
        ADD COLUMN IF NOT EXISTS cta_ticker_logo_media_ids text NOT NULL DEFAULT '';
      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] Ticker logo media IDs column added successfully");
    tickerLogosMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run ticker logos migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runCenterLogoMigration(): Promise<boolean> {
  if (centerLogoMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS cta_center_logo_media_id uuid REFERENCES public.media_assets(id);
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] Center logo media ID column added successfully");
    centerLogoMigrationDone = true;
  } else {
    console.warn("[DB Migration] center logo migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}

export async function runBucketSizeLimitMigration(): Promise<boolean> {
  let success = false;
  const TEN_GB = 10 * 1024 * 1024 * 1024;

  const pool = createPool();
  if (pool) {
    try {
      await pool.query(`
        UPDATE storage.buckets
        SET file_size_limit = ${TEN_GB}
        WHERE id = 'portfolio-media'
          AND (file_size_limit IS NULL OR file_size_limit < ${TEN_GB});
      `);
      console.log("[DB Migration] Bucket file size limit updated to 10GB via SQL");
      success = true;
    } catch (err) {
      console.error("[DB Migration] SQL bucket size update failed:", err);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  if (!success) {
    try {
      const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
      const service = createSupabaseServiceClient();
      const { error } = await service.storage.updateBucket("portfolio-media", {
        public: true,
        fileSizeLimit: TEN_GB,
      });
      if (error) {
        console.error("[DB Migration] Storage API bucket update failed:", error);
      } else {
        console.log("[DB Migration] Bucket file size limit updated to 10GB via Storage API");
        success = true;
      }
    } catch (err) {
      console.error("[DB Migration] Storage API bucket update error:", err);
    }
  }

  return success;
}

export async function runWorkTablesMigration(): Promise<boolean> {
  if (workTablesMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found for work tables");
    return false;
  }

  try {
    await pool.query(`
      ALTER TABLE public.works
        ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT '';

      CREATE TABLE IF NOT EXISTS public.work_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
        version_number integer NOT NULL,
        snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        label text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(work_id, version_number)
      );

      CREATE INDEX IF NOT EXISTS idx_work_versions_work_id ON public.work_versions(work_id);
      CREATE INDEX IF NOT EXISTS idx_work_versions_version_number ON public.work_versions(work_id, version_number DESC);

      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id uuid,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        details jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] Work tables (subtitle, work_versions, audit_logs) ready");
    workTablesMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run work tables migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runMediaBackendMigration(): Promise<boolean> {
  if (mediaBackendMigrationDone) return true;

  const pool = createPool();
  if (!pool) {
    console.warn("[DB Migration] No database connection string found for media backend");
    return false;
  }

  try {
    await pool.query(`
      ALTER TABLE public.media_assets
        ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'supabase';

      NOTIFY pgrst, 'reload schema';
    `);
    console.log("[DB Migration] media_assets.storage_backend column added successfully");
    mediaBackendMigrationDone = true;
    return true;
  } catch (err) {
    console.error("[DB Migration] Failed to run media backend migration:", err);
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function runRepresentativeCoverMigration(): Promise<boolean> {
  if (representativeCoverMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.works
      ADD COLUMN IF NOT EXISTS representative_cover_media_id uuid REFERENCES public.media_assets(id);
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] works.representative_cover_media_id column added successfully");
    representativeCoverMigrationDone = true;
  } else {
    console.warn("[DB Migration] representative cover migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}

export async function runNameMediaMigration(): Promise<boolean> {
  if (nameMediaMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS name_media_id uuid REFERENCES public.media_assets(id);
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] site_settings.name_media_id column added successfully");
    nameMediaMigrationDone = true;
  } else {
    console.warn("[DB Migration] name media migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}

export async function runCtaFigureLightMigration(): Promise<boolean> {
  if (ctaFigureLightMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS cta_figure_light_media_id uuid REFERENCES public.media_assets(id);
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] site_settings.cta_figure_light_media_id column added successfully");
    ctaFigureLightMigrationDone = true;
  } else {
    console.warn("[DB Migration] cta figure light migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}

export async function runCtaFigureLightTransformMigration(): Promise<boolean> {
  if (ctaFigureLightTransformMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS cta_figure_light_scale numeric NOT NULL DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS cta_figure_light_offset_x numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cta_figure_light_offset_y numeric NOT NULL DEFAULT 0;
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] site_settings.cta_figure_light transform columns added successfully");
    ctaFigureLightTransformMigrationDone = true;
  } else {
    console.warn("[DB Migration] cta figure light transform migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}

/**
 * 为 media_assets 表添加 content_hash 列并建立索引，用于媒体库去重。
 * content_hash 为文件内容 SHA-256 哈希，允许为空（旧数据无哈希）。
 */
export async function runMediaContentHashMigration(): Promise<boolean> {
  if (mediaContentHashMigrationDone) return true;

  const ddlSql = `
    ALTER TABLE public.media_assets
      ADD COLUMN IF NOT EXISTS content_hash text;

    CREATE INDEX IF NOT EXISTS media_assets_content_hash_idx
      ON public.media_assets(content_hash)
      WHERE content_hash IS NOT NULL AND deleted_at IS NULL;
  `;

  const ok = await runDdl(ddlSql);
  if (ok) {
    console.log("[DB Migration] media_assets.content_hash column and index added successfully");
    mediaContentHashMigrationDone = true;
  } else {
    console.warn("[DB Migration] media content hash migration could not run (need DATABASE_URL or exec_ddl RPC)");
  }
  return ok;
}
