"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const statusSchema = z.enum(["new", "read", "archived"]);

export async function updateMessageStatus(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  const status = statusSchema.safeParse(String(formData.get("status") ?? ""));

  if (!id.success || !status.success) return;

  const { client } = await requireAdmin();
  await client
    .from("contact_messages")
    .update({ status: status.data })
    .eq("id", id.data);
  revalidatePath("/admin/messages");
}

export async function deleteMessage(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return;

  const { client } = await requireAdmin();
  await client.from("contact_messages").delete().eq("id", id.data);
  revalidatePath("/admin/messages");
}
