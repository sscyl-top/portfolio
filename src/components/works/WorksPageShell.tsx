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

  const blobAStyle = {
    "--blob-x": `${(pointer.x - 0.5) * 118}px`,
    "--blob-y": `${(pointer.y - 0.5) * 82}px`,
  } as CSSProperties;

  const blobBStyle = {
    "--blob-x": `${(0.5 - pointer.x) * 104}px`,
    "--blob-y": `${(0.5 - pointer.y) * 78}px`,
  } as CSSProperties;

  return (
    <main
      className="relative isolate overflow-hidden bg-page-bg"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,var(--page-bg)_0%,var(--page-bg)_34%,color-mix(in_oklch,var(--cyan)_6%,var(--page-bg))_54%,var(--page-bg)_100%)]" />
      <div
        className="works-route-blob works-route-blob-a pointer-events-none fixed z-0 h-[980px] w-[980px] rounded-full opacity-70"
        style={blobAStyle}
      />
      <div
        className="works-route-blob works-route-blob-b pointer-events-none fixed z-0 h-[900px] w-[900px] rounded-full opacity-64"
        style={blobBStyle}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(var(--edge-3)_1px,transparent_1px),linear-gradient(90deg,var(--edge-3)_1px,transparent_1px)] bg-[size:88px_88px] opacity-18" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,var(--edge-3),transparent_28%),linear-gradient(90deg,var(--overlay-2),transparent_24%,transparent_76%,var(--overlay-2))]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
