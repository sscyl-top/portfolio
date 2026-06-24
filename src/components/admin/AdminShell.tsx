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
      <div className="mx-auto grid h-full max-w-7xl md:grid-cols-[240px_1fr]">
        <aside className="overflow-y-auto border-b border-white/10 p-4 md:border-b-0 md:border-r md:p-5">
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
          <form action={logoutAdmin} className="mt-6">
            <button className="inline-flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/50 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              退出登录
            </button>
          </form>
        </aside>
        <section className="min-w-0 overflow-y-auto px-5 py-6 md:px-8 md:py-8">{children}</section>
      </div>
    </main>
  );
}
