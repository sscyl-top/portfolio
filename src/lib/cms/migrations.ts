import { Pool } from "pg";

let heroMigrationPromise: Promise<boolean> | null = null;
let bucketMigrationPromise: Promise<boolean> | null = null;

function getDbConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.PG_DATABASE_URL ??
    null
  );
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
 * 修复portfolio-media bucket的文件大小限制（默认可能只有50MB，设置为100MB以支持视频上传）
 */
export async function runBucketSizeLimitMigration(): Promise<boolean> {
  if (bucketMigrationPromise) return bucketMigrationPromise;

  bucketMigrationPromise = (async () => {
    const connectionString = getDbConnectionString();
    if (!connectionString) {
      console.warn("[DB Migration] No database connection string found for bucket migration");
      return false;
    }

    const pool = new Pool({ connectionString });
    try {
      // 设置文件大小限制为100MB（104857600字节）
      await pool.query(`
        UPDATE storage.buckets
        SET file_size_limit = 104857600
        WHERE id = 'portfolio-media'
          AND (file_size_limit IS NULL OR file_size_limit < 104857600);
      `);
      console.log("[DB Migration] Bucket file size limit updated to 100MB");
      return true;
    } catch (err) {
      console.error("[DB Migration] Failed to update bucket size limit:", err);
      return false;
    } finally {
      await pool.end();
    }
  })();

  return bucketMigrationPromise;
}
