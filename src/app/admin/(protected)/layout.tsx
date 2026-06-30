import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { requireAdmin } from "@/lib/admin-session";
import { getBackendReadiness } from "@/lib/supabase/config";

// 后台所有页面强制 SSR：依赖 cookies/headers（requireAdmin），且数据高度动态
// 前台 ISR 策略不应影响后台，这里显式声明
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const readiness = getBackendReadiness();

  if (!readiness.cms) {
    return <SetupNotice readiness={readiness} />;
  }

  const { user } = await requireAdmin();

  return <AdminShell userEmail={user.email ?? ""}>{children}</AdminShell>;
}
