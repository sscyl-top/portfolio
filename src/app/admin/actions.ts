"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) redirect("/admin?error=unauthorized");
  return supabase;
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isAdminEmail(email)) redirect("/admin?error=unauthorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/admin?error=login");
  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

export async function updateMessageStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["new", "read", "archived"].includes(status)) return;

  const supabase = await requireAdmin();
  await supabase.from("contact_messages").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function deleteMessage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await requireAdmin();
  await supabase.from("contact_messages").delete().eq("id", id);
  revalidatePath("/admin");
}
