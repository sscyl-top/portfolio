"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

type WorksPageShellProps = {
  children: ReactNode;
};

type PointerState = {
  x: number;
  y: number;
};

export function WorksPageShell({ children }: WorksPageShellProps) {
  const [pointer, setPointer] = useState<PointerState>({ x: 0.5, y: 0.36 });

  const driftX = (pointer.x - 0.5) * 80;
  const driftY = (pointer.y - 0.5) * 30;

  const blobAStyle = {
    "--blob-x": `${driftX}px`,
    "--blob-y": `${driftY}px`,
  } as CSSProperties;

  const blobBStyle = {
    "--blob-x": `${-driftX * 0.6}px`,
    "--blob-y": `${-driftY * 0.4}px`,
  } as CSSProperties;

  return (
    <main
      className="relative isolate overflow-visible bg-page-bg"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0" />
      <div
        className="works-route-blob works-route-blob-a pointer-events-none fixed z-0"
        style={blobAStyle}
      />
      <div
        className="works-route-blob works-route-blob-b pointer-events-none fixed z-0"
        style={blobBStyle}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(var(--edge-3)_1px,transparent_1px),linear-gradient(90deg,var(--edge-3)_1px,transparent_1px)] bg-[size:88px_88px] opacity-10" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,var(--edge-3),transparent_28%),linear-gradient(90deg,var(--overlay-2),transparent_24%,transparent_76%,var(--overlay-2))]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
