"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAdmin } from "@/app/admin/actions";

import { ErrorBoundary } from "./ui/ErrorBoundary";
import { AdminContent } from "./AdminContent";
import { AdminNav } from "./AdminNav";
import { DetachedResizablePanels } from "./DetachedResizablePanels";

type AdminShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

const ADMIN_CONTENT_OFFSET = 420;

function SidebarContent({ userEmail }: { userEmail: string }) {
  return (
    <div className="admin-scroll-area flex h-full flex-col overflow-y-auto p-4 md:p-5">
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
    </div>
  );
}

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const isWorkEditorPage = /^\/admin\/works\/[^/]+$/.test(pathname);

  const content = (
    <section
      className={`flex h-full min-w-0 flex-col md:pt-28 ${
        isWorkEditorPage
          ? "overflow-hidden px-3 py-6 md:px-6"
          : "admin-scroll-area overflow-y-auto px-5 py-6 md:px-8"
      }`}
    >
      <AdminContent fillHeight={isWorkEditorPage}>{children}</AdminContent>
    </section>
  );

  return (
    <main className="relative h-screen overflow-hidden bg-[#07090b] text-white">
      <ErrorBoundary>
        <DetachedResizablePanels
          gap={42}
          panels={[
            {
              id: "admin-sidebar",
              storageKey: "admin-sidebar-width",
              anchor: "left",
              offset: 0,
              defaultWidth: 220,
              minWidth: 172,
              maxWidth: 420,
              resizeEdge: "right",
              className: "border-r border-white/8 bg-[#090c0f]",
              children: <SidebarContent userEmail={userEmail} />,
            },
            {
              id: isWorkEditorPage ? "admin-editor-stage" : "admin-primary-page",
              storageKey: isWorkEditorPage
                ? "admin-editor-stage-width-v5"
                : "admin-primary-page-width",
              anchor: "left",
              offset: ADMIN_CONTENT_OFFSET,
              defaultWidth: isWorkEditorPage ? 4000 : 1420,
              minWidth: isWorkEditorPage ? 720 : 720,
              maxWidth: isWorkEditorPage ? 4000 : 2200,
              resizeEdge: isWorkEditorPage ? "none" : "right",
              className: "h-full",
              children: content,
            },
          ]}
        />
      </ErrorBoundary>
    </main>
  );
}
