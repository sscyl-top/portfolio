import { Pool } from "pg";

let heroMigrationDone = false;
let ctaTransformMigrationDone = false;
let tickerLogosMigrationDone = false;
let musicSettingsMigrationDone = false;

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
