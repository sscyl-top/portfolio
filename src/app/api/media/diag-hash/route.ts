import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDbPool } from "@/lib/cms/migrations";

export const runtime = "nodejs";

// 临时诊断路由：检查 content_hash 列是否存在，并尝试创建
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const result: Record<string, unknown> = {};

  // 1. 检查 DATABASE_URL 是否可用
  const dbUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.SUPABASE_DB_URL ?? process.env.PG_DATABASE_URL;
  result.hasDbUrl = !!dbUrl;
  result.dbUrlPrefix = dbUrl ? dbUrl.slice(0, 30) + "..." : null;

  // 2. 检查 content_hash 列是否存在（通过 information_schema）
  try {
    const { data: columns, error: colError } = await service
      .from("information_schema.columns")
      .select("column_name,data_type")
      .eq("table_schema", "public")
      .eq("table_name", "media_assets");
    if (colError) {
      result.columnCheckError = colError.message;
    } else {
      result.allColumns = (columns as Array<{ column_name: string }>).map(c => c.column_name);
      result.hasContentHashColumn = (columns as Array<{ column_name: string }>).some(c => c.column_name === "content_hash");
    }
  } catch (e) {
    result.columnCheckException = String(e);
  }

  // 3. 尝试用 pg pool 创建 content_hash 列
  const pool = getDbPool();
  if (pool) {
    try {
      await pool.query(`
        ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS content_hash text;
        CREATE INDEX IF NOT EXISTS media_assets_content_hash_idx
          ON public.media_assets(content_hash)
          WHERE content_hash IS NOT NULL AND deleted_at IS NULL;
        NOTIFY pgrst, 'reload schema';
      `);
      result.poolMigrationOk = true;
    } catch (e) {
      result.poolMigrationError = String(e);
    } finally {
      await pool.end().catch(() => {});
    }
  } else {
    result.poolMigrationOk = false;
    result.poolMigrationError = "no DATABASE_URL";
  }

  // 4. 尝试用 exec_ddl RPC 创建
  try {
    const { error: rpcError } = await service.rpc("exec_ddl", {
      sql: "ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS content_hash text;",
    });
    if (rpcError) {
      result.rpcMigrationError = rpcError.message;
      result.rpcMigrationOk = false;
    } else {
      result.rpcMigrationOk = true;
    }
  } catch (e) {
    result.rpcMigrationException = String(e);
    result.rpcMigrationOk = false;
  }

  return Response.json(result);
}

