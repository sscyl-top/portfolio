"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GripHorizontal,
  Image as ImageIcon,
  Video,
  FileText,
  Type,
  Columns2,
  X,
  UploadCloud,
  Trash2,
  Pencil,
  Check,
  Replace,
  ImagePlus,
  Crop,
  Images,
  Layers,
} from "lucide-react";
import {
  reorderWorkBlocks,
  createBlockDirect,
  deleteBlockDirect,
  updateBlockDirect,
  updateBlockMediaRef,
} from "@/app/admin/(protected)/works/actions";
import { uploadMediaFiles, uploadMediaBlob } from "@/lib/cms/upload-media";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
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
};

// ── 块类型配置（仅用于图标/标签显示）────────────────────

const BLOCK_TYPE_META = {
  text:        { label: "文本",   icon: Type,        color: "text-blue-400"   },
  media:       { label: "图片",   icon: ImageIcon,   color: "text-green-400"  },
  gallery:     { label: "图库",   icon: Columns2,    color: "text-purple-400" },
  video:       { label: "视频",   icon: Video,       color: "text-red-400"    },
  pdf:         { label: "PDF",    icon: FileText,    color: "text-orange-400" },
  before_after: { label: "对比",  icon: Columns2,    color: "text-yellow-400" },
} as const;

// ── 主组件 ─────────────────────────────────────────────────

