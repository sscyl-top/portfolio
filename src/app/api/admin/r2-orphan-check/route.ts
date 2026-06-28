import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TOKEN = process.env.R2_DIAG_TOKEN || "r2diag-onetime-2026";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token !== ALLOWED_TOKEN) {
    return Response.json({ error: "无效token" }, { status: 403 });
  }

  const action = url.searchParams.get("action") ?? "check";

  const service = createSupabaseServiceClient();

  // 获取所有非r2/前缀的记录
  const { data: mediaItems, error: queryError } = await service
    .from("media_assets")
    .select("id,storage_key,mime_type,original_name,byte_size")
    .not("storage_key", "like", "r2/%")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (queryError) {
    return Response.json({ error: `查询失败: ${queryError.message}` }, { status: 500 });
  }

  const items = mediaItems ?? [];

  // 逐个检查文件在Supabase Storage中是否存在
  const checkResults: Array<{
    id: string;
    storage_key: string;
    original_name: string;
    exists: boolean;
    error?: string;
  }> = [];

  for (const item of items) {
    try {
      // 用list方法检查文件是否存在（比download更轻量）
      const { data, error } = await service.storage
        .from("portfolio-media")
        .list(item.storage_key.substring(0, item.storage_key.lastIndexOf("/") || 0), {
          limit: 1000,
          search: item.storage_key.substring(item.storage_key.lastIndexOf("/") + 1),
        });

      if (error) {
        checkResults.push({
          id: item.id,
          storage_key: item.storage_key,
          original_name: item.original_name,
          exists: false,
          error: `list错误: ${error.message}`,
        });
      } else {
        const fileName = item.storage_key.substring(item.storage_key.lastIndexOf("/") + 1);
        const found = (data ?? []).some((f) => f.name === fileName);
        checkResults.push({
          id: item.id,
          storage_key: item.storage_key,
          original_name: item.original_name,
          exists: found,
        });
      }
    } catch (err) {
      checkResults.push({
        id: item.id,
        storage_key: item.storage_key,
        original_name: item.original_name,
        exists: false,
        error: (err as Error).message,
      });
    }
  }

  const existing = checkResults.filter((r) => r.exists);
  const missing = checkResults.filter((r) => !r.exists);

  if (action === "check") {
    return Response.json({
      total: items.length,
      existsCount: existing.length,
      missingCount: missing.length,
      missing: missing.map((m) => ({
        id: m.id,
        storage_key: m.storage_key,
        original_name: m.original_name,
        error: m.error,
      })),
      existing: existing.map((e) => ({
        id: e.id,
        storage_key: e.storage_key,
        original_name: e.original_name,
      })),
    });
  }

  if (action === "delete-missing") {
    // 删除数据库中不存在于Supabase Storage的孤立记录
    const missingIds = missing.map((m) => m.id);
    if (missingIds.length === 0) {
      return Response.json({ message: "没有孤立记录需要删除", deleted: 0 });
    }

    const { error: deleteError, count: deletedCount } = await service
      .from("media_assets")
      .delete({ count: "exact" })
      .in("id", missingIds);

    if (deleteError) {
      return Response.json({ error: `删除失败: ${deleteError.message}` }, { status: 500 });
    }

    return Response.json({
      message: `已删除 ${deletedCount ?? 0} 条孤立记录`,
      deleted: deletedCount ?? 0,
      deletedIds: missingIds,
    });
  }

  if (action === "mark-missing") {
    // 把孤立记录的storage_key改成r2/前缀（不实际上传文件）
    // 这样URL逻辑统一，虽然文件仍然404
    const updated: Array<{ id: string; oldKey: string; newKey: string }> = [];
    let updateCount = 0;
    let updateFail = 0;

    for (const m of missing) {
      const newKey = `r2/${m.storage_key}`;
      const { error: updateError } = await service
        .from("media_assets")
        .update({ storage_key: newKey })
        .eq("id", m.id);

      if (updateError) {
        updateFail++;
      } else {
        updated.push({ id: m.id, oldKey: m.storage_key, newKey });
        updateCount++;
      }
    }

    return Response.json({
      message: `已标记 ${updateCount} 条孤立记录为r2/前缀`,
      updated: updateCount,
      failed: updateFail,
      updatedItems: updated,
    });
  }

  return Response.json({ error: "未知操作" }, { status: 400 });
}
