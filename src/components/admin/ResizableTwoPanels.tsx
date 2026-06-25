"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

type ResizableTwoPanelsProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey: string;
  /** Which panel has a controlled pixel width; the other fills remaining space. */
  fixedPanel?: "left" | "right";
  defaultFixedWidth?: number;
  minFixedWidth?: number;
  maxFixedWidth?: number;
  /** Minimum width for the flexible panel (in px). */
  minFlexWidth?: number;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
};

export function ResizableTwoPanels({
  left,
  right,
  storageKey,
  fixedPanel = "left",
  defaultFixedWidth = 240,
  minFixedWidth = 160,
  maxFixedWidth = 800,
  minFlexWidth = 200,
  className = "",
  leftClassName = "",
  rightClassName = "",
}: ResizableTwoPanelsProps) {
  const [fixedWidth, setFixedWidth] = useState(defaultFixedWidth);
  const [isDragging, setIsDragging] = useState(false);
  const fixedWidthRef = useRef(defaultFixedWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(defaultFixedWidth);

  useEffect(() => {
    fixedWidthRef.current = fixedWidth;
  }, [fixedWidth]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const w = parseInt(saved, 10);
        if (!isNaN(w) && w >= minFixedWidth && w <= maxFixedWidth) {
          setFixedWidth(w);
          fixedWidthRef.current = w;
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, minFixedWidth, maxFixedWidth]);

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
      const delta =
        fixedPanel === "left"
          ? e.clientX - dragStartXRef.current
          : dragStartXRef.current - e.clientX;
      let nextWidth = dragStartWidthRef.current + delta;
      nextWidth = Math.min(maxFixedWidth, Math.max(minFixedWidth, nextWidth));

      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxAllowed = containerWidth - minFlexWidth - 4;
        nextWidth = Math.min(nextWidth, maxAllowed);
      }

      fixedWidthRef.current = nextWidth;
      setFixedWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      persistWidth(fixedWidthRef.current);
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
  }, [isDragging, fixedPanel, minFixedWidth, maxFixedWidth, minFlexWidth, persistWidth]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = fixedWidthRef.current;
      setIsDragging(true);
    },
    [],
  );

  const fixedStyle = { width: fixedWidth };
  const fixedIsLeft = fixedPanel === "left";

  return (
    <div ref={containerRef} className={`flex h-full w-full flex-row ${className}`}>
      {fixedIsLeft ? (
        <>
          <div
            style={fixedStyle}
            className={`shrink-0 ${leftClassName}`}
          >
            {left}
          </div>
          <ResizerHandle isDragging={isDragging} onMouseDown={handleMouseDown} />
          <div className={`min-w-0 flex-1 ${rightClassName}`}>{right}</div>
        </>
      ) : (
        <>
          <div className={`min-w-0 flex-1 ${leftClassName}`}>{left}</div>
          <ResizerHandle isDragging={isDragging} onMouseDown={handleMouseDown} />
          <div
            style={fixedStyle}
            className={`shrink-0 ${rightClassName}`}
          >
            {right}
          </div>
        </>
      )}
    </div>
  );
}

function ResizerHandle({
  isDragging,
  onMouseDown,
}: {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
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
  );
}