export function VisualBlockEditor({ workId, workSlug, initialBlocks, mediaAssets }: Props) {
  const [blocks, setBlocks] = useState<VisualBlock[]>(
    () => [...initialBlocks].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

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

  useEffect(() => {
    setBlocks([...initialBlocks].sort((a, b) => a.sort_order - b.sort_order));
  }, [initialBlocks]);

  // ── 持久化顺序 ───────────────────────────────────────────

  const persistOrder = useCallback(
    (newBlocks: VisualBlock[]) => {
      startTransition(() => {
        void reorderWorkBlocks(
          workId,
          workSlug,
          newBlocks.map((b) => b.id),
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
      try {
        const results = await uploadMediaFiles(files, (progress) => {
          setUploadProgress(progress);
        });

        const newBlocks: VisualBlock[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const blockType = getBlockTypeFromFile(files[i]);
          const payload: Record<string, unknown> = {
            media_id: result.id,
            caption: "",
          };

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

        setBlocks((prev) => {
          const updated = [...prev];
          updated.forEach((b) => {
            if (b.sort_order >= insertAt) b.sort_order += results.length;
          });
          const merged = [...updated, ...newBlocks].sort((a, b) => a.sort_order - b.sort_order);
          merged.forEach((b, i) => { b.sort_order = i; });
          return merged;
        });

        persistOrder(newBlocks);
        router.refresh();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
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

        setBlocks((prev) => {
          const updated = [...prev];
          updated.forEach((b) => {
            if (b.sort_order >= insertAt) b.sort_order += 1;
          });
          return [...updated, newBlock].sort((a, b) => a.sort_order - b.sort_order);
        });

        router.refresh();
      } catch (err) {
        console.error("Create gallery failed:", err);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [workId, workSlug, router],
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

  // ── 拖拽文件事件 ─────────────────────────────────────────

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

  // 全局拖拽检测（拖入窗口时显示覆盖层）
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) setIsDraggingFile(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      // 只有当鼠标离开窗口时才关闭
      if (!e.relatedTarget || e.relatedTarget === document.body) {
        setIsDraggingFile(false);
      }
    };
    const handleDrop = () => {
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

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setDragOverIndex(index);
  }, []);

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

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <section className="mt-6" ref={containerRef}>
      {/* 标题栏 + 操作按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">内容编辑</h3>
          <p className="mt-1 text-sm text-white/45">
            拖拽文件到任意位置插入；或点击「上传文件」批量添加
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 上传文件按钮 */}
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
          {/* 添加文本按钮 */}
          <button
            type="button"
            onClick={() => handleAddTextBlock(blocks.length)}
            className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            <Type className="h-4 w-4" />
            添加文本
          </button>
        </div>
      </div>

      {/* 文件拖拽覆盖层 */}
      {isDraggingFile ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="pointer-events-auto rounded-2xl border-2 border-dashed border-cyan bg-cyan/5 px-12 py-10 text-center">
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
        <div
          className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 text-center"
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
          onDrop={(e) => onDropAt(e, 0)}
        >
          <UploadCloud className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-base text-white/40">暂无内容块</p>
          <p className="mt-2 text-sm text-white/25">
            拖拽文件到此处，或点击「上传文件」开始创作
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          <InsertTrigger
            index={0}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
            onDrop={(e) => onDropAt(e, 0)}
            isDragOver={dragOverIndex === 0}
          />

          {blocks.map((block, index) => (
            <div key={block.id}>
              <BlockCard
                block={block}
                index={index}
                isEditing={editingBlockId === block.id}
                onEdit={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                onDelete={() => handleDeleteBlock(block.id)}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={(e) => onDropAt(e, index)}
                dragOverIndex={dragOverIndex}
                mediaAssets={mediaAssets}
                onUpdatePayload={(newPayload) => handleUpdateBlock(block.id, newPayload, block.block_type)}
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
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index + 1); }}
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
      className={`group relative h-3 transition-all ${isDragOver ? "h-8" : "hover:h-8"}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragOver ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-1 flex-1 rounded-full bg-cyan/60 mx-8" />
        </div>
      ) : null}
    </div>
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
  onUpdatePayload,
  onSaveAndClose,
  onReplaceMedia,
  onSelectBaFile,
  onCropImage,
}: {
  block: VisualBlock;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOverIndex: number | null;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onSaveAndClose: () => void;
  onReplaceMedia: (blockId: string) => void;
  onSelectBaFile: (blockId: string, step: "before" | "after") => void;
  onCropImage: (blockId: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const blockTypeConfig = BLOCK_TYPE_META[block.block_type as keyof typeof BLOCK_TYPE_META];

  // 判断编辑模式下显示什么
  const showInlineEditor = isEditing && (
    block.block_type === "text" ||
    block.block_type === "media" ||
    block.block_type === "video" ||
    block.block_type === "pdf" ||
    block.block_type === "before_after"
  );

  return (
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
      {/* 操作栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <GripHorizontal className="h-4 w-4 cursor-grab text-white/20 transition hover:text-white/50" />
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

      {/* 内容区域 */}
      <div className="p-4">
        {showInlineEditor ? (
          <InlineBlockEditor
            block={block}
            mediaAssets={mediaAssets}
            onUpdatePayload={onUpdatePayload}
            onReplaceMedia={() => onReplaceMedia(block.id)}
            onSelectBaFile={(step) => onSelectBaFile(block.id, step)}
            onCropImage={() => onCropImage(block.id)}
          />
        ) : (
          <BlockPreview block={block} mediaAssets={mediaAssets} />
        )}
      </div>
    </div>
  );
}

// ── 内联块编辑器（统一入口）───────────────────────────────

function InlineBlockEditor({
  block,
  mediaAssets,
  onUpdatePayload,
  onReplaceMedia,
  onSelectBaFile,
  onCropImage,
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
  onReplaceMedia: () => void;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payload, caption });
    }, 600);
    return () => clearTimeout(timer);
  }, [caption]);

  return (
    <div className="space-y-3">
      {/* 媒体预览 */}
      <div className="relative group/media">
        {url && isImage ? (
          <img
            src={url}
            alt={caption}
            className="max-h-80 w-full rounded-md object-cover"
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

        {/* 操作按钮（悬浮在预览图上） */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover/media:opacity-100">
          {isImage ? (
            <button
              type="button"
              onClick={onCropImage}
              className="rounded-md bg-black/60 p-2 text-white/70 transition hover:bg-black/80 hover:text-white"
              title="裁剪图片"
            >
              <Crop className="h-4 w-4" />
            </button>
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
}: {
  block: VisualBlock;
  mediaAssets: MediaAsset[];
  onUpdatePayload: (newPayload: Record<string, unknown>) => void;
}) {
  const payload = block.payload;
  const mediaIds = (payload.media_ids as string[]) ?? [];
  const refs = (payload.media_refs as { id: string; storage_key: string; mime_type: string; alt_text: string }[]) ?? [];
  const displayAssets = refs.length > 0 ? refs : mediaAssets.filter((a) => mediaIds.includes(a.id));

  const [caption, setCaption] = useState(String(payload.caption ?? ""));

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdatePayload({ ...payload, caption });
    }, 600);
    return () => clearTimeout(timer);
  }, [caption]);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
        图库 · {displayAssets.length} 张图片
      </p>
      <div className="grid grid-cols-3 gap-2">
        {displayAssets.map((asset: { id?: string; storage_key: string }, i: number) => (
          <img
            key={asset.id ?? i}
            src={buildPublicMediaUrl(asset.storage_key)}
            alt=""
            className="aspect-square rounded-md object-cover"
          />
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
              // TODO: 上传并追加到图库块
              console.log("Add more images to gallery", e.target.files);
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
    return (
      <div>
        {url ? (
          <img src={url} alt={String(payload.caption ?? "")} className="max-h-64 rounded-md object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md bg-white/5 text-sm text-white/30">未选择媒体</div>
        )}
        {payload.caption ? <p className="mt-2 text-sm text-white/50">{String(payload.caption)}</p> : null}
      </div>
    );
  }

  if (block.block_type === "gallery") {
    const mediaIds = (payload.media_ids as string[]) ?? [];
    const refs = (payload.media_refs as { id: string; storage_key: string }[]) ?? [];
    const displayAssets = refs.length > 0 ? refs : mediaAssets.filter((a) => mediaIds.includes(a.id));
    return (
      <div className="grid grid-cols-3 gap-2">
        {displayAssets.slice(0, 6).map((asset: { storage_key: string }, i: number) => (
          <img key={i} src={buildPublicMediaUrl(asset.storage_key)} alt="" className="aspect-square rounded-md object-cover" />
        ))}
        {mediaIds.length > 6 ? (
          <div className="flex items-center justify-center rounded-md bg-white/5 text-xs text-white/30">+{mediaIds.length - 6}</div>
        ) : null}
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

  return <div className="text-sm text-white/30">未知块类型: {block.block_type}</div>;
}
