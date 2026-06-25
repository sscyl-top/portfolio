"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type DragState = {
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  moved: boolean;
};

const STORAGE_KEY = "admin_works_fab_pos";
const EDGE_MARGIN = 20;
const FAB_SIZE = 56;

function loadSavedPosition(): { left: number; top: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.left === "number" && typeof parsed.top === "number") {
      return { left: parsed.left, top: parsed.top };
    }
  } catch {}
  return null;
}

function clampPosition(left: number, top: number) {
  const maxLeft = window.innerWidth - FAB_SIZE - EDGE_MARGIN;
  const maxTop = window.innerHeight - FAB_SIZE - EDGE_MARGIN;
  return {
    left: Math.max(EDGE_MARGIN, Math.min(maxLeft, left)),
    top: Math.max(EDGE_MARGIN + 60, Math.min(maxTop, top)),
  };
}

function getDefaultPosition() {
  const right = EDGE_MARGIN + 12;
  const bottom = EDGE_MARGIN + 80;
  return {
    left: window.innerWidth - FAB_SIZE - right,
    top: window.innerHeight - FAB_SIZE - bottom,
  };
}

export function DraggableAddFab({
  formId,
  label = "上传新作品",
}: {
  formId: string;
  label?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const saved = loadSavedPosition();
    const initial = saved ? clampPosition(saved.left, saved.top) : getDefaultPosition();
    setPos(initial);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onResize = () => {
      setPos((p) => (p ? clampPosition(p.left, p.top) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    const btn = btnRef.current;
    if (!btn) return;
    btn.setPointerCapture(e.pointerId);
    suppressClickRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: pos.left,
      originTop: pos.top,
      moved: false,
    };
  }, [pos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.moved = true;
    }
    const next = clampPosition(drag.originLeft + dx, drag.originTop + dy);
    setPos(next);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    const drag = dragRef.current;
    if (btn && btn.hasPointerCapture(e.pointerId)) {
      btn.releasePointerCapture(e.pointerId);
    }
    if (drag) {
      if (drag.moved) {
        suppressClickRef.current = true;
        if (pos) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
          } catch {}
        }
      }
      dragRef.current = null;
    }
  }, [pos]);

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const form = document.getElementById(formId) as HTMLFormElement | null;
    form?.requestSubmit();
  }, [formId]);

  if (!pos) return null;

  return (
    <button
      ref={btnRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={handleClick}
      title={`${label}（按住拖动位置）`}
      aria-label={label}
      className="fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-cyan text-black shadow-[0_6px_20px_rgba(139,215,205,0.35)] transition-[transform,box-shadow] duration-150 hover:scale-105 hover:bg-white hover:shadow-[0_8px_28px_rgba(139,215,205,0.5)] active:cursor-grabbing active:scale-95 select-none touch-none"
      style={{ left: pos.left, top: pos.top }}
    >
      <Plus className="h-6 w-6 stroke-[2.5]" strokeLinecap="round" />
    </button>
  );
}
