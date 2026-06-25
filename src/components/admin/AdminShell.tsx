"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAdmin } from "@/app/admin/actions";

import { AdminContent } from "./AdminContent";
import { AdminNav } from "./AdminNav";

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

type AdminShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const isWorkEditorPage = /^\/admin\/works\/[^/]+$/.test(pathname);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarWidthRef = useRef(DEFAULT_WIDTH);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (saved) {
        const w = parseInt(saved, 10);
        if (!isNaN(w) && w >= MIN_WIDTH && w <= MAX_WIDTH) {
          setSidebarWidth(w);
          sidebarWidthRef.current = w;
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const persistWidth = useCallback((w: number) => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartXRef.current;
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, dragStartWidthRef.current + delta),
      );
      sidebarWidthRef.current = nextWidth;
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      persistWidth(sidebarWidthRef.current);
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
  }, [isDragging, persistWidth]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = sidebarWidthRef.current;
      setIsDragging(true);
    },
    [],
  );

  return (
    <main className="flex h-screen overflow-hidden bg-[#07090b] text-white">
      <aside
        style={{ width: sidebarWidth }}
        className="flex h-full shrink-0 flex-col overflow-y-auto border-r border-white/10 p-4 transition-[width] duration-75 ease-linear md:p-5"
      >
        <div className="mb-5 flex items-center justify-between gap-4 md:block">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
              CMS
            </p>
            <h1 className="mt-1 text-lg font-semibold">作品集后台</h1>
          </div>
          <p className="max-w-36 truncate font-mono text-[10px] text-white/38 md:mt-2 md:max-w-full">
            {userEmail}
          </p>
        </div>
        <AdminNav />
        <form action={logoutAdmin} className="mt-auto pt-6">
          <button className="inline-flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/50 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan">
            <LogOut aria-hidden="true" className="h-4 w-4" />
            退出登录
          </button>
        </form>
      </aside>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={`group relative z-20 flex h-full w-1 shrink-0 cursor-col-resize items-center justify-center border-r border-white/10 transition-colors ${
          isDragging
            ? "bg-cyan/30 border-cyan/50"
            : "bg-transparent hover:bg-cyan/20 hover:border-cyan/40"
        }`}
        title="拖拽调整侧边栏宽度"
      >
        {/* Hit area: 6px on each side for easier grabbing */}
        <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
        <GripVertical
          className={`pointer-events-none h-5 w-5 text-white/20 transition-opacity ${
            isDragging
              ? "text-cyan/80 opacity-100"
              : "opacity-0 group-hover:opacity-100 group-hover:text-cyan/60"
          }`}
        />
      </div>

      <section
        className={`flex min-w-0 flex-1 flex-col overflow-y-auto py-6 md:pt-28 ${
          isWorkEditorPage ? "px-3 md:px-6" : "px-5 md:px-8"
        }`}
      >
        <AdminContent>{children}</AdminContent>
      </section>
    </main>
  );
}
