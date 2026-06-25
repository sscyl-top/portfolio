"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

type ResizableTwoPanelsProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey: string;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
};

export function ResizableTwoPanels({
  left,
  right,
  storageKey,
  defaultLeftWidth = 240,
  minLeftWidth = 160,
  maxLeftWidth = 800,
  minRightWidth = 200,
  className = "",
  leftClassName = "",
  rightClassName = "",
}: ResizableTwoPanelsProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const leftWidthRef = useRef(defaultLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(defaultLeftWidth);

  useEffect(() => {
    leftWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const w = parseInt(saved, 10);
        if (!isNaN(w) && w >= minLeftWidth && w <= maxLeftWidth) {
          setLeftWidth(w);
          leftWidthRef.current = w;
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, minLeftWidth, maxLeftWidth]);

  const persistWidth = useCallback(
    (w: number) => {
      try {
        localStorage.setItem(storageKey, String(w));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartXRef.current;
      let nextWidth = dragStartWidthRef.current + delta;
      nextWidth = Math.min(maxLeftWidth, Math.max(minLeftWidth, nextWidth));

      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxAllowed = containerWidth - minRightWidth - 4;
        nextWidth = Math.min(nextWidth, maxAllowed);
      }

      leftWidthRef.current = nextWidth;
      setLeftWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      persistWidth(leftWidthRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.style.pointerEvents = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };
  }, [isDragging, minLeftWidth, maxLeftWidth, minRightWidth, persistWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = leftWidthRef.current;
    setIsDragging(true);
  }, []);

  return (
    <div ref={containerRef} className={`flex h-full w-full flex-row ${className}`}>
      <div
        style={{ width: leftWidth }}
        className={`shrink-0 ${leftClassName}`}
      >
        {left}
      </div>

      <div
        onMouseDown={handleMouseDown}
        className={`group relative z-20 flex h-full w-1 shrink-0 cursor-col-resize items-center justify-center border-r border-white/10 transition-colors ${
          isDragging
            ? "bg-cyan/30 border-r-cyan/50"
            : "bg-transparent hover:bg-cyan/20 hover:border-r-cyan/40"
        }`}
        title="拖拽调整宽度"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
        <GripVertical
          className={`pointer-events-none h-5 w-5 text-white/20 transition-opacity ${
            isDragging
              ? "text-cyan/80 opacity-100"
              : "opacity-0 group-hover:opacity-100 group-hover:text-cyan/60"
          }`}
        />
      </div>

      <div className={`min-w-0 flex-1 ${rightClassName}`}>
        {right}
      </div>
    </div>
  );
}
