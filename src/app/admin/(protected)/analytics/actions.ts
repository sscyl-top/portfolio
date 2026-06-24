"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const idSchema = z.string().uuid();

export async function approveComment(formData: FormData) {
  const id = idSchema.safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("work_comments")
    .update({ is_approved: true })
    .eq("id", id.data);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/analytics");
}

export async function deleteComment(formData: FormData) {
  const id = idSchema.safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("work_comments")
    .delete()
    .eq("id", id.data);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/analytics");
}
