import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { requireAdmin } from "@/lib/admin-session";
import { getBackendReadiness } from "@/lib/supabase/config";

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
