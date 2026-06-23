"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Image as ImageIcon,
  Video,
  FileText,
  Type,
  Columns2,
  X,
  Plus,
  UploadCloud,
  Trash2,
  Pencil,
  GripHorizontal,
} from "lucide-react";
import {
  reorderWorkBlocks,
  createBlockDirect,
  deleteBlockDirect,
} from "@/app/admin/(protected)/works/actions";
import { uploadMediaFiles, type UploadResult } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

// ── 类型定义 ───────────────────────────────────────────────

export type VisualBlock = {
  id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  payload: Record<string, unknown>;
};

type Props = {
  workId: string;
  workSlug: string;
  initialBlocks: VisualBlock[];
  mediaAssets: {
    id: string;
    storage_key: string;
    mime_type: string;
    original_name: string;
    alt_text: string;
  }[];
};

// ── 块类型配置 ─────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: "text", label: "文本", icon: Type, color: "text-blue-400" },
  { type: "media", label: "单图", icon: ImageIcon, color: "text-green-400" },
  { type: "gallery", label: "图库", icon: Columns2, color: "text-purple-400" },
  { type: "video", label: "视频", icon: Video, color: "text-red-400" },
  { type: "pdf", label: "PDF", icon: FileText, color: "text-orange-400" },
  { type: "before_after", label: "对比", icon: Columns2, color: "text-yellow-400" },
] as const;

// ── 主组件 ─────────────────────────────────────────────────

