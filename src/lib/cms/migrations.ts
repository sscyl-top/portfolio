import { Pool } from "pg";

let heroMigrationPromise: Promise<boolean> | null = null;
let musicSettingsMigrationPromise: Promise<boolean> | null = null;

function getDbConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.PG_DATABASE_URL ??
    null
  );
}

export async function runMusicSettingsMigration(): Promise<boolean> {
  if (musicSettingsMigrationPromise) return musicSettingsMigrationPromise;

  musicSettingsMigrationPromise = (async () => {
    const connectionString = getDbConnectionString();
    if (!connectionString) {
      console.warn("[DB Migration] No database connection string found for music settings");
      return false;
    }

    const pool = new Pool({ connectionString });
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
      `);
      console.log("[DB Migration] Music settings table ready, categories emoji column ready");
      return true;
    } catch (err) {
      console.error("[DB Migration] Failed to run music settings migration:", err);
      return false;
    } finally {
      await pool.end();
    }
  })();

  return musicSettingsMigrationPromise;
}

export async function runHeroVideosMigration(): Promise<boolean> {
  if (heroMigrationPromise) return heroMigrationPromise;

  heroMigrationPromise = (async () => {
    const connectionString = getDbConnectionString();
    if (!connectionString) {
      console.warn("[DB Migration] No database connection string found in env vars");
      return false;
    }

    const pool = new Pool({ connectionString });
    try {
      await pool.query(`
        ALTER TABLE public.site_settings
          ADD COLUMN IF NOT EXISTS hero_main_video_media_id uuid REFERENCES public.media_assets(id),
          ADD COLUMN IF NOT EXISTS hero_side1_video_media_id uuid REFERENCES public.media_assets(id),
          ADD COLUMN IF NOT EXISTS hero_side2_video_media_id uuid REFERENCES public.media_assets(id),
          ADD COLUMN IF NOT EXISTS hero_side3_video_media_id uuid REFERENCES public.media_assets(id);
      `);
      console.log("[DB Migration] Hero video columns added successfully");
      return true;
    } catch (err) {
      console.error("[DB Migration] Failed to run hero videos migration:", err);
      return false;
    } finally {
      await pool.end();
    }
  })();

  return heroMigrationPromise;
}

/**
 * 修复portfolio-media bucket的文件大小限制
 * 使用多种策略确保限制更新成功：
 * 1. 通过SQL直接更新storage.buckets表
 * 2. 通过Supabase Storage API更新bucket配置
 */
export async function runBucketSizeLimitMigration(): Promise<boolean> {
  let success = false;
  const TEN_GB = 10 * 1024 * 1024 * 1024;

  const connectionString = getDbConnectionString();
  if (connectionString) {
    const pool = new Pool({ connectionString });
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
      await pool.end();
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
