"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

const HANDLE_WIDTH = 6;

type ResizablePanelConfig = {
  id: string;
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  className?: string;
  children: React.ReactNode;
};

type ResizablePanelsProps = {
  panels: ResizablePanelConfig[];
  after?: React.ReactNode;
  className?: string;
  afterClassName?: string;
  fillerClassName?: string;
};

type DragState = {
  panelId: string;
  startX: number;
  startWidth: number;
};

export function ResizablePanels({
  panels,
  after,
  className = "",
  afterClassName = "",
  fillerClassName = "",
}: ResizablePanelsProps) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(panels.map((panel) => [panel.id, panel.defaultWidth])),
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingPanelId, setDraggingPanelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef(widths);

  const panelSignature = panels
    .map((panel) =>
      [
        panel.id,
        panel.storageKey,
        panel.defaultWidth,
        panel.minWidth,
        panel.maxWidth,
      ].join(":"),
    )
    .join("|");

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    setWidths((current) => {
      let changed = false;
      const next = { ...current };

      for (const panel of panels) {
        let width = panel.defaultWidth;

        try {
          const saved = localStorage.getItem(panel.storageKey);
          const parsed = saved ? Number.parseInt(saved, 10) : NaN;
          if (!Number.isNaN(parsed)) width = parsed;
        } catch {
          // Ignore storage failures; dragging still works for the session.
        }

        width = clamp(width, panel.minWidth, panel.maxWidth);

        if (next[panel.id] !== width) {
          next[panel.id] = width;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [panels, panelSignature]);

  const getClampedWidth = useCallback(
    (panel: ResizablePanelConfig, requestedWidth: number) => {
      let maxWidth = panel.maxWidth;

      if (containerRef.current) {
        const otherMinWidth = panels.reduce((sum, item) => {
          if (item.id === panel.id) return sum;
          return sum + item.minWidth;
        }, 0);
        const handleSpace = Math.max(0, panels.length - 1) * HANDLE_WIDTH;
        const available = containerRef.current.offsetWidth - otherMinWidth - handleSpace;
        maxWidth = Math.min(maxWidth, Math.max(panel.minWidth, available));
      }

      return Math.round(clamp(requestedWidth, panel.minWidth, maxWidth));
    },
    [panels],
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const panel = panels.find((item) => item.id === dragState.panelId);
      if (!panel) return;

      const nextWidth = getClampedWidth(
        panel,
        dragState.startWidth + event.clientX - dragState.startX,
      );

      widthsRef.current = {
        ...widthsRef.current,
        [panel.id]: nextWidth,
      };
      setWidths(widthsRef.current);
    };

    const handlePointerUp = () => {
      const panel = panels.find((item) => item.id === dragState.panelId);
      if (panel) {
        try {
          localStorage.setItem(panel.storageKey, String(widthsRef.current[panel.id]));
        } catch {
          // Ignore storage failures.
        }
      }

      setDragState(null);
      setDraggingPanelId(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragState, getClampedWidth, panels]);

  const startDragging = useCallback(
    (panel: ResizablePanelConfig, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentWidth = widthsRef.current[panel.id] ?? panel.defaultWidth;
      setDragState({
        panelId: panel.id,
        startX: event.clientX,
        startWidth: currentWidth,
      });
      setDraggingPanelId(panel.id);
    },
    [],
  );

  return (
    <div ref={containerRef} className={`flex h-full w-full overflow-hidden ${className}`}>
      {panels.map((panel, index) => {
        const width = widths[panel.id] ?? panel.defaultWidth;

        return (
          <Fragment key={panel.id}>
            <div
              style={{
                flexBasis: width,
                flexGrow: 0,
                flexShrink: 1,
                maxWidth: panel.maxWidth,
                minWidth: panel.minWidth,
                width,
              }}
              className={`min-w-0 ${panel.className ?? ""}`}
            >
              {panel.children}
            </div>
            {index < panels.length - 1 ? (
              <ResizeHandle
                isDragging={draggingPanelId === panel.id}
                onPointerDown={(event) => startDragging(panel, event)}
              />
            ) : null}
          </Fragment>
        );
      })}

      {after ? (
        <div className={`min-w-0 flex-1 ${afterClassName}`}>{after}</div>
      ) : (
        <div className={`min-w-0 flex-1 ${fillerClassName}`} aria-hidden="true" />
      )}
    </div>
  );
}

function ResizeHandle({
  isDragging,
  onPointerDown,
}: {
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Resize panel width"
      title="Resize panel width"
      onPointerDown={onPointerDown}
      className={`group relative z-20 flex h-full w-1.5 shrink-0 cursor-col-resize items-center justify-center border-r border-white/10 outline-none transition-colors focus-visible:bg-cyan/25 focus-visible:ring-2 focus-visible:ring-cyan ${
        isDragging
          ? "border-r-cyan/50 bg-cyan/30"
          : "bg-transparent hover:border-r-cyan/40 hover:bg-cyan/20"
      }`}
    >
      <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
      <GripVertical
        aria-hidden="true"
        className={`pointer-events-none h-5 w-5 text-white/20 transition-opacity ${
          isDragging
            ? "text-cyan/80 opacity-100"
            : "opacity-0 group-hover:text-cyan/60 group-hover:opacity-100"
        }`}
      />
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
