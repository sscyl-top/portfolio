import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDbPool } from "@/lib/cms/migrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const service = createSupabaseServiceClient();

  // 1. 检查 site_settings 表的 schema（通过 information_schema）
  let schemaColumns: string[] = [];
  let schemaError: string | null = null;

  const pool = getDbPool();
  if (pool) {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'site_settings'
        ORDER BY ordinal_position;
      `);
      schemaColumns = result.rows.map((r: { column_name: string; data_type: string; is_nullable: string; column_default: string | null }) => `${r.column_name} (${r.data_type})`);
    } catch (err) {
      schemaError = err instanceof Error ? err.message : String(err);
    } finally {
      await pool.end().catch(() => {});
    }
  } else {
    schemaError = "No database connection string found";
  }

  // 2. 尝试查询 site_settings 的所有数据
  const { data: settingsData, error: settingsError } = await service
    .from("site_settings")
    .select("*")
    .single();

  // 3. 尝试用 baseColumns 查询（和设置页面一样的查询）
  const baseColumns = "name,nickname,default_theme,font_preset,seo_title,seo_description,social_links,logo_media_id,name_media_id,avatar_media_id,share_media_id,cta_card_media_id,cta_figure_media_id,cta_ticker_logo_media_id";
  const { data: baseData, error: baseError } = await service
    .from("site_settings")
    .select(baseColumns)
    .single();

  return NextResponse.json({
    schema: {
      columns: schemaColumns,
      error: schemaError,
      hasPool: Boolean(pool),
    },
    allData: {
      data: settingsData,
      error: settingsError?.message ?? null,
    },
    baseQuery: {
      columns: baseColumns.split(","),
      data: baseData,
      error: baseError?.message ?? null,
    },
  });
}
