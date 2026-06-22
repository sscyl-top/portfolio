"use client";

import { useCallback, useState, useRef } from "react";
import { GripVertical } from "lucide-react";
import { reorderWorkBlocks } from "../actions";

type BlockItem = {
  id: string;
};

export function BlockListWrapper({
  blocks,
  workId,
  workSlug,
  renderBlock,
}: {
  blocks: BlockItem[];
  workId: string;
  workSlug: string;
  renderBlock: (id: string) => React.ReactNode;
}) {
  const [orderedIds, setOrderedIds] = useState(blocks.map((b) => b.id));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Reset when blocks change from server
  const prevBlocksRef = useRef(blocks);
  if (prevBlocksRef.current !== blocks) {
    prevBlocksRef.current = blocks;
    if (blocks.map((b) => b.id).join() !== orderedIds.join()) {
      setOrderedIds(blocks.map((b) => b.id));
    }
  }

  const handleReorder = useCallback(
    async (newOrder: string[]) => {
      setOrderedIds(newOrder);
      reorderWorkBlocks(workId, workSlug, newOrder).catch(() => {
        setOrderedIds(blocks.map((b) => b.id));
      });
    },
    [blocks, workId, workSlug],
  );

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) {
      setOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      handleDragEnd();
      return;
    }
    const newOrder = [...orderedIds];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    handleReorder(newOrder);
    handleDragEnd();
  };

  const makeHandle = (index: number) => (
    <button
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragEnd={handleDragEnd}
      className="mr-1 cursor-grab rounded p-1 text-white/25 transition hover:text-white/60 active:cursor-grabbing"
      aria-label="拖拽排序"
      title="拖拽排序"
    >
      <GripVertical aria-hidden="true" className="h-4 w-4" />
    </button>
  );

  return (
    <div className="grid gap-4">
      {orderedIds.map((id, index) => {
        const isDragging = dragIndex === index;
        const isOver = overIndex === index;

        return (
          <div
            key={id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-start gap-1 transition-opacity ${
              isDragging ? "opacity-40" : ""
            } ${isOver ? "rounded-lg ring-2 ring-cyan/40 ring-offset-2 ring-offset-[#07090b]" : ""}`}
          >
            <div className="pt-5">{makeHandle(index)}</div>
            <div className="flex-1 min-w-0">{renderBlock(id)}</div>
          </div>
        );
      })}
    </div>
  );
}
