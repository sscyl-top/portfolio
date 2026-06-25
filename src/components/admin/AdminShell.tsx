import { LogOut } from "lucide-react";

import { logoutAdmin } from "@/app/admin/actions";

import { AdminContent } from "./AdminContent";
import { AdminNav } from "./AdminNav";

type AdminShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

export function AdminShell({ children, userEmail }: AdminShellProps) {
  return (
    <main className="flex h-screen bg-[#07090b] text-white">
      {/* ══ 左侧导航：始终贴紧屏幕左侧，不受任何宽度约束 ══ */}
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

      {/* ══ 右侧内容区：作品编辑页全宽，其他页面约束到1420px ══ */}
      <section className="flex min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 md:pt-28">
        <AdminContent>{children}</AdminContent>
      </section>
    </main>
  );
}
