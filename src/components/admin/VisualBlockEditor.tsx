"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GripHorizontal,
  Image as ImageIcon,
  Video,
  FileText,
  Type,
  Columns2,
  UploadCloud,
  Trash2,
  Pencil,
  Check,
  Replace,
  ImagePlus,
  Crop,
  Images,
  Layers,
  Crosshair,
  Code,
  Quote,
  Frame,
  SeparatorHorizontal,
  MessageSquare,
  Hash,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import {
  reorderWorkBlocks,
  createBlockDirect,
  deleteBlockDirect,
  updateBlockDirect,
  updateBlockLayoutDirect,
  updateBlockMediaRef,
} from "@/app/admin/(protected)/works/actions";
import { uploadMediaFiles, uploadMediaBlob } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { pdfToImages } from "@/lib/cms/pdf-to-images";
import { ImageCropper } from "@/components/admin/ImageCropper";

// ── 类型定义 ───────────────────────────────────────────────

export type VisualBlock = {
  id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  payload: Record<string, unknown>;
};

type MediaAsset = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

type Props = {
  workId: string;
  workSlug: string;
  initialBlocks: VisualBlock[];
  mediaAssets: MediaAsset[];
  embedded?: boolean;
};

// ── 块类型配置（仅用于图标/标签显示）────────────────────

const BLOCK_TYPE_META = {
  text:         { label: "文本",   icon: Type,                color: "text-blue-400"   },
  media:        { label: "图片",   icon: ImageIcon,           color: "text-green-400"  },
  gallery:      { label: "图库",   icon: Columns2,            color: "text-purple-400" },
  video:        { label: "视频",   icon: Video,               color: "text-red-400"    },
  pdf:          { label: "PDF",    icon: FileText,            color: "text-orange-400" },
  before_after: { label: "对比",   icon: Columns2,            color: "text-yellow-400" },
  code:         { label: "代码",   icon: Code,                color: "text-green-300"  },
  quote:        { label: "引用",   icon: Quote,               color: "text-copper"     },
  embed:        { label: "嵌入",   icon: Frame,               color: "text-cyan"       },
  divider:      { label: "分隔",   icon: SeparatorHorizontal, color: "text-white/50"   },
  callout:      { label: "提示",   icon: MessageSquare,       color: "text-amber-400"  },
  stats:        { label: "数据",   icon: Hash,                color: "text-purple-400" },
} as const;

// ── 新增块类型的创建选项（默认 payload）────────────────────

const NEW_BLOCK_OPTIONS: Array<{
  type: string;
  label: string;
  icon: typeof Code;
  payload: Record<string, unknown>;
}> = [
  { type: "code",    label: "代码", icon: Code,                payload: { heading: "代码", language: "javascript", code: "// 在此输入代码", caption: "" } },
  { type: "quote",   label: "引用", icon: Quote,               payload: { heading: "引用", text: "引用内容", author: "作者", role: "" } },
  { type: "embed",   label: "嵌入", icon: Frame,               payload: { heading: "嵌入", url: "https://", embedType: "youtube", caption: "" } },
  { type: "divider", label: "分隔", icon: SeparatorHorizontal, payload: { heading: "分隔", style: "solid" } },
  { type: "callout", label: "提示", icon: MessageSquare,       payload: { heading: "提示", text: "提示内容", icon: "info", tone: "cyan" } },
  { type: "stats",   label: "数据", icon: Hash,                payload: { heading: "数据", items: [{ value: "100", label: "标签" }] } },
];

// ── 布局类型 ─────────────────────────────────────────────

type LayoutWidth = "full" | "contained" | "narrow" | "free";

const LAYOUT_WIDTH_OPTIONS = [
  { value: "full"      as const, label: "通栏",  desc: "满宽显示" },
  { value: "contained" as const, label: "约束",  desc: "最大1100px居中" },
  { value: "narrow"    as const, label: "窄版",  desc: "最大768px居中" },
  { value: "free"      as const, label: "自由",  desc: "类 PPT 自由定位" },
];

const LAYOUT_ALIGN_OPTIONS = [
  { value: "left"   as const, label: "左对齐" },
  { value: "center" as const, label: "居中" },
  { value: "right"  as const, label: "右对齐" },
];

const GALLERY_COLUMN_OPTIONS = [
  { value: 1 as const, label: "1列" },
  { value: 2 as const, label: "2列" },
  { value: 3 as const, label: "3列" },
  { value: 4 as const, label: "4列" },
];

type FreeLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** 从 payload 中安全读取 layout 字段 */
function getLayout(payload: Record<string, unknown>): {
  width: LayoutWidth;
  align: "left" | "center" | "right";
  columns: 1 | 2 | 3 | 4;
  free?: FreeLayout;
} {
  const l = (payload.layout ?? {}) as Record<string, unknown>;
  return {
    width:  (l.width  as LayoutWidth) ?? "contained",
    align:  (l.align  as "left" | "center" | "right") ?? "left",
    columns: (l.columns as 1 | 2 | 3 | 4) ?? 3,
    free:   l.free as FreeLayout | undefined,
  };
}

/** 将 layout 合并写回 payload */
function withLayout(
  payload: Record<string, unknown>,
  layout: Partial<{ width: LayoutWidth; align: "left" | "center" | "right"; columns: 1 | 2 | 3 | 4; free?: FreeLayout }>,
): Record<string, unknown> {
  return {
    ...payload,
    layout: { ...getLayout(payload), ...layout },
  };
}

// ── 布局控制条组件 ─────────────────────────────────────────

