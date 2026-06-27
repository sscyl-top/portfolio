"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Loader2, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  batchDeleteWorks,
  batchUpdateWorkPlacement,
  batchUpdateWorkStatus,
  reorderWorksAction,
} from "@/app/admin/(protected)/works/actions";
import { useConfirm } from "./ui/ConfirmDialog";

type WorkStatus = "draft" | "published" | "private";

interface WorkItem {
  id: string;
  title: string;
  slug: string;
  status: WorkStatus;
  year: string;
  is_representative: boolean;
  is_composite: boolean;
}

interface Props {
  works: WorkItem[];
}

export function WorkBatchManager({ works }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [orderedWorks, setOrderedWorks] = useState(works);
  const { confirm, dialog } = useConfirm();

  // 同步外部 works 变化
  const worksKey = works.map((w) => w.id).join(",");
  const orderedKey = orderedWorks.map((w) => w.id).join(",");
  if (worksKey !== orderedKey) {
    setOrderedWorks(works);
  }

  // dnd-kit 传感器配置
  // PointerSensor：桌面端鼠标拖拽
  // TouchSensor：移动端长按 500ms 触发，避免误触滚动
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const allSelected = orderedWorks.length > 0 && selected.size === orderedWorks.length;
  const selectedArray = Array.from(selected);
  const hasSelection = selectedArray.length > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(orderedWorks.map((w) => w.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const withReset = (action: (formData: FormData) => Promise<void>) => {
    return (formData: FormData) => {
      startTransition(async () => {
        await action(formData);
        setSelected(new Set());
      });
    };
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "删除作品",
      message: `确定删除选中的 ${selectedArray.length} 个作品？此操作不可撤销。`,
      confirmText: "删除",
      danger: true,
    });
    if (!confirmed) return;
    const formData = new FormData();
    selectedArray.forEach((id) => formData.append("work_ids", id));
    startTransition(async () => {
      await batchDeleteWorks(formData);
      setSelected(new Set());
    });
  };

  // ── dnd-kit 拖拽排序 ──────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedWorks((prev) => {
        const oldIndex = prev.findIndex((w) => w.id === active.id);
        const newIndex = prev.findIndex((w) => w.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;

        const next = [...prev];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);

        // 保存新顺序
        const formData = new FormData();
        formData.set("ordered_ids", JSON.stringify(next.map((w) => w.id)));
        startTransition(async () => {
          await reorderWorksAction(formData);
        });

        return next;
      });
    },
    [],
  );

  if (orderedWorks.length === 0) {
    return (
      <div className="mt-6 grid min-h-64 place-items-center border-y border-white/10 text-sm text-white/38">
        暂无 CMS 作品。可以先导入当前作品，或新建一个草稿。
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-cyan"
          />
          全选
        </label>

        <span className="text-sm text-white/40">
          {hasSelection ? `已选 ${selectedArray.length} 项` : "未选择"}
        </span>

        <span className="hidden text-xs text-white/30 sm:inline">
          拖拽 ⠿ 手柄可调整排序（移动端长按）
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <form action={withReset(batchUpdateWorkStatus)} className="contents">
            {selectedArray.map((id) => (
              <input key={id} type="hidden" name="work_ids" value={id} />
            ))}
            <select
              name="status"
              disabled={!hasSelection || isPending}
              className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan disabled:opacity-40"
            >
              <option value="">批量状态</option>
              <option value="draft">设为草稿</option>
              <option value="published">设为已发布</option>
              <option value="private">设为私密</option>
            </select>
            <button
              disabled={!hasSelection || isPending}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-cyan/35 px-3 text-sm text-cyan transition hover:bg-cyan/10 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              应用
            </button>
          </form>

          <form action={withReset(batchUpdateWorkPlacement)} className="contents">
            {selectedArray.map((id) => (
              <input key={`p-${id}`} type="hidden" name="work_ids" value={id} />
            ))}
            <input type="hidden" name="field" value="is_representative" />
            <input type="hidden" name="value" value="true" />
            <button
              disabled={!hasSelection || isPending}
              className="min-h-9 rounded-md border border-white/10 px-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              设为代表作
            </button>
          </form>

          <form action={withReset(batchUpdateWorkPlacement)} className="contents">
            {selectedArray.map((id) => (
              <input key={`c-${id}`} type="hidden" name="work_ids" value={id} />
            ))}
            <input type="hidden" name="field" value="is_composite" />
            <input type="hidden" name="value" value="true" />
            <button
              disabled={!hasSelection || isPending}
              className="min-h-9 rounded-md border border-white/10 px-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              设为复合设计
            </button>
          </form>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!hasSelection || isPending}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-300/20 px-3 text-sm text-red-200 transition hover:bg-red-300/10 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      </div>

      {/* dnd-kit 拖拽排序区域 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedWorks.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-x-auto border-y border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase text-white/36">
                <tr>
                  <th className="py-3 pr-1 font-normal"></th>
                  <th className="py-3 pr-2 font-normal">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-cyan"
                    />
                  </th>
                  <th className="py-3 pr-4 font-normal">Title</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Year</th>
                  <th className="px-4 py-3 font-normal">Placement</th>
                  <th className="py-3 pl-4 font-normal">Public URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {orderedWorks.map((work) => (
                  <SortableRow
                    key={work.id}
                    work={work}
                    isSelected={selected.has(work.id)}
                    onToggle={() => toggleOne(work.id)}
                    isPending={isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
      {dialog}
    </div>
  );
}

/**
 * 可拖拽排序的表格行
 * 使用 dnd-kit 的 useSortable 钩子实现拖拽
 */
function SortableRow({
  work,
  isSelected,
  onToggle,
  isPending,
}: {
  work: WorkItem;
  isSelected: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`align-top transition ${isDragging ? "bg-cyan/[0.04]" : ""}`}
    >
      <td className="py-4 pr-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-white/25 transition hover:text-white/60 active:cursor-grabbing disabled:opacity-30"
          title="拖拽调整排序（移动端长按）"
          disabled={isPending}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="py-4 pr-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-4 w-4 accent-cyan"
        />
      </td>
      <td className="py-4 pr-4">
        <Link
          href={`/admin/works/${work.id}`}
          className="font-medium text-white transition hover:text-cyan"
        >
          {work.title}
        </Link>
        <p className="mt-1 font-mono text-xs text-white/36">
          {work.slug}
        </p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={work.status} />
      </td>
      <td className="px-4 py-4 text-white/56">{work.year || "-"}</td>
      <td className="px-4 py-4 text-white/56">
        {[
          work.is_representative ? "代表作" : null,
          work.is_composite ? "复合设计" : null,
        ]
          .filter(Boolean)
          .join(" / ") || "-"}
      </td>
      <td className="py-4 pl-4">
        {work.status === "published" ? (
          <Link
            href={`/works/${work.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan hover:text-white"
          >
            查看
          </Link>
        ) : (
          <span className="text-white/28">未公开</span>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const label = {
    draft: "草稿",
    published: "已发布",
    private: "私密",
  }[status];

  return (
    <span className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/62">
      {label}
    </span>
  );
}
