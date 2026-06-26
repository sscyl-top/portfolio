"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Eye,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";

import type { WorkVersionListItem } from "@/lib/cms/versions";
import {
  rollbackWorkVersionAction,
  restoreForwardWorkVersionAction,
  deleteWorkVersionsAction,
} from "@/app/admin/(protected)/works/actions";

type Props = {
  workId: string;
  workSlug: string;
  versions: WorkVersionListItem[];
};

export function VersionHistoryPanel({ workId, workSlug, versions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [expandedNumber, setExpandedNumber] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    versionNumber: number;
    direction: "back" | "forward";
  } | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const currentIndex = versions.findIndex((v) => v.is_current);

  const toggleSelect = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionNumber)) {
        next.delete(versionNumber);
      } else {
        next.add(versionNumber);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVersions.size === versions.length) {
      setSelectedVersions(new Set());
    } else {
      setSelectedVersions(new Set(versions.map((v) => v.version_number)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedVersions.size === 0) return;
    const formData = new FormData();
    formData.set("work_id", workId);
    formData.set("work_slug", workSlug);
    formData.set("version_numbers", Array.from(selectedVersions).join(","));
    startTransition(async () => {
      await deleteWorkVersionsAction(formData);
      setSelectedVersions(new Set());
      setConfirmDelete(false);
      router.refresh();
    });
  };

  const handleRollback = (versionNumber: number) => {
    const formData = new FormData();
    formData.set("work_id", workId);
    formData.set("work_slug", workSlug);
    formData.set("version_number", String(versionNumber));
    startTransition(async () => {
      await rollbackWorkVersionAction(formData);
      setConfirmTarget(null);
      router.refresh();
    });
  };

  const handleForward = (versionNumber: number) => {
    const formData = new FormData();
    formData.set("work_id", workId);
    formData.set("work_slug", workSlug);
    formData.set("version_number", String(versionNumber));
    startTransition(async () => {
      await restoreForwardWorkVersionAction(formData);
      setConfirmTarget(null);
      router.refresh();
    });
  };

  return (
    <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035]">
      {/* 折叠头部 */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-white/40 transition-transform duration-200 [&_svg]:size-4">
          {isOpen ? <ChevronDown /> : <ChevronRight />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <History className="h-4 w-4 text-cyan" />
            版本历史
          </h3>
          {!isOpen && (
            <p className="mt-0.5 text-xs text-white/35">
              {versions.length} 个历史版本 · 点击展开查看
            </p>
          )}
          {isOpen && (
            <p className="mt-0.5 text-xs text-white/45">
              每次点击「保存作品」都会自动归档一个版本。可回滚或前进到任意历史版本。
            </p>
          )}
        </div>
      </button>

      {/* 可折叠内容 */}
      {isOpen && (
        <div className="border-t border-white/5 p-5 space-y-4">
          {/* 版本列表 */}
          {versions.length === 0 ? (
            <div className="grid min-h-32 place-items-center text-sm text-white/30">
              暂无历史版本。点击「保存作品」后将自动生成第一个版本。
            </div>
          ) : (
            <VersionList
              versions={versions}
              currentIndex={currentIndex}
              expandedNumber={expandedNumber}
              setExpandedNumber={setExpandedNumber}
              confirmTarget={confirmTarget}
              setConfirmTarget={setConfirmTarget}
              selectedVersions={selectedVersions}
              toggleSelect={toggleSelect}
              toggleSelectAll={toggleSelectAll}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              handleDeleteSelected={handleDeleteSelected}
              handleRollback={handleRollback}
              handleForward={handleForward}
              isPending={isPending}
            />
          )}

          {isPending ? (
            <p className="text-center text-xs text-cyan/60">正在处理…</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

/* ── 版本列表（拆分出来避免主组件过于臃肿） ─────────────────── */

function VersionList({
  versions,
  currentIndex,
  expandedNumber,
  setExpandedNumber,
  confirmTarget,
  setConfirmTarget,
  selectedVersions,
  toggleSelect,
  toggleSelectAll,
  confirmDelete,
  setConfirmDelete,
  handleDeleteSelected,
  handleRollback,
  handleForward,
  isPending,
}: {
  versions: WorkVersionListItem[];
  currentIndex: number;
  expandedNumber: number | null;
  setExpandedNumber: (n: number | null) => void;
  confirmTarget: { versionNumber: number; direction: "back" | "forward" } | null;
  setConfirmTarget: (v: { versionNumber: number; direction: "back" | "forward" } | null) => void;
  selectedVersions: Set<number>;
  toggleSelect: (n: number) => void;
  toggleSelectAll: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (b: boolean) => void;
  handleDeleteSelected: () => void;
  handleRollback: (n: number) => void;
  handleForward: (n: number) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-2">
      {/* 批量操作工具栏 */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70"
        >
          {selectedVersions.size === versions.length ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {selectedVersions.size > 0
            ? `已选 ${selectedVersions.size} / ${versions.length}`
            : `全选（${versions.length}）`}
        </button>

        {selectedVersions.size > 0 ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-200/70">
                删除 {selectedVersions.size} 个版本？
              </span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isPending}
                className="rounded-md bg-red-500/20 px-2.5 py-1 text-xs text-red-200 transition hover:bg-red-500/30 disabled:opacity-30"
              >
                确认
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/50 transition hover:text-white/80"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/25 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
              删除选中
            </button>
          )
        ) : null}
      </div>

      {/* 版本条目 */}
      {versions.map((version, index) => {
        const isCurrent = version.is_current;
        const isExpanded = expandedNumber === version.version_number;
        const isConfirming =
          confirmTarget?.versionNumber === version.version_number;
        const canRollback = !isCurrent && index > currentIndex;
        const canForward = !isCurrent && index < currentIndex;

        return (
          <div
            key={version.version_number}
            className={`rounded-md border transition ${
              isCurrent
                ? "border-cyan/30 bg-cyan/[0.04]"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              {/* 勾选框 */}
              <button
                type="button"
                onClick={() => toggleSelect(version.version_number)}
                className={`transition ${
                  selectedVersions.has(version.version_number)
                    ? "text-cyan"
                    : "text-white/20 hover:text-white/50"
                }`}
                title={
                  selectedVersions.has(version.version_number)
                    ? "取消选择"
                    : "选择此版本"
                }
              >
                {selectedVersions.has(version.version_number) ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {/* 展开/收起 */}
              <button
                type="button"
                onClick={() =>
                  setExpandedNumber(isExpanded ? null : version.version_number)
                }
                className="text-white/30 transition hover:text-white/70"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* 版本号 */}
              <span
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${
                  isCurrent
                    ? "bg-cyan/20 text-cyan"
                    : "bg-white/10 text-white/60"
                }`}
              >
                v{version.version_number}
              </span>

              {/* 标题 + 时间 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white/85">
                    {version.label ?? version.title}
                  </span>
                  {version.source === "manual" ? (
                    <span className="rounded-full border border-cyan/30 px-1.5 py-0.5 text-[9px] font-medium text-cyan">
                      手动
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="rounded-full border border-cyan/30 px-1.5 py-0.5 text-[9px] font-medium text-cyan">
                      当前
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-white/35">
                  {formatDateTime(version.created_at)} · {version.block_count} 个内容块
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                {isConfirming ? (
                  <>
                    <span className="mr-1 text-xs text-red-200/70">
                      确认{confirmTarget.direction === "back" ? "回滚" : "前进"}？
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        confirmTarget.direction === "back"
                          ? handleRollback(version.version_number)
                          : handleForward(version.version_number)
                      }
                      disabled={isPending}
                      className="rounded-md bg-red-500/20 px-2.5 py-1 text-xs text-red-200 transition hover:bg-red-500/30 disabled:opacity-30"
                    >
                      确认
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget(null)}
                      className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/50 transition hover:text-white/80"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNumber(isExpanded ? null : version.version_number)
                      }
                      className="rounded p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/70"
                      title="查看版本详情"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {canRollback ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmTarget({
                            versionNumber: version.version_number,
                            direction: "back",
                          })
                        }
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan/25 px-2.5 py-1 text-xs text-cyan transition hover:bg-cyan/10 disabled:opacity-30"
                        title="回滚到此版本"
                      >
                        <RotateCcw className="h-3 w-3" />
                        回滚
                      </button>
                    ) : null}
                    {canForward ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmTarget({
                            versionNumber: version.version_number,
                            direction: "forward",
                          })
                        }
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan/25 px-2.5 py-1 text-xs text-cyan transition hover:bg-cyan/10 disabled:opacity-30"
                        title="前进到此版本"
                      >
                        <ArrowRight className="h-3 w-3" />
                        前进
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* 展开的详情 */}
            {isExpanded && (
              <div className="border-t border-white/5 px-4 py-3">
                <VersionDetail version={version} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VersionDetail({ version }: { version: WorkVersionListItem }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-md bg-black/20 p-3 text-xs">
        <div className="flex gap-2">
          <span className="w-16 shrink-0 text-white/35">标题</span>
          <span className="text-white/75">{version.title}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-16 shrink-0 text-white/35">来源</span>
          <span className="text-white/65">
            {version.source === "manual" ? "手动保存" : "自动归档"}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
          内容块（{version.block_count}）
        </p>
        <p className="text-xs text-white/25">展开可在列表中查看详情</p>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