function LayoutBar({
  blockType,
  layout,
  onChange,
}: {
  blockType: string;
  layout: { width: LayoutWidth; align: "left" | "center" | "right"; columns: 1 | 2 | 3 | 4 };
  onChange: (patch: Partial<{ width: LayoutWidth; align: "left" | "center" | "right"; columns: 1 | 2 | 3 | 4 }>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
        布局
      </span>

      {/* 宽度选择 */}
      <div className="flex overflow-hidden rounded-md border border-white/10">
        {LAYOUT_WIDTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ width: opt.value })}
            className={`px-2.5 py-1 text-[11px] font-medium transition ${
              layout.width === opt.value
                ? "bg-cyan/20 text-cyan"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
            title={opt.desc}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 文本对齐（仅文本块） */}
      {blockType === "text" ? (
        <div className="flex overflow-hidden rounded-md border border-white/10">
          {LAYOUT_ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ align: opt.value })}
              className={`px-2.5 py-1 text-[11px] font-medium transition ${
                layout.align === opt.value
                  ? "bg-cyan/20 text-cyan"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* 图库列数（仅图库块） */}
      {blockType === "gallery" ? (
        <div className="flex overflow-hidden rounded-md border border-white/10">
          {GALLERY_COLUMN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ columns: opt.value })}
              className={`px-2.5 py-1 text-[11px] font-medium transition ${
                layout.columns === opt.value
                  ? "bg-cyan/20 text-cyan"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* 布局说明 */}
      <span className="ml-auto text-[10px] text-white/20">
        {layout.width === "full" ? "满宽通栏" : layout.width === "contained" ? "约束宽度居中" : layout.width === "free" ? "自由定位" : "窄版居中"}
        {blockType === "gallery" ? ` · ${layout.columns}列` : ""}
        {blockType === "text" ? ` · ${layout.align === "center" ? "居中" : "左对齐"}` : ""}
      </span>
    </div>
  );
}

// ── 自由定位编辑器 ─────────────────────────────────────────

function FreePositionPanel({
  free,
  onChange,
}: {
  free?: FreeLayout;
  onChange: (patch: Partial<FreeLayout>) => void;
}) {
  const values = {
    x: free?.x ?? 0,
    y: free?.y ?? 0,
    w: free?.w ?? 50,
    h: free?.h ?? 50,
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">自由定位 (%)</span>
      {(["x", "y", "w", "h"] as const).map((key) => (
        <label key={key} className="flex items-center gap-1.5 text-[11px]">
          <span className="text-white/40">{key.toUpperCase()}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={values[key]}
            onChange={(e) => onChange({ [key]: Number(e.target.value) })}
            className="h-7 w-16 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white/80 outline-none focus:border-cyan"
          />
        </label>
      ))}
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────────

export function VisualBlockEditor({ workId, workSlug, initialBlocks, mediaAssets, embedded = false }: Props) {
  const [blocks, setBlocks] = useState<VisualBlock[]>(
    () => [...initialBlocks].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [pdfParseStatus, setPdfParseStatus] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    blockId: string;
  } | null>(null);

  // 乐观更新：仅更新本地 state，不触发 router.refresh()，用于布局等高频操作
  const handleOptimisticUpdate = useCallback(
    (blockId: string, newPayload: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, payload: newPayload } : b)),
      );
    },
    [],
  );

  // 多图排列方式询问
  const [imageLayoutChoice, setImageLayoutChoice] = useState<{
    files: File[];
    insertAt: number;
  } | null>(null);

  // before_after 专用
  const [baStep, setBaStep] = useState<{ blockId: string; step: "before" | "after" } | null>(null);
  // 裁剪状态
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
  const [croppingBlockId, setCroppingBlockId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initializedRef = useRef(false);

  // 仅在首次挂载时从 initialBlocks 初始化，避免 router.refresh() 覆盖正在编辑的本地状态
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setBlocks([...initialBlocks].sort((a, b) => a.sort_order - b.sort_order));
    }
  }, [initialBlocks]);

  // ── 持久化顺序 ───────────────────────────────────────────

  const persistOrder = useCallback(
    (orderedBlocks: VisualBlock[]) => {
      startTransition(() => {
        void reorderWorkBlocks(
          workId,
          workSlug,
          orderedBlocks.map((b) => b.id),
        );
      });
    },
    [workId, workSlug, startTransition],
  );

  // ── 根据文件类型决定块类型 ───────────────────────────────

  const getBlockTypeFromFile = (file: File): string => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "pdf";
    return "media";
  };

  // ── 上传文件并创建块（核心）──────────────────────────────

  const uploadAndCreateBlocks = useCallback(
    async (files: File[], insertAt: number) => {
      if (files.length === 0) return;
      setUploading(true);
      setUploadProgress({});
      setPdfParseStatus(null);
      try {
        let totalInsertOffset = 0;

        for (let f = 0; f < files.length; f++) {
          const file = files[f];
          const currentInsertAt = insertAt + totalInsertOffset;

          // PDF：解析为多页图片 → 创建gallery块
          if (file.type === "application/pdf") {
            setPdfParseStatus(`正在解析 PDF「${file.name}」…`);
            const pages = await pdfToImages(file, 2.0, (cur, total) => {
              setPdfParseStatus(`正在解析 PDF「${file.name}」第 ${cur}/${total} 页…`);
            });
            setPdfParseStatus(`正在上传 PDF「${file.name}」的 ${pages.length} 张页面图片…`);

            const pageFiles = pages.map((p) =>
              new File([p.blob], p.filename, { type: "image/jpeg" }),
            );
            const results = await uploadMediaFiles(pageFiles, (progress) => {
              setUploadProgress(progress);
            });

            const mediaIds = results.map((r) => r.id);
            const payload: Record<string, unknown> = {
              media_ids: mediaIds,
              caption: "",
              layout: { columns: 1 },
            };
            const created = await createBlockDirect(workId, workSlug, "gallery", payload, currentInsertAt);

            setBlocks((prev) => {
              const merged = [...prev];
              merged.forEach((b) => {
                if (b.sort_order >= currentInsertAt) b.sort_order += 1;
              });
              merged.push({
                id: created.id,
                block_type: "gallery",
                sort_order: currentInsertAt,
                is_visible: true,
                payload,
              });
              merged.sort((a, b) => a.sort_order - b.sort_order);
              merged.forEach((b, i) => { b.sort_order = i; });
              return merged;
            });
            totalInsertOffset += 1;
            continue;
          }

          // 图片/视频：按原逻辑创建单媒体块
          const blockType = getBlockTypeFromFile(file);
          const results = await uploadMediaFiles([file], (progress) => {
            setUploadProgress(progress);
          });
          if (results.length === 0) continue;
          const result = results[0];

          const payload: Record<string, unknown> = {
            media_id: result.id,
            caption: "",
          };
          const created = await createBlockDirect(workId, workSlug, blockType, payload, currentInsertAt);

          setBlocks((prev) => {
            const merged = [...prev];
            merged.forEach((b) => {
              if (b.sort_order >= currentInsertAt) b.sort_order += 1;
            });
            merged.push({
              id: created.id,
              block_type: blockType,
              sort_order: currentInsertAt,
              is_visible: true,
              payload,
            });
            merged.sort((a, b) => a.sort_order - b.sort_order);
            merged.forEach((b, i) => { b.sort_order = i; });
            return merged;
          });
          totalInsertOffset += 1;
        }

        setBlocks((prev) => {
          const merged = [...prev];
          merged.sort((a, b) => a.sort_order - b.sort_order);
          merged.forEach((b, i) => { b.sort_order = i; });
          persistOrder(merged);
          return merged;
        });
        router.refresh();
      } catch (err) {
        console.error("Upload failed:", err);
        alert(`上传失败：${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setUploading(false);
        setUploadProgress({});
        setPdfParseStatus(null);
      }
    },
    [workId, workSlug, router, persistOrder],
  );

  // ── 上传多张图片创建图库块 ───────────────────────────────

  const uploadAndCreateGallery = useCallback(
    async (files: File[], insertAt: number) => {
      setUploading(true);
      try {
        const results = await uploadMediaFiles(files, (progress) => {
          setUploadProgress(progress);
        });

        const mediaIds = results.map((r) => r.id);
        const payload: Record<string, unknown> = { media_ids: mediaIds, caption: "" };

        const created = await createBlockDirect(
          workId,
          workSlug,
          "gallery",
          payload,
          insertAt,
        );

        const newBlock: VisualBlock = {
          id: created.id,
          block_type: "gallery",
          sort_order: insertAt,
          is_visible: true,
          payload,
        };

        const merged = [...blocks];
        merged.forEach((b) => {
          if (b.sort_order >= insertAt) b.sort_order += 1;
        });
        merged.push(newBlock);
        merged.sort((a, b) => a.sort_order - b.sort_order);
        merged.forEach((b, i) => { b.sort_order = i; });

        setBlocks(merged);
        persistOrder(merged);
        router.refresh();
      } catch (err) {
        console.error("Create gallery failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router, persistOrder, blocks],
  );

  // ── 上传图片并追加到图库块 ───────────────────────────────

  const handleAddImagesToGallery = useCallback(
    async (blockId: string, files: File[]) => {
      setUploading(true);
      try {
        const results = await uploadMediaFiles(files, (progress) => {
          setUploadProgress(progress);
        });

        const block = blocks.find((b) => b.id === blockId);
        if (!block) return;

        const existingIds = (block.payload.media_ids as string[]) ?? [];
        const newIds = results.map((r) => r.id);
        const newPayload = {
          ...block.payload,
          media_ids: [...existingIds, ...newIds],
        };

        await updateBlockDirect(workId, workSlug, blockId, {
          ...newPayload,
          _block_type: "gallery",
        });

        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, payload: newPayload } : b,
          ),
        );
        router.refresh();
      } catch (err) {
        console.error("Add images to gallery failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router, blocks],
  );

  // ── 处理文件选择（"上传文件"按钮触发）────────────────────

  const handleFileSelect = useCallback(
    async (files: File[], insertAt = blocks.length) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      const nonImages = files.filter((f) => !f.type.startsWith("image/"));

      if (images.length > 1 && nonImages.length === 0) {
        // 多张图片：询问排列方式
        setImageLayoutChoice({ files: images, insertAt });
        return;
      }

      // 单张图片 或 混合类型：直接创建
      await uploadAndCreateBlocks(files, insertAt);
    },
    [blocks.length, uploadAndCreateBlocks],
  );

  // ── 上传文件并替换块的媒体 ───────────────────────────────

  const uploadAndReplaceMedia = useCallback(
    async (blockId: string, files: File[]) => {
      setUploading(true);
      try {
        const results = await uploadMediaFiles(files, (progress) => {
          setUploadProgress(progress);
        });
        if (results.length === 0) return;

        const block = blocks.find((b) => b.id === blockId);
        if (!block) return;

        // 如果是图库块，追加图片
        if (block.block_type === "gallery") {
          const existingIds = (block.payload.media_ids as string[]) ?? [];
          const newIds = results.map((r) => r.id);
          const newPayload = {
            ...block.payload,
            media_ids: [...existingIds, ...newIds],
          };
          await updateBlockDirect(workId, workSlug, blockId, {
            ...newPayload,
            _block_type: "gallery",
          });
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, payload: newPayload } : b,
            ),
          );
        } else {
          // 单媒体块：替换第一张
          const result = results[0];
          const newPayload = {
            ...block.payload,
            media_id: result.id,
          };
          await updateBlockDirect(workId, workSlug, blockId, {
            ...newPayload,
            _block_type: block.block_type,
          });
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId ? { ...b, payload: newPayload } : b,
            ),
          );
        }

        router.refresh();
      } catch (err) {
        console.error("Replace media failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router, blocks],
  );

  // ── 处理裁剪完成 ─────────────────────────────────────────

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      if (!croppingBlockId) return;
      setUploading(true);
      try {
        const filename = `cropped-${Date.now()}.jpg`;
        const result = await uploadMediaBlob(croppedBlob, filename, (progress) => {
          setUploadProgress(progress);
        });

        await updateBlockMediaRef(workId, workSlug, croppingBlockId, result.id);

        const block = blocks.find((b) => b.id === croppingBlockId);
        if (block) {
          const newPayload = {
            ...block.payload,
            media_id: result.id,
          };
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === croppingBlockId ? { ...b, payload: newPayload } : b,
            ),
          );
        }

        setCroppingImageSrc(null);
        setCroppingBlockId(null);
        router.refresh();
      } catch (err) {
        console.error("Crop upload failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router, blocks, croppingBlockId],
  );

  // ── 拖拽辅助 ─────────────────────────────────────────────

  const isFileDrag = useCallback((e: React.DragEvent) => {
    return Array.from(e.dataTransfer.types).includes("Files");
  }, []);

  const isBlockDrag = useCallback((e: React.DragEvent) => {
    return Array.from(e.dataTransfer.types).includes("block-id");
  }, []);

  const handleFilesDrop = useCallback(
    async (files: File[], insertAt: number) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length > 1 && files.length === images.length) {
        // 多张图片拖拽：询问排列方式
        setImageLayoutChoice({ files: images, insertAt });
      } else {
        await uploadAndCreateBlocks(files, insertAt);
      }
    },
    [uploadAndCreateBlocks],
  );

  // 全局拖拽检测（拖入内容编辑区域时显示覆盖层，媒体上传区域不显示）
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      if (document.body.hasAttribute("data-media-dragging")) return;
      setIsDraggingFile(true);
    };
    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      if (document.body.hasAttribute("data-media-dragging")) {
        setIsDraggingFile(false);
        return;
      }
      setIsDraggingFile(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget || e.relatedTarget === document.body) {
        setIsDraggingFile(false);
      }
    };
    const handleDrop = () => {
      setIsDraggingFile(false);
      setDragOverIndex(null);
    };
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  // 拖拽自动滚动：当鼠标接近视口顶部/底部时自动滚动页面
  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollMouseYRef = useRef(0);
  const autoScrollActiveRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const startAutoScroll = useCallback((clientY: number) => {
    autoScrollMouseYRef.current = clientY;
    if (autoScrollActiveRef.current) return;
    autoScrollActiveRef.current = true;

    const scrollStep = () => {
      if (!autoScrollActiveRef.current) return;
      const y = autoScrollMouseYRef.current;
      const viewportH = window.innerHeight;
      const edgeZone = 100;
      const maxSpeed = 8;

      let delta = 0;
      if (y < edgeZone) {
        const factor = 1 - y / edgeZone;
        delta = -maxSpeed * Math.pow(factor, 1.5);
      } else if (y > viewportH - edgeZone) {
        const factor = (y - (viewportH - edgeZone)) / edgeZone;
        delta = maxSpeed * Math.pow(factor, 1.5);
      }

      if (delta !== 0) {
        window.scrollBy({ top: delta, behavior: "auto" });

        const el = document.elementFromPoint(window.innerWidth / 2, y);
        if (el) {
          const blockEl = el.closest("[data-block-index]") as HTMLElement | null;
          if (blockEl) {
            const idx = Number(blockEl.getAttribute("data-block-index"));
            if (!Number.isNaN(idx)) {
              const rect = blockEl.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              const insertAt = y < midY ? idx : idx + 1;
              setDragOverIndex(insertAt);
            }
          } else {
            const triggerEl = el.closest("[data-insert-index]") as HTMLElement | null;
            if (triggerEl) {
              const idx = Number(triggerEl.getAttribute("data-insert-index"));
              if (!Number.isNaN(idx)) {
                setDragOverIndex(idx);
              }
            }
          }
        }
      }

      autoScrollRafRef.current = requestAnimationFrame(scrollStep);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollStep);
  }, []);

  const stopAutoScroll = useCallback(() => {
    autoScrollActiveRef.current = false;
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  // 全局 dragover/dragend 用于自动滚动更新位置和停止
  useEffect(() => {
    if (!draggedBlockId) {
      stopAutoScroll();
      return;
    }

    const handleGlobalDragOver = (e: DragEvent) => {
      autoScrollMouseYRef.current = e.clientY;
    };
    const handleGlobalDragEnd = () => {
      stopAutoScroll();
    };

    document.addEventListener("dragover", handleGlobalDragOver);
    document.addEventListener("dragend", handleGlobalDragEnd);
    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver);
      document.removeEventListener("dragend", handleGlobalDragEnd);
      stopAutoScroll();
    };
  }, [draggedBlockId, stopAutoScroll]);

  // 右键菜单：点击其他地方关闭
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);
    setTimeout(() => {
      document.addEventListener("click", handleClick);
      document.addEventListener("scroll", handleScroll, true);
    }, 0);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  // 移到最前/最后
  const moveBlockToFront = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const sourceIndex = prev.findIndex((b) => b.id === blockId);
      if (sourceIndex <= 0) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.unshift(moved);
      reordered.forEach((b, i) => { b.sort_order = i; });
      persistOrder(reordered);
      return reordered;
    });
    setContextMenu(null);
  }, [persistOrder]);

  const moveBlockToEnd = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const sourceIndex = prev.findIndex((b) => b.id === blockId);
      if (sourceIndex === -1 || sourceIndex === prev.length - 1) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.push(moved);
      reordered.forEach((b, i) => { b.sort_order = i; });
      persistOrder(reordered);
      return reordered;
    });
    setContextMenu(null);
  }, [persistOrder]);

  const moveBlockToIndex = useCallback(
    (blockId: string, targetIndex: number) => {
      const sourceIndex = blocks.findIndex((b) => b.id === blockId);
      if (sourceIndex === -1) return;
      if (sourceIndex === targetIndex) return;

      const reordered = [...blocks];
      const [moved] = reordered.splice(sourceIndex, 1);
      const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      reordered.splice(adjustedTarget, 0, moved);
      reordered.forEach((b, i) => { b.sort_order = i; });

      setBlocks(reordered);
      persistOrder(reordered);
    },
    [blocks, persistOrder],
  );

  const handleBlockDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!isBlockDrag(e) && !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      autoScrollMouseYRef.current = e.clientY;
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertAt = e.clientY < midY ? index : index + 1;
      setDragOverIndex(insertAt);
    },
    [isBlockDrag, isFileDrag],
  );

  const handleGapDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFileDrag(e) || isBlockDrag(e)) {
        setDragOverIndex(index);
      }
    },
    [isFileDrag, isBlockDrag],
  );

  const onDropAt = useCallback(
    async (e: React.DragEvent, insertAt: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);
      setDraggedBlockId(null);

      if (isBlockDrag(e)) {
        const blockId = e.dataTransfer.getData("block-id");
        if (!blockId) return;
        moveBlockToIndex(blockId, insertAt);
        return;
      }

      if (isFileDrag(e)) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        await handleFilesDrop(files, insertAt);
      }
    },
    [handleFilesDrop, isBlockDrag, isFileDrag, moveBlockToIndex],
  );

  const handleBlockDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertAt = e.clientY < midY ? index : index + 1;
      void onDropAt(e, insertAt);
    },
    [onDropAt],
  );

  // ── 文件输入变化（"上传文件"按钮 / 更换媒体）────────────

  const [fileInputIntent, setFileInputIntent] = useState<{
    mode: "upload" | "replace" | "ba";
    blockId?: string;
    step?: "before" | "after";
  }>({ mode: "upload" });

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fileInputIntent.mode === "replace" && fileInputIntent.blockId) {
      await uploadAndReplaceMedia(fileInputIntent.blockId, Array.from(files));
    } else if (fileInputIntent.mode === "ba" && fileInputIntent.blockId) {
      // before_after 上传
      setUploading(true);
      try {
        const results = await uploadMediaFiles(Array.from(files), (progress) => {
          setUploadProgress(progress);
        });
        if (results.length === 0) return;

        const result = results[0];
        const block = blocks.find((b) => b.id === fileInputIntent.blockId);
        if (!block) return;

        const newPayload = { ...block.payload };
        if (fileInputIntent.step === "before") {
          newPayload.before_media_id = result.id;
        } else {
          newPayload.after_media_id = result.id;
        }

        await updateBlockDirect(workId, workSlug, fileInputIntent.blockId, {
          ...newPayload,
          _block_type: "before_after",
        });

        setBlocks((prev) =>
          prev.map((b) => (b.id === fileInputIntent.blockId ? { ...b, payload: newPayload } : b)),
        );
        setBaStep(null);
        router.refresh();
      } catch (err) {
        console.error("BA upload failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    } else {
      // 默认：上传文件创建新块
      await handleFileSelect(Array.from(files), blocks.length);
    }

    setFileInputIntent({ mode: "upload" });
    e.target.value = "";
  };

  // ── 删除块 ───────────────────────────────────────────────

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      try {
        await deleteBlockDirect(blockId, workId, workSlug);
        setBlocks((prev) => {
          const filtered = prev.filter((b) => b.id !== blockId);
          filtered.forEach((b, i) => { b.sort_order = i; });
          return filtered;
        });
        router.refresh();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [workId, workSlug, router],
  );

  // ── 添加文本块 ─────────────────────────────────────────────

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
          updated.forEach((b) => { if (b.sort_order >= insertAt) b.sort_order += 1; });
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

  // ── 通用块创建（用于新增的 6 种块类型）────────────────────

  const handleAddBlock = useCallback(
    async (blockType: string, payload: Record<string, unknown>, insertAt: number) => {
      try {
        const created = await createBlockDirect(
          workId,
          workSlug,
          blockType,
          payload,
          insertAt,
        );
        setBlocks((prev) => {
          const updated = [...prev];
          updated.forEach((b) => { if (b.sort_order >= insertAt) b.sort_order += 1; });
          return [...updated, {
            id: created.id,
            block_type: blockType,
            sort_order: insertAt,
            is_visible: true,
            payload,
          }].sort((a, b) => a.sort_order - b.sort_order);
        });
        router.refresh();
      } catch (err) {
        console.error("Add block failed:", err);
      }
    },
    [workId, workSlug, router],
  );

  // ── 更新块 payload ───────────────────────────────────────

  const handleUpdateBlock = useCallback(
    async (blockId: string, newPayload: Record<string, unknown>, blockType?: string) => {
      try {
        const payloadToSend = blockType ? { ...newPayload, _block_type: blockType } : newPayload;
        await updateBlockDirect(workId, workSlug, blockId, payloadToSend);
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, payload: newPayload } : b)),
        );
        router.refresh();
      } catch (err) {
        console.error("Update block failed:", err);
      }
    },
    [workId, workSlug, router],
  );

  // 布局保存（轻量版）：仅更新后端，不触发 revalidatePath/router.refresh()
  // 防止服务端 RSC 重新渲染覆盖本地乐观更新，导致布局按钮来回跳动
  const saveLayoutToServer = useCallback(
    async (blockId: string, newPayload: Record<string, unknown>) => {
      try {
        await updateBlockLayoutDirect(workId, blockId, newPayload);
      } catch (err) {
        console.error("Save layout failed:", err);
      }
    },
    [workId],
  );

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <section
      className={embedded ? "relative" : "mt-6"}
      ref={containerRef}
    >
      {/* 标题栏 + 操作按钮（非embedded模式显示） */}
      {!embedded ? (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">内容编辑</h3>
            <p className="mt-1 text-sm text-white/45">
              拖拽文件到任意位置插入；或点击「上传文件」批量添加
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFileInputIntent({ mode: "upload" });
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*,video/*,application/pdf";
                  fileInputRef.current.multiple = true;
                  fileInputRef.current.click();
                }
              }}
              className="flex items-center gap-2 rounded-md border border-cyan/35 px-4 py-2 text-sm text-cyan transition hover:bg-cyan/10"
            >
              <UploadCloud className="h-4 w-4" />
              上传文件
            </button>
            <button
              type="button"
              onClick={() => handleAddTextBlock(blocks.length)}
              className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
            >
              <Type className="h-4 w-4" />
              添加文本
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBlockMenu((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                添加块
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showBlockMenu ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowBlockMenu(false)}
                  />
                  <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-white/15 bg-[#1a1a2e] shadow-2xl">
                    {NEW_BLOCK_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            void handleAddBlock(opt.type, opt.payload, blocks.length);
                            setShowBlockMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                        >
                          <Icon className="h-4 w-4 text-white/50" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* 文件拖拽覆盖层 */}
      {isDraggingFile ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="pointer-events-none rounded-2xl border-2 border-dashed border-cyan bg-cyan/5 px-12 py-10 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-cyan/60" />
            <p className="mt-4 text-lg font-medium text-white">拖拽文件到此处释放</p>
            <p className="mt-2 text-sm text-white/50">支持图片、视频、PDF，可同时选择多个文件</p>
          </div>
        </div>
      ) : null}

      {/* 上传进度 */}
      {uploading ? (
        <div className="mb-4 rounded-md border border-cyan/20 bg-cyan/5 p-4">
          <p className="mb-3 text-sm font-medium text-cyan">
            {pdfParseStatus ?? "正在上传…"}
          </p>
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([filename, pct]) => (
              <div key={filename}>
                <div className="flex justify-between text-xs text-white/70">
                  <span className="truncate">{filename}</span>
                  <span>{typeof pct === "number" ? (pct >= 0 ? `${pct}%` : "失败") : ""}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan transition-all duration-200"
                    style={{ width: `${Math.max(0, typeof pct === "number" ? pct : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 多图排列方式询问 */}
      {imageLayoutChoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-white/15 bg-[#1a1a2e] p-6 shadow-2xl">
            <h4 className="mb-2 text-sm font-semibold text-white">
              检测到 {imageLayoutChoice.files.length} 张图片
            </h4>
            <p className="mb-5 text-xs text-white/45">请选择排列方式：</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  const { files, insertAt } = imageLayoutChoice;
                  setImageLayoutChoice(null);
                  await uploadAndCreateBlocks(files, insertAt);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-left text-sm text-white/70 transition hover:border-cyan/30 hover:bg-white/[0.03] hover:text-white"
              >
                <Images className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium text-white/90">逐张排列</p>
                  <p className="text-xs text-white/35">每张图片创建独立的图片块</p>
                </div>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { files, insertAt } = imageLayoutChoice;
                  setImageLayoutChoice(null);
                  await uploadAndCreateGallery(files, insertAt);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-left text-sm text-white/70 transition hover:border-cyan/30 hover:bg-white/[0.03] hover:text-white"
              >
                <Layers className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="font-medium text-white/90">合并为图库</p>
                  <p className="text-xs text-white/35">所有图片放入一个图库块</p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setImageLayoutChoice(null)}
              className="mt-4 w-full rounded-md border border-white/10 py-2 text-xs text-white/35 transition hover:text-white/60"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {/* 块列表 */}
      {blocks.length === 0 && !uploading ? (
        embedded ? (
          <div
            className={`flex min-h-[320px] flex-col items-center justify-center rounded-xl text-center transition ${
              dragOverIndex === 0
                ? "border-2 border-dashed border-cyan/50 bg-cyan/[0.04]"
                : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
            onDrop={(e) => onDropAt(e, 0)}
          >
            <button
              type="button"
              onClick={() => handleAddTextBlock(0)}
              className="group flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/30 transition hover:text-cyan"
            >
              <Plus className="h-4 w-4 transition group-hover:scale-110" />
              <span>可以直接输入文字，在这里介绍你的作品</span>
            </button>
            <p className="mt-2 max-w-md text-xs text-white/20">
              可对文字和图片进行自由排版，点击左侧 ⊕ 可选择你需要的功能（图片/视频/PDF/图库等）；也可以直接拖拽文件到此处上传
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFileInputIntent({ mode: "upload" });
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*,video/*,application/pdf";
                    fileInputRef.current.multiple = true;
                    fileInputRef.current.click();
                  }
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:border-cyan/40 hover:text-cyan"
              >
                上传图片/视频
              </button>
            </div>
          </div>
        ) : (
        <div
          className={`flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
            dragOverIndex === 0
              ? "border-cyan/50 bg-cyan/[0.04]"
              : "border-white/10 bg-white/[0.01]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
          onDrop={(e) => onDropAt(e, 0)}
        >
          <div className={`flex h-16 w-16 items-center justify-center rounded-full transition ${
            dragOverIndex === 0 ? "bg-cyan/15" : "bg-white/[0.03]"
          }`}>
            <UploadCloud className={`h-8 w-8 transition ${dragOverIndex === 0 ? "text-cyan" : "text-white/25"}`} />
          </div>
          <p className="mt-5 text-lg font-medium text-white/50">
            {dragOverIndex === 0 ? "松开鼠标即可上传" : "拖拽文件到此处上传"}
          </p>
          <p className="mt-2 text-sm text-white/30">
            支持多选、多格式：JPG / PNG / GIF / PDF / MP4
          </p>
          <button
            type="button"
            onClick={() => {
              setFileInputIntent({ mode: "upload" });
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*,video/*,application/pdf";
                fileInputRef.current.multiple = true;
                fileInputRef.current.click();
              }
            }}
            className="mt-5 rounded-md border border-cyan/35 px-5 py-2 text-sm text-cyan transition hover:bg-cyan/10"
          >
            选择文件上传
          </button>
        </div>
        )
      ) : (
        <div className="space-y-0">
          <InsertTrigger
            index={0}
            onDragOver={(e) => handleGapDragOver(e, 0)}
            onDrop={(e) => onDropAt(e, 0)}
            isDragOver={dragOverIndex === 0}
          />

          {blocks.map((block, index) => (
            <div key={block.id}>
              <BlockCard
                block={block}
                index={index}
                isEditing={editingBlockId === block.id}
                isDragging={draggedBlockId === block.id}
                isDropTargetBefore={dragOverIndex === index}
                isDropTargetAfter={dragOverIndex === index + 1}
                onEdit={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                onDelete={() => handleDeleteBlock(block.id)}
                onDragStart={(e) => {
                  if (e.button !== 0) return;
                  setDraggedBlockId(block.id);
                  startAutoScroll(e.clientY);
                }}
                onDragEnd={() => { setDraggedBlockId(null); setDragOverIndex(null); stopAutoScroll(); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, blockId: block.id });
                }}
                onDragOver={(e) => handleBlockDragOver(e, index)}
                onDrop={(e) => handleBlockDrop(e, index)}
                mediaAssets={mediaAssets}
                onUpdatePayload={(newPayload) => handleUpdateBlock(block.id, newPayload, block.block_type)}
                onOptimisticUpdate={(newPayload) => handleOptimisticUpdate(block.id, newPayload)}
                onSaveLayout={(newPayload) => saveLayoutToServer(block.id, newPayload)}
                onSaveAndClose={() => setEditingBlockId(null)}
                onReplaceMedia={(blockId) => {
                  setFileInputIntent({ mode: "replace", blockId });
                  if (fileInputRef.current) {
                    const block = blocks.find((b) => b.id === blockId);
                    if (block?.block_type === "gallery") {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.multiple = true;
                    } else {
                      fileInputRef.current.accept = "image/*,video/*,application/pdf";
                      fileInputRef.current.multiple = false;
                    }
                    fileInputRef.current.click();
                  }
                }}
                onAddImagesToGallery={handleAddImagesToGallery}
                onSelectBaFile={(blockId, step) => {
                  setBaStep({ blockId, step });
                  setFileInputIntent({ mode: "ba", blockId, step });
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*";
                    fileInputRef.current.multiple = false;
                    fileInputRef.current.click();
                  }
                }}
                onCropImage={(blockId) => {
                  const block = blocks.find((b) => b.id === blockId);
                  if (block && block.block_type === "media") {
                    const mediaId = String(block.payload.media_id ?? "");
                    const asset = mediaAssets.find((a) => a.id === mediaId);
                    if (asset) {
                      setCroppingImageSrc(buildPublicMediaUrl(asset.storage_key));
                      setCroppingBlockId(blockId);
                    }
                  }
                }}
              />
              <InsertTrigger
                index={index + 1}
                onDragOver={(e) => handleGapDragOver(e, index + 1)}
                onDrop={(e) => onDropAt(e, index + 1)}
                isDragOver={dragOverIndex === index + 1}
              />
            </div>
          ))}
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* 图片裁剪模态框 */}
      {croppingImageSrc ? (
        <ImageCropper
          imageSrc={croppingImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setCroppingImageSrc(null);
            setCroppingBlockId(null);
          }}
        />
      ) : null}

      {/* embedded 模式：悬浮 ⊕ 添加按钮（右下角） */}
      {embedded ? (
        <div className="pointer-events-none fixed bottom-8 right-[348px] z-40 flex flex-col items-end gap-2">
          {showBlockMenu ? (
            <div
              className="pointer-events-auto mb-1 w-48 overflow-hidden rounded-xl border border-white/15 bg-[#141424]/95 shadow-2xl backdrop-blur-md"
              onMouseLeave={() => setShowBlockMenu(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setFileInputIntent({ mode: "upload" });
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*,video/*,application/pdf";
                    fileInputRef.current.multiple = true;
                    fileInputRef.current.click();
                  }
                  setShowBlockMenu(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <UploadCloud className="h-4 w-4 text-cyan" />
                上传图片/视频
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddTextBlock(blocks.length);
                  setShowBlockMenu(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <Type className="h-4 w-4 text-blue-400" />
                添加文本
              </button>
              <div className="my-1 border-t border-white/8" />
              {NEW_BLOCK_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      void handleAddBlock(opt.type, opt.payload, blocks.length);
                      setShowBlockMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-white/50" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowBlockMenu((v) => !v)}
            className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${
              showBlockMenu
                ? "rotate-45 bg-white text-black"
                : "bg-cyan text-black hover:bg-white hover:scale-105"
            }`}
            title="添加内容"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      {/* 右键菜单 */}
      {contextMenu ? (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-white/15 bg-[#1a1a2e]/95 py-1 shadow-2xl backdrop-blur-md"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 180),
              top: Math.min(contextMenu.y, window.innerHeight - 120),
            }}
          >
            <button
              type="button"
              onClick={() => moveBlockToFront(contextMenu.blockId)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              移到最前
            </button>
            <button
              type="button"
              onClick={() => moveBlockToEnd(contextMenu.blockId)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              移到最后
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

// ── 插入触发区域（拖拽定位）──────────────────────────────

function InsertTrigger({
  index,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  index: number;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      data-insert-index={index}
      className={`group relative transition-all ${isDragOver ? "h-10" : "h-4 hover:h-6"}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 transition-all ${
        isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-40"
      }`}>
        <div className="flex items-center gap-2 px-4">
          <div className={`h-0.5 flex-1 rounded-full transition-all ${isDragOver ? "bg-cyan h-1" : "bg-white/20"}`} />
          {isDragOver ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan/20">
              <div className="h-2 w-2 rounded-full bg-cyan" />
            </div>
          ) : null}
          <div className={`h-0.5 flex-1 rounded-full transition-all ${isDragOver ? "bg-cyan h-1" : "bg-white/20"}`} />
        </div>
      </div>
    </div>
  );
}

// ── 块卡片组件 ─────────────────────────────────────────────

function BlockCard({
  block,
  index,
  isEditing,
  isDragging: isDraggingProp,
  isDropTargetBefore,
  isDropTargetAfter,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onContextMenu,
  onDragOver,
  onDrop,
  mediaAssets,
  onUpdatePayload,
  onOptimisticUpdate,
  onSaveLayout,
  onSaveAndClose,
  onReplaceMedia,
  onAddImagesToGallery,
  onSelectBaFile,
  onCropImage,
}: {
  block: VisualBlock;
  index: number;
  isEditing: boolean;
  isDragging: boolean;
  isDropTargetBefore: boolean;
  isDropTargetAfter: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onOptimisticUpdate: (newPayload: Record<string, unknown>) => void;
  onSaveLayout: (newPayload: Record<string, unknown>) => void;
  onSaveAndClose: () => void;
  onReplaceMedia: (blockId: string) => void;
  onAddImagesToGallery: (blockId: string, files: File[]) => void;
  onSelectBaFile: (blockId: string, step: "before" | "after") => void;
  onCropImage: (blockId: string) => void;
}) {
  const blockTypeConfig = BLOCK_TYPE_META[block.block_type as keyof typeof BLOCK_TYPE_META];

  const layout = useMemo(() => getLayout(block.payload), [block.payload]);

  const layoutDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedUpdatePayload = useCallback(
    (_blockId: string, newPayload: Record<string, unknown>) => {
      if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current);
      layoutDebounceRef.current = setTimeout(() => {
        onSaveLayout(newPayload);
      }, 600);
    },
    [onSaveLayout],
  );

  useEffect(() => {
    return () => {
      if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current);
    };
  }, []);

  const showInlineEditor = isEditing && (
    block.block_type === "text" ||
    block.block_type === "media" ||
    block.block_type === "video" ||
    block.block_type === "pdf" ||
    block.block_type === "before_after" ||
    block.block_type === "code" ||
    block.block_type === "quote" ||
    block.block_type === "embed" ||
    block.block_type === "divider" ||
    block.block_type === "callout" ||
    block.block_type === "stats"
  );

  return (
    <div className="relative" onContextMenu={onContextMenu}>
      {/* 插入指示线 - 块之前 */}
      {isDropTargetBefore ? (
        <div className="absolute -top-1 left-0 right-0 z-10 flex items-center gap-2 px-2">
          <div className="h-1 flex-1 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <div className="h-2 w-2 rounded-full bg-cyan" />
          </div>
          <div className="h-1 flex-1 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
        </div>
      ) : null}

      <div
        data-block-index={index}
        className={`group relative rounded-lg border transition ${
          isDraggingProp
            ? "border-cyan/50 bg-cyan/5 opacity-40 scale-[0.98]"
            : isEditing
              ? "border-cyan/30 bg-white/[0.04]"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
        }`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* 操作栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          <div
            draggable
            onDragStart={(e) => {
              if (e.button !== 0) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData("block-id", block.id);
              e.dataTransfer.effectAllowed = "move";
              onDragStart(e);
            }}
            onDragEnd={onDragEnd}
            className="flex cursor-grab items-center rounded p-0.5 text-white/20 transition hover:bg-white/10 hover:text-white/60 active:cursor-grabbing"
            title="拖拽排序（右键可移到最前/最后）"
          >
            <GripHorizontal className="h-4 w-4" />
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${blockTypeConfig?.color ?? "text-white/50"}`}>
            {blockTypeConfig ? <blockTypeConfig.icon className="h-3.5 w-3.5" /> : null}
            {blockTypeConfig?.label ?? block.block_type}
          </span>
          <span className="text-[10px] text-white/20 font-mono">#{index + 1}</span>

          <div className="ml-auto flex items-center gap-1">
            {isEditing ? (
              <button
                type="button"
                onClick={onSaveAndClose}
                className="rounded p-1 text-cyan/70 transition hover:bg-cyan/10 hover:text-cyan"
                title="完成编辑"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 text-white/25 transition hover:bg-white/10 hover:text-white/70"
              title={isEditing ? "取消" : "编辑"}
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

      {/* 布局控制条（仅编辑模式） */}
      {isEditing ? (
        <LayoutBar
          blockType={block.block_type}
          layout={layout}
          onChange={(patch) => {
            const newPayload = withLayout(block.payload, patch);
            onOptimisticUpdate(newPayload);
            debouncedUpdatePayload(block.id, newPayload);
          }}
        />
      ) : null}
      {isEditing && layout.width === "free" && (block.block_type === "media" || block.block_type === "video") ? (
        <FreePositionPanel
          free={layout.free}
          onChange={(patch) => {
            const current = layout.free ?? { x: 0, y: 0, w: 50, h: 50 };
            const newPayload = withLayout(block.payload, { free: { ...current, ...patch } });
            onUpdatePayload(newPayload);
          }}
        />
      ) : null}

      {/* 内容区域 */}
      <div className="p-4">
        {showInlineEditor ? (
          <InlineBlockEditor
            block={block}
            mediaAssets={mediaAssets}
            onUpdatePayload={onUpdatePayload}
            onReplaceMedia={() => onReplaceMedia(block.id)}
            onAddImagesToGallery={(files) => onAddImagesToGallery(block.id, files)}
            onSelectBaFile={(step) => onSelectBaFile(block.id, step)}
            onCropImage={() => onCropImage(block.id)}
          />
        ) : (
          <BlockPreview block={block} mediaAssets={mediaAssets} />
        )}
      </div>
      </div>

      {/* 插入指示线 - 块之后 */}
      {isDropTargetAfter ? (
        <div className="absolute -bottom-1 left-0 right-0 z-10 flex items-center gap-2 px-2">
          <div className="h-1 flex-1 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <div className="h-2 w-2 rounded-full bg-cyan" />
          </div>
          <div className="h-1 flex-1 rounded-full bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
        </div>
      ) : null}
    </div>
  );
}

// ── 内联块编辑器（统一入口）───────────────────────────────

function InlineBlockEditor({
  block,
  mediaAssets,
  onUpdatePayload,
  onReplaceMedia,
  onAddImagesToGallery,
  onSelectBaFile,
  onCropImage,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onReplaceMedia: () => void;
  onAddImagesToGallery: (files: File[]) => void;
  onSelectBaFile: (step: "before" | "after") => void;
  onCropImage: () => void;
}) {
  if (block.block_type === "text") {
    return (
      <InlineTextEditor
        payload={block.payload}
        onUpdatePayload={onUpdatePayload}
      />
    );
  }

  if (block.block_type === "media" || block.block_type === "video" || block.block_type === "pdf") {
    return (
      <InlineMediaEditor
        block={block}
        mediaAssets={mediaAssets}
        onUpdatePayload={onUpdatePayload}
        onReplaceMedia={onReplaceMedia}
        onCropImage={onCropImage}
      />
    );
  }

  if (block.block_type === "before_after") {
    return (
      <InlineBeforeAfterEditor
        block={block}
        mediaAssets={mediaAssets}
        onUpdatePayload={onUpdatePayload}
        onSelectFile={onSelectBaFile}
      />
    );
  }

  if (block.block_type === "gallery") {
    return (
      <InlineGalleryEditor
        block={block}
        mediaAssets={mediaAssets}
        onUpdatePayload={onUpdatePayload}
        onAddImages={onAddImagesToGallery}
      />
    );
  }

  // 新增的 6 种块类型统一走通用内联编辑器
  if (
    block.block_type === "code" ||
    block.block_type === "quote" ||
    block.block_type === "embed" ||
    block.block_type === "divider" ||
    block.block_type === "callout" ||
    block.block_type === "stats"
  ) {
    return (
      <InlineContentBlockEditor
        block={block}
        onUpdatePayload={onUpdatePayload}
      />
    );
  }

  return <BlockPreview block={block} mediaAssets={mediaAssets} />;
}

// ── 内联文本编辑器 ─────────────────────────────────────────

function InlineTextEditor({
  payload,
  onUpdatePayload,
}: {
  payload: Record<string, unknown>;
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
}) {
  const [heading, setHeading] = useState(String(payload.heading ?? ""));
  const [body, setBody] = useState(String(payload.body ?? ""));

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payload, heading, body });
    }, 800);
    return () => clearTimeout(timer);
  }, [heading, body]);

  return (
    <div className="space-y-3">
      <input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        placeholder="标题"
        className="w-full border-b border-white/10 bg-transparent pb-2 text-base font-semibold text-white outline-none placeholder:text-white/20 focus:border-cyan/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="正文内容…"
        rows={5}
        className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] p-3 text-sm leading-relaxed text-white/80 outline-none placeholder:text-white/20 focus:border-cyan/40"
      />
    </div>
  );
}

// ── 内联媒体编辑器（单图/视频/PDF）────────────────────────

function InlineMediaEditor({
  block,
  mediaAssets,
  onUpdatePayload,
  onReplaceMedia,
  onCropImage,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onReplaceMedia: () => void;
  onCropImage: () => void;
}) {
  const payload = block.payload;
  const mediaId = String(payload.media_id ?? "");
  const asset = mediaAssets.find((a) => a.id === mediaId);
  const url = asset ? buildPublicMediaUrl(asset.storage_key) : null;
  const isImage = block.block_type === "media";

  const [caption, setCaption] = useState(String(payload.caption ?? ""));
  const initialFocal = payload.focal_point as { x?: number; y?: number } | undefined;
  const [focal, setFocal] = useState({
    x: initialFocal?.x ?? 50,
    y: initialFocal?.y ?? 50,
  });
  const [isDragging, setIsDragging] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const focalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadRef = useRef(payload);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payloadRef.current, caption });
    }, 600);
    return () => clearTimeout(timer);
  }, [caption, onUpdatePayload]);

  const updateFocalPayload = useCallback(
    (newFocal: { x: number; y: number }) => {
      if (focalDebounceRef.current) clearTimeout(focalDebounceRef.current);
      focalDebounceRef.current = setTimeout(() => {
        onUpdatePayload({ ...payloadRef.current, focal_point: newFocal });
      }, 400);
    },
    [onUpdatePayload],
  );

  const handleFocalMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setFocal({ x, y });
      updateFocalPayload({ x, y });
    },
    [updateFocalPayload],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isImage) return;
      setIsDragging(true);
      handleFocalMove(e.clientX, e.clientY);
    },
    [isImage, handleFocalMove],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleFocalMove(e.clientX, e.clientY);
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, handleFocalMove]);

  const resetFocal = useCallback(() => {
    setFocal({ x: 50, y: 50 });
    updateFocalPayload({ x: 50, y: 50 });
  }, [updateFocalPayload]);

  const hasCustomFocal =
    Math.abs(focal.x - 50) > 0.5 || Math.abs(focal.y - 50) > 0.5;

  return (
    <div className="space-y-3">
      {/* 媒体预览 */}
      <div className="relative group/media">
        <div
          ref={imageContainerRef}
          className={isImage && url ? "relative cursor-crosshair" : ""}
          onMouseDown={isImage && url ? handleMouseDown : undefined}
        >
          {url && isImage ? (
            <img
              src={url}
              alt={caption}
              className="max-h-80 w-full rounded-md object-cover"
              style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
              draggable={false}
            />
          ) : url && block.block_type === "video" ? (
            <video src={url} controls className="max-h-80 w-full rounded-md object-cover" />
          ) : asset ? (
            <div className="flex items-center gap-3 rounded-md bg-white/5 p-4">
              <FileText className="h-10 w-10 text-orange-400/60" />
              <div>
                <p className="text-sm text-white/80">{asset.original_name}</p>
                <p className="text-xs text-white/40">{(asset as MediaAsset & { byte_size?: number }).byte_size ? `${Math.round(((asset as MediaAsset & { byte_size: number }).byte_size as number) / 1024)} KB` : ""}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md bg-white/5 text-sm text-white/30">
              未选择媒体
            </div>
          )}

          {/* 焦点位置指示器 */}
          {isImage && url ? (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: `${focal.x}%`,
                top: `${focal.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                  isDragging
                    ? "border-cyan bg-cyan/30 scale-110"
                    : "border-white/80 bg-black/40"
                }`}
              >
                <Crosshair className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          ) : null}
        </div>

        {/* 操作按钮（悬浮在预览图上） */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover/media:opacity-100">
          {isImage ? (
            <>
              {hasCustomFocal ? (
                <button
                  type="button"
                  onClick={resetFocal}
                  className="rounded-md bg-black/60 p-2 text-white/70 transition hover:bg-black/80 hover:text-white"
                  title="重置位置"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onCropImage}
                className="rounded-md bg-black/60 p-2 text-white/70 transition hover:bg-black/80 hover:text-white"
                title="裁剪图片"
              >
                <Crop className="h-4 w-4" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onReplaceMedia}
            className="rounded-md bg-black/60 p-2 text-white/70 transition hover:bg-black/80 hover:text-white"
            title="更换媒体"
          >
            <Replace className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 焦点位置提示 */}
      {isImage && url ? (
        <p className="text-[10px] text-white/30">
          在图片上拖动可调整焦点位置（影响满宽裁剪时的可见区域）
          {hasCustomFocal ? ` · 当前 ${Math.round(focal.x)}% / ${Math.round(focal.y)}%` : ""}
        </p>
      ) : null}

      {/* 说明文字编辑 */}
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/30">
          说明文字
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="添加说明文字…"
          rows={2}
          className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] p-2 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-cyan/40"
        />
      </div>
    </div>
  );
}

// ── 内联图库编辑器 ─────────────────────────────────────────

function InlineGalleryEditor({
  block,
  mediaAssets,
  onUpdatePayload,
  onAddImages,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onAddImages: (files: File[]) => void;
}) {
  const payload = block.payload;
  const mediaIds = (payload.media_ids as string[]) ?? [];
  const refs = (payload.media_refs as { id: string; storage_key: string; mime_type: string; alt_text: string }[]) ?? [];
  const displayAssets = refs.length > 0 ? refs : mediaAssets.filter((a) => mediaIds.includes(a.id));

  const [caption, setCaption] = useState(String(payload.caption ?? ""));
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payload, caption });
    }, 600);
    return () => clearTimeout(timer);
  }, [caption]);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const nextIds = [...mediaIds];
    const nextRefs = [...refs];
    const [movedId] = nextIds.splice(from, 1);
    const [movedRef] = nextRefs.splice(from, 1);
    nextIds.splice(to, 0, movedId);
    nextRefs.splice(to, 0, movedRef);
    onUpdatePayload({ ...payload, media_ids: nextIds, media_refs: nextRefs });
  };

  const removeImage = (index: number) => {
    const nextIds = [...mediaIds];
    const nextRefs = [...refs];
    nextIds.splice(index, 1);
    nextRefs.splice(index, 1);
    onUpdatePayload({ ...payload, media_ids: nextIds, media_refs: nextRefs });
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
        图库 · {displayAssets.length} 张图片（拖拽图片可排序，悬停显示删除按钮）
      </p>
      <div className="grid grid-cols-3 gap-2">
        {displayAssets.map((asset: { id?: string; storage_key: string }, i: number) => (
          <div
            key={asset.id ?? i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragIndex;
              if (from === null) return;
              reorder(from, i);
              setDragIndex(null);
            }}
            className={`group relative aspect-square cursor-move overflow-hidden rounded-md border-2 ${
              dragIndex === i ? "border-cyan opacity-50" : "border-transparent hover:border-cyan/40"
            }`}
          >
            <img
              src={buildPublicMediaUrl(asset.storage_key)}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(i);
              }}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 opacity-0 transition hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
              title="删除此图片"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {/* 添加更多图片按钮 */}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/15 text-white/20 transition hover:border-cyan/30 hover:text-cyan/60">
          <ImagePlus className="h-6 w-6" />
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              await onAddImages(Array.from(files));
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="图库说明文字…"
        rows={2}
        className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] p-2 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-cyan/40"
      />
    </div>
  );
}

// ── 内联 Before/After 编辑器 ─────────────────────────────

function InlineBeforeAfterEditor({
  block,
  mediaAssets,
  onUpdatePayload,
  onSelectFile,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onSelectFile: (step: "before" | "after") => void;
}) {
  const payload = block.payload;
  const beforeId = String(payload.before_media_id ?? "");
  const afterId = String(payload.after_media_id ?? "");
  const beforeAsset = mediaAssets.find((a) => a.id === beforeId);
  const afterAsset = mediaAssets.find((a) => a.id === afterId);

  const [caption, setCaption] = useState(String(payload.caption ?? ""));

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payload, caption });
    }, 600);
    return () => clearTimeout(timer);
  }, [caption]);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Before / After 对比</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div>
          <p className="mb-1 text-[10px] text-white/30">Before</p>
          {beforeAsset ? (
            <div className="relative">
              <img
                src={buildPublicMediaUrl(beforeAsset.storage_key)}
                alt="Before"
                className="aspect-square w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectFile("before")}
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white/70 hover:text-white"
              >
                <Replace className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectFile("before")}
              className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed border-white/15 text-white/20 transition hover:border-cyan/30 hover:text-cyan/60"
            >
              <ImagePlus className="h-8 w-8" />
            </button>
          )}
        </div>
        {/* After */}
        <div>
          <p className="mb-1 text-[10px] text-white/30">After</p>
          {afterAsset ? (
            <div className="relative">
              <img
                src={buildPublicMediaUrl(afterAsset.storage_key)}
                alt="After"
                className="aspect-square w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectFile("after")}
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white/70 hover:text-white"
              >
                <Replace className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectFile("after")}
              className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed border-white/15 text-white/20 transition hover:border-cyan/30 hover:text-cyan/60"
            >
              <ImagePlus className="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="对比说明文字…"
        rows={2}
        className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] p-2 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-cyan/40"
      />
    </div>
  );
}

// ── 通用内联编辑器（code/quote/embed/divider/callout/stats）──

function InlineContentBlockEditor({
  block,
  onUpdatePayload,
}: {
  block: VisualBlock;
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
}) {
  const payload = block.payload;
  const [state, setState] = useState<Record<string, unknown>>(() => ({ ...payload }));

  // 防抖保存：state 变化后 800ms 触发
  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...state });
    }, 800);
    return () => clearTimeout(timer);
  }, [state]);

  /** 更新单个字段 */
  const update = (key: string, value: unknown) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // 通用样式
  const inputClass =
    "w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-cyan/40";
  const labelClass =
    "mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/30";

  if (block.block_type === "code") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>语言</label>
          <select
            value={String(state.language ?? "javascript")}
            onChange={(e) => update("language", e.target.value)}
            className={inputClass}
          >
            {["javascript", "typescript", "python", "css", "html", "json", "bash", "plaintext"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>代码</label>
          <textarea
            value={String(state.code ?? "")}
            onChange={(e) => update("code", e.target.value)}
            placeholder="输入代码…"
            rows={6}
            className={`resize-y font-mono ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>说明（可选）</label>
          <input
            value={String(state.caption ?? "")}
            onChange={(e) => update("caption", e.target.value)}
            placeholder="说明文字…"
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  if (block.block_type === "quote") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>引用内容</label>
          <textarea
            value={String(state.text ?? "")}
            onChange={(e) => update("text", e.target.value)}
            placeholder="引用内容…"
            rows={4}
            className={`resize-y ${inputClass}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>作者</label>
            <input
              value={String(state.author ?? "")}
              onChange={(e) => update("author", e.target.value)}
              placeholder="作者"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>职位（可选）</label>
            <input
              value={String(state.role ?? "")}
              onChange={(e) => update("role", e.target.value)}
              placeholder="职位"
              className={inputClass}
            />
          </div>
        </div>
      </div>
    );
  }

  if (block.block_type === "embed") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>嵌入类型</label>
          <select
            value={String(state.embedType ?? "youtube")}
            onChange={(e) => update("embedType", e.target.value)}
            className={inputClass}
          >
            {["youtube", "vimeo", "figma", "codepen", "generic"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>URL</label>
          <input
            value={String(state.url ?? "")}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>说明（可选）</label>
          <input
            value={String(state.caption ?? "")}
            onChange={(e) => update("caption", e.target.value)}
            placeholder="说明文字…"
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  if (block.block_type === "divider") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>样式</label>
          <select
            value={String(state.style ?? "solid")}
            onChange={(e) => update("style", e.target.value)}
            className={inputClass}
          >
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="dotted">点线</option>
          </select>
        </div>
      </div>
    );
  }

  if (block.block_type === "callout") {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>内容</label>
          <textarea
            value={String(state.text ?? "")}
            onChange={(e) => update("text", e.target.value)}
            placeholder="提示内容…"
            rows={3}
            className={`resize-y ${inputClass}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>图标</label>
            <select
              value={String(state.icon ?? "info")}
              onChange={(e) => update("icon", e.target.value)}
              className={inputClass}
            >
              <option value="info">信息</option>
              <option value="warning">警告</option>
              <option value="success">成功</option>
              <option value="tip">提示</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>色调</label>
            <select
              value={String(state.tone ?? "cyan")}
              onChange={(e) => update("tone", e.target.value)}
              className={inputClass}
            >
              <option value="cyan">青色</option>
              <option value="amber">琥珀</option>
              <option value="green">绿色</option>
              <option value="red">红色</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (block.block_type === "stats") {
    const items = (state.items as Array<{ value: string; label: string }>) ?? [];
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>标题</label>
          <input
            value={String(state.heading ?? "")}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="标题"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>数据项</label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item.value}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], value: e.target.value };
                    update("items", next);
                  }}
                  placeholder="数值"
                  className={`${inputClass} w-24`}
                />
                <input
                  value={item.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], label: e.target.value };
                    update("items", next);
                  }}
                  placeholder="标签"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => update("items", items.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded p-1 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update("items", [...items, { value: "", label: "" }])}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-3 py-1.5 text-xs text-white/40 transition hover:border-cyan/30 hover:text-cyan/60"
            >
              <Plus className="h-3.5 w-3.5" />
              添加数据项
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── 块内容预览 ─────────────────────────────────────────────

function BlockPreview({
  block,
  mediaAssets,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
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
    const layout = getLayout(payload);
    const freeStyle = layout.width === "free" && layout.free
      ? {
          position: "absolute" as const,
          left: `${layout.free.x}%`,
          top: `${layout.free.y}%`,
          width: `${layout.free.w}%`,
          height: `${layout.free.h}%`,
        }
      : undefined;
    return (
      <div className={freeStyle ? "relative h-64 w-full rounded-md border border-white/10" : undefined}>
        {url ? (
          <img
            src={url}
            alt={String(payload.caption ?? "")}
            className={freeStyle ? "rounded-md object-contain" : "max-h-64 rounded-md object-cover"}
            style={freeStyle}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md bg-white/5 text-sm text-white/30">未选择媒体</div>
        )}
        {payload.caption && !freeStyle ? <p className="mt-2 text-sm text-white/50">{String(payload.caption)}</p> : null}
      </div>
    );
  }

  if (block.block_type === "gallery") {
    const mediaIds = (payload.media_ids as string[]) ?? [];
    const refs = (payload.media_refs as { id: string; storage_key: string }[]) ?? [];
    const displayAssets = refs.length > 0 ? refs : mediaAssets.filter((a) => mediaIds.includes(a.id));
    return (
      <div className="grid grid-cols-3 gap-2">
        {displayAssets.map((asset: { storage_key: string }, i: number) => (
          <img key={i} src={buildPublicMediaUrl(asset.storage_key)} alt="" className="aspect-square rounded-md object-cover" />
        ))}
      </div>
    );
  }

  if (block.block_type === "video") {
    const mediaId = String(payload.media_id ?? "");
    const asset = mediaAssets.find((a) => a.id === mediaId);
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
    const beforeId = String(payload.before_media_id ?? "");
    const afterId = String(payload.after_media_id ?? "");
    const beforeAsset = mediaAssets.find((a) => a.id === beforeId);
    const afterAsset = mediaAssets.find((a) => a.id === afterId);
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] text-white/30">Before</p>
          {beforeAsset ? (
            <img src={buildPublicMediaUrl(beforeAsset.storage_key)} alt="Before" className="aspect-square w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-md bg-white/5 text-xs text-white/20">未选择</div>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] text-white/30">After</p>
          {afterAsset ? (
            <img src={buildPublicMediaUrl(afterAsset.storage_key)} alt="After" className="aspect-square w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-md bg-white/5 text-xs text-white/20">未选择</div>
          )}
        </div>
      </div>
    );
  }

  if (block.block_type === "code") {
    return (
      <div className="space-y-2">
        {payload.heading ? (
          <h4 className="text-base font-semibold text-white/90">{String(payload.heading)}</h4>
        ) : null}
        <div className="relative overflow-hidden rounded-md border border-white/10 bg-black/40">
          <span className="absolute right-2 top-1 font-mono text-[10px] uppercase text-white/40">
            {String(payload.language ?? "")}
          </span>
          <pre className="overflow-x-auto p-3 pr-16 font-mono text-xs text-green-300/90">
            <code>{String(payload.code ?? "")}</code>
          </pre>
        </div>
        {payload.caption ? (
          <p className="text-sm text-white/50">{String(payload.caption)}</p>
        ) : null}
      </div>
    );
  }

  if (block.block_type === "quote") {
    return (
      <div className="space-y-2">
        {payload.heading ? (
          <h4 className="text-base font-semibold text-white/90">{String(payload.heading)}</h4>
        ) : null}
        <blockquote className="border-l-2 border-copper pl-4">
          <p className="text-sm leading-relaxed text-white/70">
            {String(payload.text ?? "")}
          </p>
          <footer className="mt-1 text-xs">
            <span className="font-medium text-copper">{String(payload.author ?? "")}</span>
            {payload.role ? (
              <span className="text-white/45"> · {String(payload.role)}</span>
            ) : null}
          </footer>
        </blockquote>
      </div>
    );
  }

  if (block.block_type === "embed") {
    return (
      <div className="space-y-2">
        {payload.heading ? (
          <h4 className="text-base font-semibold text-white/90">{String(payload.heading)}</h4>
        ) : null}
        <div className="flex items-center gap-2 rounded-md bg-white/5 p-3">
          <Frame className="h-5 w-5 text-cyan/60" />
          <span className="truncate text-sm text-white/60">
            {String(payload.embedType ?? "")}: {String(payload.url ?? "")}
          </span>
        </div>
      </div>
    );
  }

  if (block.block_type === "divider") {
    const style = String(payload.style ?? "solid");
    const borderClass =
      style === "dashed" ? "border-dashed" : style === "dotted" ? "border-dotted" : "border-solid";
    return <hr className={`border-t border-white/15 ${borderClass}`} />;
  }

  if (block.block_type === "callout") {
    const tone = String(payload.tone ?? "cyan");
    const toneClass =
      tone === "amber"
        ? "border-amber-400/30 bg-amber-400/5"
        : tone === "green"
          ? "border-green-400/30 bg-green-400/5"
          : tone === "red"
            ? "border-red-400/30 bg-red-400/5"
            : "border-cyan/30 bg-cyan/5";
    return (
      <div className={`rounded-md border p-3 ${toneClass}`}>
        {payload.heading ? (
          <p className="font-semibold text-white/90">{String(payload.heading)}</p>
        ) : null}
        <p className="text-sm text-white/60">{String(payload.text ?? "")}</p>
      </div>
    );
  }

  if (block.block_type === "stats") {
    const items = (payload.items as Array<{ value: string; label: string }>) ?? [];
    return (
      <div className="space-y-2">
        {payload.heading ? (
          <h4 className="text-base font-semibold text-white/90">{String(payload.heading)}</h4>
        ) : null}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-md border border-white/10 bg-white/[0.035] p-2 text-center"
            >
              <p className="text-xl font-semibold text-copper">{item.value}</p>
              <p className="text-xs text-white/50">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div className="text-sm text-white/30">未知块类型: {block.block_type}</div>;
}
