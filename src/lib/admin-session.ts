import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
};

type AdminAuthClient = {
  auth: {
    getUser(): Promise<{ data: { user: AdminUser | null } }>;
  };
};

export async function getAuthorizedAdmin(client: AdminAuthClient) {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user || !isAdminEmail(user.email)) return null;
  if (user.app_metadata?.role !== "admin") return null;

  return user;
}

export async function requireAdmin() {
  const client = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(client);

  if (!user) redirect("/admin?error=unauthorized");

  return { client, user };
}
