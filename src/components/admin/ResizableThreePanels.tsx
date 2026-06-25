"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

type ResizableThreePanelsProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  storageKeyPrefix?: string;
  defaultLeftWidth?: number;
  defaultCenterWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minCenterWidth?: number;
  maxCenterWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  className?: string;
  leftClassName?: string;
  centerClassName?: string;
  rightClassName?: string;
};

function loadWidth(key: string, fallback: number, min: number, max: number): number {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const w = parseInt(saved, 10);
      if (!isNaN(w) && w >= min && w <= max) return w;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function saveWidth(key: string, w: number) {
  try {
    localStorage.setItem(key, String(w));
  } catch {
    // ignore
  }
}

export function ResizableThreePanels({
  left,
  center,
  right,
  storageKeyPrefix = "admin-panels",
  defaultLeftWidth = 240,
  defaultCenterWidth = 1420,
  defaultRightWidth = 340,
  minLeftWidth = 180,
  maxLeftWidth = 400,
  minCenterWidth = 600,
  maxCenterWidth = 3000,
  minRightWidth = 260,
  maxRightWidth = 600,
  className = "",
  leftClassName = "",
  centerClassName = "",
  rightClassName = "",
}: ResizableThreePanelsProps) {
  const leftKey = `${storageKeyPrefix}-left`;
  const centerKey = `${storageKeyPrefix}-center`;
  const rightKey = `${storageKeyPrefix}-right`;

  const hasRightPanel = !!right;

  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [centerWidth, setCenterWidth] = useState(defaultCenterWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);

  const widthsRef = useRef({ left: defaultLeftWidth, center: defaultCenterWidth, right: defaultRightWidth });
  const dragRef = useRef({ startX: 0, startLeft: 0, startCenter: 0, startRight: 0 });

  useEffect(() => {
    setLeftWidth(loadWidth(leftKey, defaultLeftWidth, minLeftWidth, maxLeftWidth));
    setCenterWidth(loadWidth(centerKey, defaultCenterWidth, minCenterWidth, maxCenterWidth));
    setRightWidth(loadWidth(rightKey, defaultRightWidth, minRightWidth, maxRightWidth));
  }, []);

  useEffect(() => {
    widthsRef.current = { left: leftWidth, center: centerWidth, right: rightWidth };
  }, [leftWidth, centerWidth, rightWidth]);

  const startDrag = useCallback(
    (which: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const w = widthsRef.current;
      dragRef.current = {
        startX: e.clientX,
        startLeft: w.left,
        startCenter: w.center,
        startRight: w.right,
      };
      setDragging(which);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragRef.current.startX;
      const w = widthsRef.current;

      if (dragging === "left") {
        const next = Math.min(maxLeftWidth, Math.max(minLeftWidth, dragRef.current.startLeft + delta));
        setLeftWidth(next);
      } else if (dragging === "right") {
        const next = Math.min(maxRightWidth, Math.max(minRightWidth, dragRef.current.startRight - delta));
        setRightWidth(next);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      const w = widthsRef.current;
      saveWidth(leftKey, w.left);
      saveWidth(centerKey, w.center);
      saveWidth(rightKey, w.right);
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
  }, [dragging, leftKey, centerKey, rightKey, minLeftWidth, maxLeftWidth, minCenterWidth, maxCenterWidth, minRightWidth, maxRightWidth]);

  return (
    <div className={`flex h-full w-full flex-row overflow-x-auto overflow-y-hidden ${className}`}>
      {/* Left panel */}
      <div
        style={{ width: leftWidth }}
        className={`shrink-0 h-full ${leftClassName}`}
      >
        {left}
      </div>

      {/* Left resize handle (between left and center) */}
      <ResizerHandle isDragging={dragging === "left"} onMouseDown={startDrag("left")} />

      {/* Center panel */}
      <div
        style={{ width: centerWidth }}
        className={`shrink-0 h-full ${centerClassName}`}
      >
        {center}
      </div>

      {/* Right resize handle + right panel */}
      {hasRightPanel ? (
        <>
          <ResizerHandle isDragging={dragging === "right"} onMouseDown={startDrag("right")} />
          <div
            style={{ width: rightWidth }}
            className={`shrink-0 h-full ${rightClassName}`}
          >
            {right}
          </div>
        </>
      ) : null}
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
