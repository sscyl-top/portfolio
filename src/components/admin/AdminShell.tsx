import { LogOut } from "lucide-react";

import { logoutAdmin } from "@/app/admin/actions";

import { AdminNav } from "./AdminNav";

type AdminShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

export function AdminShell({ children, userEmail }: AdminShellProps) {
  return (
    <main className="h-screen bg-[#07090b] text-white">
      <div className="grid h-full grid-cols-[240px_1fr]">
        <aside className="flex flex-col overflow-y-auto border-r border-white/10 p-4 md:p-5">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
              CMS
            </p>
            <h1 className="mt-1 text-lg font-semibold">作品集后台</h1>
          </div>
          <AdminNav />
          <div className="mt-auto pt-6">
            <p className="truncate font-mono text-[10px] text-white/38">
              {userEmail}
            </p>
            <form action={logoutAdmin} className="mt-3">
              <button className="inline-flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/50 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                退出登录
              </button>
            </form>
          </div>
        </aside>
        <section className="min-w-0 overflow-y-auto pt-20 md:pt-28 px-6 md:px-10 lg:px-12 md:py-8">{children}</section>
      </div>
    </main>
  );
}
