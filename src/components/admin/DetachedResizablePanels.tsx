"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type PanelAnchor = "left" | "right";
type ResizeEdge = "left" | "right" | "none";

type DetachedPanelConfig = {
  id: string;
  storageKey: string;
  anchor: PanelAnchor;
  offset: number;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizeEdge?: ResizeEdge;
  className?: string;
  children: React.ReactNode;
};

type DetachedResizablePanelsProps = {
  panels: DetachedPanelConfig[];
  gap?: number;
  className?: string;
};

type DragState = {
  panelId: string;
  edge: Exclude<ResizeEdge, "none">;
  startX: number;
  startWidth: number;
};

type PanelRect = {
  start: number;
  end: number;
};

export function DetachedResizablePanels({
  panels,
  gap = 16,
  className = "",
}: DetachedResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingPanelId, setDraggingPanelId] = useState<string | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(panels.map((panel) => [panel.id, panel.defaultWidth])),
  );

  const panelSignature = panels
    .map((panel) =>
      [
        panel.id,
        panel.storageKey,
        panel.anchor,
        panel.offset,
        panel.defaultWidth,
        panel.minWidth,
        panel.maxWidth,
        panel.resizeEdge ?? "right",
      ].join(":"),
    )
    .join("|");

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => setContainerWidth(node.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
          // Width persistence is optional; keep dragging functional without it.
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

  const effectiveWidths = useMemo(() => {
    if (!containerWidth) return widths;

    const next = { ...widths };
    for (const panel of panels) {
      next[panel.id] = clampRestoredPanelWidth(
        panel,
        next[panel.id] ?? panel.defaultWidth,
        panels,
        next,
        containerWidth,
        gap,
      );
    }
    return next;
  }, [containerWidth, gap, panels, widths]);

  useEffect(() => {
    widthsRef.current = effectiveWidths;
  }, [effectiveWidths]);

  const startDragging = useCallback(
    (panel: DetachedPanelConfig, edge: Exclude<ResizeEdge, "none">, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentWidth = widthsRef.current[panel.id] ?? panel.defaultWidth;
      setDragState({
        panelId: panel.id,
        edge,
        startX: event.clientX,
        startWidth: currentWidth,
      });
      setDraggingPanelId(panel.id);
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const panel = panels.find((item) => item.id === dragState.panelId);
      if (!panel) return;

      const delta =
        dragState.edge === "right"
          ? event.clientX - dragState.startX
          : dragState.startX - event.clientX;

      const nextWidth = clampPanelWidth(
        panel,
        dragState.startWidth + delta,
        panels,
        widthsRef.current,
        containerWidth,
        gap,
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
  }, [containerWidth, dragState, gap, panels]);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      {panels.map((panel) => {
        const width = effectiveWidths[panel.id] ?? panel.defaultWidth;
        const rect = getPanelRect(panel, width, containerWidth);
        const resizeEdge = panel.resizeEdge ?? "right";

        return (
          <Fragment key={panel.id}>
            <section
              style={{
                left: rect.start,
                width,
              }}
              className={`absolute bottom-0 top-0 min-w-0 ${panel.className ?? ""}`}
            >
              {panel.children}
              {resizeEdge !== "none" ? (
                <ResizeHandle
                  edge={resizeEdge}
                  isDragging={draggingPanelId === panel.id}
                  onPointerDown={(event) => startDragging(panel, resizeEdge, event)}
                />
              ) : null}
            </section>
          </Fragment>
        );
      })}
    </div>
  );
}

function ResizeHandle({
  edge,
  isDragging,
  onPointerDown,
}: {
  edge: Exclude<ResizeEdge, "none">;
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Resize panel width"
      title="Resize panel width"
      onPointerDown={onPointerDown}
      className={`group absolute bottom-0 top-0 z-30 flex w-4 cursor-col-resize items-center justify-center bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-cyan/70 ${
        edge === "left" ? "-left-2" : "-right-2"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none h-full w-px rounded-full transition ${
          isDragging
            ? "bg-cyan/75 shadow-[0_0_14px_rgba(139,215,205,0.55)]"
            : "bg-white/12 group-hover:bg-cyan/55"
        }`}
      />
    </button>
  );
}

function clampRestoredPanelWidth(
  panel: DetachedPanelConfig,
  requestedWidth: number,
  panels: DetachedPanelConfig[],
  widths: Record<string, number>,
  containerWidth: number,
  gap: number,
) {
  let maxWidth = panel.maxWidth;

  if (containerWidth > 0) {
    if (panel.anchor === "left") {
      maxWidth = Math.min(maxWidth, containerWidth - panel.offset - gap);
    } else {
      const panelEnd = containerWidth - panel.offset;
      const nearestLeft = panels
        .filter((item) => item.id !== panel.id && item.anchor === "left")
        .map((item) => getPanelRect(item, widths[item.id] ?? item.defaultWidth, containerWidth))
        .filter((rect) => rect.end <= panelEnd)
        .sort((a, b) => b.end - a.end)[0];
      const boundary = nearestLeft ? nearestLeft.end + gap : gap;
      maxWidth = Math.min(maxWidth, panelEnd - boundary);
    }
  }

  return Math.round(clamp(requestedWidth, panel.minWidth, Math.max(panel.minWidth, maxWidth)));
}

function clampPanelWidth(
  panel: DetachedPanelConfig,
  requestedWidth: number,
  panels: DetachedPanelConfig[],
  widths: Record<string, number>,
  containerWidth: number,
  gap: number,
) {
  let maxWidth = panel.maxWidth;

  if (containerWidth > 0) {
    const currentRect = getPanelRect(panel, requestedWidth, containerWidth);
    const otherRects = panels
      .filter((item) => item.id !== panel.id)
      .map((item) => ({
        panel: item,
        rect: getPanelRect(item, widths[item.id] ?? item.defaultWidth, containerWidth),
      }));

    if (panel.anchor === "left") {
      const nearestRight = otherRects
        .filter((item) => item.rect.start >= currentRect.start)
        .sort((a, b) => a.rect.start - b.rect.start)[0];
      const boundary = nearestRight ? nearestRight.rect.start - gap : containerWidth - gap;
      maxWidth = Math.min(maxWidth, boundary - panel.offset);
    } else {
      const panelEnd = containerWidth - panel.offset;
      const nearestLeft = otherRects
        .filter((item) => item.rect.end <= panelEnd)
        .sort((a, b) => b.rect.end - a.rect.end)[0];
      const boundary = nearestLeft ? nearestLeft.rect.end + gap : gap;
      maxWidth = Math.min(maxWidth, panelEnd - boundary);
    }
  }

  return Math.round(clamp(requestedWidth, panel.minWidth, Math.max(panel.minWidth, maxWidth)));
}

function getPanelRect(
  panel: DetachedPanelConfig,
  width: number,
  containerWidth: number,
): PanelRect {
  if (panel.anchor === "right") {
    const end = Math.max(0, containerWidth - panel.offset);
    return {
      start: end - width,
      end,
    };
  }

  return {
    start: panel.offset,
    end: panel.offset + width,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