export function VisualBlockEditor({ workId, workSlug, initialBlocks, mediaAssets }: Props) {
  const [blocks, setBlocks] = useState<VisualBlock[]>(
    () => [...initialBlocks].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showAddMenuAt, setShowAddMenuAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 同步初始数据
  useEffect(() => {
    setBlocks([...initialBlocks].sort((a, b) => a.sort_order - b.sort_order));
  }, [initialBlocks]);

  // ── 拖拽排序 ───────────────────────────────────────────

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, moved);
      setBlocks(newBlocks);

      // 持久化
      startTransition(() => {
        void reorderWorkBlocks(
          workId,
          workSlug,
          newBlocks.map((b) => b.id),
        );
      });
    },
    [blocks, workId, workSlug, startTransition],
  );

  // ── 文件拖拽上传（插入到指定位置）─────────────────────────

  const determineBlockType = (file: File): "media" | "video" | "pdf" => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "pdf";
    return "media";
  };

  const handleFilesDrop = useCallback(
    async (files: File[], insertAt: number) => {
      setUploading(true);
      try {
        const results = await uploadMediaFiles(files, (progress) => {
          setUploadProgress(progress);
        });

        // 为每个上传的文件创建对应的块
        const newBlocks: VisualBlock[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const file = files[i];
          const blockType = determineBlockType(file);

          let payload: Record<string, unknown> = {};
          if (blockType === "media" || blockType === "video" || blockType === "pdf") {
            payload = { media_id: result.id, caption: "" };
          }

          const created = await createBlockDirect(
            workId,
            workSlug,
            blockType,
            payload,
            insertAt + i,
          );

          newBlocks.push({
            id: created.id,
            block_type: blockType,
            sort_order: insertAt + i,
            is_visible: true,
            payload,
          });
        }

        // 乐观更新本地状态
        setBlocks((prev) => {
          const updated = [...prev];
          // 调整后续块的 sort_order
          updated.forEach((b) => {
            if (b.sort_order >= insertAt) b.sort_order += results.length;
          });
          return [...updated, ...newBlocks].sort((a, b) => a.sort_order - b.sort_order);
        });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router],
  );

  // ── 全局拖拽事件 ─────────────────────────────────────────

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingFile(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget || !(e.relatedTarget as Node)?.contains?.(e.target as Node)) {
        setIsDraggingFile(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      setIsDraggingFile(false);
      setDragOverIndex(null);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  // ── 计算拖拽插入位置 ─────────────────────────────────────

  const calculateInsertIndex = useCallback((clientY: number): number => {
    if (!containerRef.current) return blocks.length;
    const children = containerRef.current.querySelectorAll("[data-block-index]");
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return blocks.length;
  }, [blocks.length]);

  const onDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes("Files")) {
        setDragOverIndex(index);
      }
    },
    [],
  );

  const onDropAt = useCallback(
    async (e: React.DragEvent, insertAt: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      await handleFilesDrop(files, insertAt);
    },
    [handleFilesDrop],
  );

  // ── 文件选择上传 ─────────────────────────────────────────

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, insertAt: number) => {
    const files = e.target.files;
    if (!files) return;
    await handleFilesDrop(Array.from(files), insertAt);
    e.target.value = "";
  };

  // ── 删除块 ───────────────────────────────────────────────

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      try {
        await deleteBlockDirect(blockId, workId, workSlug);
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        router.refresh();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [workId, workSlug, router],
  );

  // ── 添加空内容块（文本）───────────────────────────────────

  const handleAddTextBlock = useCallback(
    async (insertAt: number) => {
      try {
        const created = await createBlockDirect(
          workId,
          workSlug,
          "text",
          { heading: "标题", body: "正文内容" },
          insertAt,
        );
        setBlocks((prev) => {
          const updated = [...prev];
          updated.forEach((b) => {
            if (b.sort_order >= insertAt) b.sort_order += 1;
          });
          return [...updated, {
            id: created.id,
            block_type: "text",
            sort_order: insertAt,
            is_visible: true,
            payload: { heading: "标题", body: "正文内容" },
          }].sort((a, b) => a.sort_order - b.sort_order);
        });
        router.refresh();
      } catch (err) {
        console.error("Add block failed:", err);
      }
    },
    [workId, workSlug, router],
  );

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <section className="mt-6" ref={containerRef}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">内容编辑</h3>
          <p className="mt-1 text-sm text-white/45">
            拖拽文件到页面中任意位置即可插入；支持多文件批量上传
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddMenuAt(blocks.length)}
          className="flex items-center gap-2 rounded-md border border-cyan/35 px-4 py-2 text-sm text-cyan transition hover:bg-cyan/10"
        >
          <Plus className="h-4 w-4" />
          添加内容块
        </button>
      </div>

      {/* 文件拖拽覆盖层 */}
      {isDraggingFile ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-cyan bg-cyan/5 px-12 py-10 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-cyan/60" />
            <p className="mt-4 text-lg font-medium text-white">拖拽文件到此处释放</p>
            <p className="mt-2 text-sm text-white/50">支持图片、视频、PDF，可同时选择多个文件</p>
          </div>
        </div>
      ) : null}

      {/* 上传进度 */}
      {uploading ? (
        <div className="mb-4 rounded-md border border-cyan/20 bg-cyan/5 p-4">
          <p className="mb-3 text-sm font-medium text-cyan">正在上传…</p>
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([filename, pct]) => (
              <div key={filename}>
                <div className="flex justify-between text-xs text-white/70">
                  <span className="truncate">{filename}</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan transition-all duration-200"
                    style={{ width: `${Math.max(0, pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 块列表 */}
      {blocks.length === 0 && !uploading ? (
        <div
          className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 text-center"
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
          onDrop={(e) => onDropAt(e, 0)}
        >
          <UploadCloud className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-base text-white/40">暂无内容块</p>
          <p className="mt-2 text-sm text-white/25">
            拖拽文件到此处，或点击「添加内容块」开始创作
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              isEditing={editingBlockId === block.id}
              onEdit={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
              onDelete={() => handleDeleteBlock(block.id)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDropAt(e, index)}
              dragOverIndex={dragOverIndex}
              mediaAssets={mediaAssets}
            />
          ))}

          {/* 末尾插入区域 */}
          <div
            className="h-16 rounded-lg border-2 border-dashed border-transparent transition-colors hover:border-white/20 flex items-center justify-center"
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(blocks.length); }}
            onDrop={(e) => onDropAt(e, blocks.length)}
          >
            {dragOverIndex === blocks.length ? (
              <div className="text-sm text-cyan/60">释放此处插入</div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddMenuAt(blocks.length)}
                className="text-sm text-white/30 transition hover:text-white/60"
              >
                + 在此处添加内容
              </button>
            )}
          </div>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFileInputChange(e, blocks.length)}
      />

      {/* 添加内容块菜单 */}
      {showAddMenuAt !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddMenuAt(null)}
        >
          <div
            className="w-72 rounded-2xl border border-white/15 bg-[#1a1a2e] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">添加内容块</h4>
              <button
                type="button"
                onClick={() => setShowAddMenuAt(null)}
                className="rounded p-1 text-white/30 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  type="button"
                  onClick={async () => {
                    if (bt.type === "text") {
                      await handleAddTextBlock(showAddMenuAt);
                    } else {
                      // 其他类型：触发文件选择
                      // TODO: 打开媒体选择器
                      await handleAddTextBlock(showAddMenuAt); // 临时：先创建文本块
                    }
                    setShowAddMenuAt(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-3 text-sm text-white/70 transition hover:border-cyan/30 hover:text-white"
                >
                  <bt.icon className={`h-4 w-4 ${bt.color}`} />
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ── 块卡片组件 ─────────────────────────────────────────────

function BlockCard({
  block,
  index,
  isEditing,
  onEdit,
  onDelete,
  onDragOver,
  onDrop,
  dragOverIndex,
  mediaAssets,
}: {
  block: VisualBlock;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOverIndex: number | null;
  mediaAssets: Props["mediaAssets"];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const blockTypeConfig = BLOCK_TYPES.find((t) => t.type === block.block_type);

  const isDragOverTop = dragOverIndex === index;
  const isDragOverBottom = dragOverIndex === index + 1;

  return (
    <>
      {/* 上方插入指示器 */}
      {isDragOverTop ? (
        <div className="h-1 rounded-full bg-cyan mx-4" />
      ) : null}

      <div
        data-block-index={index}
        className={`group relative rounded-lg border transition ${
          isDragging
            ? "border-cyan/50 bg-cyan/5 opacity-50"
            : isEditing
              ? "border-cyan/30 bg-white/[0.04]"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
        }`}
        draggable
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* 块类型标签 + 操作栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          {/* 拖拽手柄 */}
          <GripHorizontal className="h-4 w-4 cursor-grab text-white/20 transition hover:text-white/50" />

          {/* 块类型图标 + 名称 */}
          <span className={`flex items-center gap-1.5 text-xs font-medium ${blockTypeConfig?.color ?? "text-white/50"}`}>
            {blockTypeConfig ? (
              <blockTypeConfig.icon className="h-3.5 w-3.5" />
            ) : null}
            {blockTypeConfig?.label ?? block.block_type}
          </span>

          <span className="text-[10px] text-white/20 font-mono">#{index + 1}</span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 text-white/25 transition hover:bg-white/10 hover:text-white/70"
              title="编辑"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
              title="删除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 块内容预览 */}
        <div className="p-4">
          <BlockPreview block={block} mediaAssets={mediaAssets} isEditing={isEditing} />
        </div>
      </div>

      {/* 下方插入指示器 */}
      {isDragOverBottom ? (
        <div className="h-1 rounded-full bg-cyan mx-4" />
      ) : null}
    </>
  );
}

// ── 块内容预览 ─────────────────────────────────────────────

function BlockPreview({
  block,
  mediaAssets,
  isEditing,
}: {
  block: VisualBlock;
  mediaAssets: Props["mediaAssets"];
  isEditing: boolean;
}) {
  const payload = block.payload;

  if (block.block_type === "text") {
    return (
      <div className="space-y-2">
        {payload.heading ? (
          <h4 className="text-base font-semibold text-white/90">{String(payload.heading)}</h4>
        ) : null}
        {payload.body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">
            {String(payload.body)}
          </p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "media") {
    const mediaId = String(payload.media_id ?? "");
    const asset = mediaAssets.find((a) => a.id === mediaId);
    const url = asset ? buildPublicMediaUrl(asset.storage_key) : null;

    return (
      <div>
        {url ? (
          <img
            src={url}
            alt={String(payload.caption ?? "")}
            className="max-h-64 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md bg-white/5 text-sm text-white/30">
            未选择媒体
          </div>
        )}
        {payload.caption ? (
          <p className="mt-2 text-sm text-white/50">{String(payload.caption)}</p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "gallery") {
    const mediaIds = (payload.media_ids as string[]) ?? [];
    const refs = (payload.media_refs as { id: string; storage_key: string }[]) ?? [];

    return (
      <div className="grid grid-cols-3 gap-2">
        {(refs.length > 0 ? refs : mediaAssets.filter((a) => mediaIds.includes(a.id))).slice(0, 6).map((asset: { storage_key: string }, i: number) => (
          <img
            key={i}
            src={buildPublicMediaUrl(asset.storage_key)}
            alt=""
            className="aspect-square rounded-md object-cover"
          />
        ))}
        {mediaIds.length > 6 ? (
          <div className="flex items-center justify-center rounded-md bg-white/5 text-xs text-white/30">
            +{mediaIds.length - 6}
          </div>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "video") {
    const mediaId = String(payload.media_id ?? "");
    const asset = mediaAssets.find((a) => a.id === mediaId);
    const url = asset ? buildPublicMediaUrl(asset.storage_key) : null;

    return (
      <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
        <Video className="h-8 w-8 text-red-400/60" />
        <span className="text-sm text-white/60">{asset?.original_name ?? "未选择视频"}</span>
      </div>
    );
  }

  if (block.block_type === "pdf") {
    const mediaId = String(payload.media_id ?? "");
    const asset = mediaAssets.find((a) => a.id === mediaId);

    return (
      <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
        <FileText className="h-8 w-8 text-orange-400/60" />
        <span className="text-sm text-white/60">{asset?.original_name ?? "未选择 PDF"}</span>
      </div>
    );
  }

  if (block.block_type === "before_after") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
        <Columns2 className="h-8 w-8 text-yellow-400/60" />
        <span className="text-sm text-white/60">Before / After 对比块</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-white/30">
      未知块类型: {block.block_type}
    </div>
  );
}
