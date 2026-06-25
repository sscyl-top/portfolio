"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAdmin } from "@/app/admin/actions";

import { AdminContent } from "./AdminContent";
import { AdminNav } from "./AdminNav";

type AdminShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const isWorkEditorPage = /^\/admin\/works\/[^/]+$/.test(pathname);

  return (
    <main className="flex h-screen bg-[#07090b] text-white">
      <aside className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 p-4 md:p-5">
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

      <section
        className={`flex min-w-0 flex-1 overflow-y-auto py-6 md:pt-28 ${
          isWorkEditorPage ? "px-3 md:px-6" : "px-5 md:px-8"
        }`}
      >
        <AdminContent>{children}</AdminContent>
      </section>
    </main>
  );
}
