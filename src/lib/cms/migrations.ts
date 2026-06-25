import { Pool } from "pg";

let migrationPromise: Promise<boolean> | null = null;

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
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const connectionString = getDbConnectionString();
    if (!connectionString) {
      console.warn("[DB Migration] No database connection string found in env vars (DATABASE_URL/POSTGRES_URL/SUPABASE_DB_URL)");
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

  return migrationPromise;
}
