import type { SupabaseClient } from "@supabase/supabase-js";

// ── 类型定义 ───────────────────────────────────────────────

/** 快照中需要保留的作品字段（排除 id / created_at / updated_at / deleted_at） */
const WORK_SNAPSHOT_FIELDS = [
  "slug",
  "title",
  "subtitle",
  "summary",
  "year",
  "client",
  "status",
  "private_token_hash",
  "cover_media_id",
  "hover_media_id",
  "share_media_id",
  "palette",
  "is_representative",
  "representative_order",
  "is_composite",
  "composite_order",
  "sort_order",
  "seo_title",
  "seo_description",
  "published_at",
] as const;

export type WorkVersionBlock = {
  id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  payload: Record<string, unknown>;
};

export type WorkVersionSnapshot = {
  work: Record<string, unknown>;
  blocks: WorkVersionBlock[];
  meta?: {
    source: "auto" | "manual";
    label?: string;
    admin_user_id?: string;
  };
};

export type WorkVersionListItem = {
  version_number: number;
  created_at: string;
  label: string | null;
  source: "auto" | "manual";
  is_current: boolean;
  block_count: number;
  title: string;
};

// ── 内部辅助 ───────────────────────────────────────────────

/** 采集当前作品的完整快照 */
async function captureWorkSnapshot(
  client: SupabaseClient,
  workId: string,
): Promise<WorkVersionSnapshot | null> {
  const [{ data: work }, { data: blocks }] = await Promise.all([
    client
      .from("works")
      .select(WORK_SNAPSHOT_FIELDS.join(","))
      .eq("id", workId)
      .is("deleted_at", null)
      .single(),
    client
      .from("work_blocks")
      .select("id,block_type,sort_order,is_visible,payload")
      .eq("work_id", workId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!work) return null;

  return {
    work: work as unknown as Record<string, unknown>,
    blocks: (blocks ?? []) as WorkVersionBlock[],
  };
}

/** 获取当前最大版本号 */
async function getMaxVersionNumber(
  client: SupabaseClient,
  workId: string,
): Promise<number> {
  const { data } = await client
    .from("work_versions")
    .select("version_number")
    .eq("work_id", workId)
    .order("version_number", { ascending: false })
    .limit(1);

  return data && data.length > 0 ? (data[0].version_number as number) : 0;
}

/** 稳定的深层相等判断（用于匹配当前状态与历史快照） */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();

  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (key !== bKeys[i]) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

/** 比较两个快照是否相等（用于定位当前版本） */
function snapshotsEqual(
  a: WorkVersionSnapshot,
  b: WorkVersionSnapshot,
): boolean {
  return deepEqual(a.work, b.work) && deepEqual(a.blocks, b.blocks);
}

export async function writeAuditLog(
  client: SupabaseClient,
  {
    adminUserId,
    action,
    workId,
    versionNumber,
    details,
  }: {
    adminUserId?: string;
    action: string;
    workId: string;
    versionNumber?: number;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await client.from("audit_logs").insert({
    admin_user_id: adminUserId ?? null,
    action,
    entity_type: "work_version",
    entity_id: workId,
    details: {
      work_id: workId,
      version_number: versionNumber,
      ...details,
    },
  });
  if (error) {
    // 审计日志失败不应阻塞主流程，但应在服务端留下痕迹
    console.error("[versions] audit log failed:", error.message);
  }
}

// ── 公开 API ───────────────────────────────────────────────

/**
 * 把当前作品状态归档为新的历史版本。
 * @param adminUserId 操作者 ID，用于审计日志
 * @param label 版本备注（可选）
 * @param source 版本来源，auto=自动归档，manual=手动保存
 *
 * 节流规则：同一作品的自动归档（source="auto"）至少间隔 5 分钟，
 * 避免频繁操作产生大量冗余版本。手动归档不受限制。
 */
export async function archiveWorkVersion(
  client: SupabaseClient,
  workId: string,
  adminUserId?: string,
  label?: string,
  source: "auto" | "manual" = "auto",
): Promise<number | null> {
  // ── 自动归档节流：检查最近一次版本的时间 ──
  if (source === "auto") {
    const { data: lastVersion } = await client
      .from("work_versions")
      .select("created_at, snapshot")
      .eq("work_id", workId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastVersion?.created_at) {
      const lastTime = new Date(lastVersion.created_at).getTime();
      const now = Date.now();
      const MIN_AUTO_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟

      if (now - lastTime < MIN_AUTO_INTERVAL_MS) {
        // 跳过本次自动归档，静默返回
        return null;
      }
    }
  }

  const snapshot = await captureWorkSnapshot(client, workId);
  if (!snapshot) return null;

  const nextVersion = (await getMaxVersionNumber(client, workId)) + 1;
  const versionSnapshot: WorkVersionSnapshot = {
    ...snapshot,
    meta: {
      source,
      label,
      admin_user_id: adminUserId,
    },
  };

  const { error } = await client.from("work_versions").insert({
    work_id: workId,
    version_number: nextVersion,
    snapshot: versionSnapshot,
    label: label ?? null,
  });

  if (error) throw new Error(error.message);

  await writeAuditLog(client, {
    adminUserId,
    action: source === "manual" ? "archive_work_version_manual" : "archive_work_version_auto",
    workId,
    versionNumber: nextVersion,
    details: { label: label ?? null, source },
  });

  return nextVersion;
}

/** 列出作品的所有历史版本，最新在前，并标记当前所处版本 */
export async function listWorkVersions(
  client: SupabaseClient,
  workId: string,
  limit = 50,
): Promise<WorkVersionListItem[]> {
  const [{ data: rows }, currentSnapshot] = await Promise.all([
    client
      .from("work_versions")
      .select("version_number,snapshot,label,created_at")
      .eq("work_id", workId)
      .order("version_number", { ascending: false })
      .limit(limit),
    captureWorkSnapshot(client, workId),
  ]);

  return (rows ?? []).map((row) => {
    const snapshot = (row.snapshot ?? {}) as WorkVersionSnapshot;
    const isCurrent = currentSnapshot
      ? snapshotsEqual(snapshot, currentSnapshot)
      : false;
    const title = String(snapshot.work?.title ?? "(无标题)");

    return {
      version_number: row.version_number as number,
      created_at: row.created_at as string,
      label: (row.label as string | null) ?? null,
      source: snapshot.meta?.source ?? "auto",
      is_current: isCurrent,
      block_count: (snapshot.blocks ?? []).length,
      title,
    };
  });
}

/** 读取某个版本的完整快照 */
export async function getWorkVersionSnapshot(
  client: SupabaseClient,
  workId: string,
  versionNumber: number,
): Promise<WorkVersionSnapshot | null> {
  const { data, error } = await client
    .from("work_versions")
    .select("snapshot")
    .eq("work_id", workId)
    .eq("version_number", versionNumber)
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return (data.snapshot ?? {}) as WorkVersionSnapshot;
}

/**
 * 回滚或前进到指定版本。
 * 流程：
 *   1. 先归档当前状态（生成新的最高版本号，作为后悔药）
 *   2. 用目标快照覆盖作品字段和内容块
 */
export async function rollbackWorkVersion(
  client: SupabaseClient,
  workId: string,
  targetVersionNumber: number,
  adminUserId?: string,
): Promise<{ savedVersion: number; restoredVersion: number }> {
  const targetSnapshot = await getWorkVersionSnapshot(
    client,
    workId,
    targetVersionNumber,
  );
  if (!targetSnapshot) throw new Error("目标版本不存在");

  // 1. 备份当前状态
  const savedVersion = await archiveWorkVersion(
    client,
    workId,
    adminUserId,
    `回滚前自动备份（目标 v${targetVersionNumber}）`,
    "auto",
  );
  if (!savedVersion) throw new Error("无法备份当前作品状态");

  // 2. 覆盖作品字段（保留系统字段）
  const workUpdate = { ...targetSnapshot.work };
  delete workUpdate.id;
  delete workUpdate.created_at;
  delete workUpdate.updated_at;
  delete workUpdate.deleted_at;

  const { error: workError } = await client
    .from("works")
    .update(workUpdate)
    .eq("id", workId);

  if (workError) throw new Error(workError.message);

  // 3. 删除旧内容块并重新插入快照中的块（保留原 ID）
  const { error: deleteError } = await client
    .from("work_blocks")
    .delete()
    .eq("work_id", workId);

  if (deleteError) throw new Error(deleteError.message);

  if (targetSnapshot.blocks.length > 0) {
    const blockRows = targetSnapshot.blocks.map((b) => ({
      id: b.id,
      work_id: workId,
      block_type: b.block_type,
      sort_order: b.sort_order,
      is_visible: b.is_visible,
      payload: b.payload,
    }));

    const { error: insertError } = await client
      .from("work_blocks")
      .insert(blockRows);

    if (insertError) throw new Error(insertError.message);
  }

  await writeAuditLog(client, {
    adminUserId,
    action: "rollback_work_version",
    workId,
    versionNumber: targetVersionNumber,
    details: { saved_version: savedVersion },
  });

  return { savedVersion, restoredVersion: targetVersionNumber };
}
