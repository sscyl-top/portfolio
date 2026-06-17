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
    "--blob-x": `${(pointer.x - 0.5) * 34}px`,
    "--blob-y": `${(pointer.y - 0.5) * 26}px`,
  } as CSSProperties;

  const blobBStyle = {
    "--blob-x": `${(0.5 - pointer.x) * 30}px`,
    "--blob-y": `${(0.5 - pointer.y) * 22}px`,
  } as CSSProperties;

  return (
    <main
      className="relative isolate overflow-hidden bg-[#050505]"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#050505_0%,#050505_34%,#06110f_54%,#050505_100%)]" />
      <div
        className="works-route-blob works-route-blob-a pointer-events-none fixed z-0 h-[900px] w-[900px] rounded-full opacity-54"
        style={blobAStyle}
      />
      <div
        className="works-route-blob works-route-blob-b pointer-events-none fixed z-0 h-[820px] w-[820px] rounded-full opacity-48"
        style={blobBStyle}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:88px_88px] opacity-18" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_28%),linear-gradient(90deg,rgba(0,0,0,0.62),transparent_24%,transparent_76%,rgba(0,0,0,0.64))]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
