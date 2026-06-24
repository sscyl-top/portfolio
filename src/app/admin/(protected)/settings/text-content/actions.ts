"use server";

import { requireAdmin } from "@/lib/admin-session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createTextContentSchema = z.object({
  key: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(10000),
  page: z.string().trim().min(1).max(80),
  section: z.string().trim().max(80).optional(),
  font_size: z.string().trim().max(20).optional(),
  font_family: z.string().trim().max(80).optional(),
  font_weight: z.string().trim().max(20).optional(),
  color: z.string().trim().max(20).optional(),
});

const updateTextContentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(10000),
  font_size: z.string().trim().max(20).optional(),
  font_family: z.string().trim().max(80).optional(),
  font_weight: z.string().trim().max(20).optional(),
  color: z.string().trim().max(20).optional(),
});

export async function createTextContent(formData: FormData) {
  const { client } = await requireAdmin();

  const parsed = createTextContentSchema.safeParse({
    key: formData.get("key"),
    content: formData.get("content"),
    page: formData.get("page"),
    section: formData.get("section") || undefined,
    font_size: formData.get("font_size") || undefined,
    font_family: formData.get("font_family") || undefined,
    font_weight: formData.get("font_weight") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) return;

  const { error } = await client.from("text_content").insert({
    key: parsed.data.key,
    content: parsed.data.content,
    page: parsed.data.page,
    section: parsed.data.section ?? null,
    font_size: parsed.data.font_size ?? null,
    font_family: parsed.data.font_family ?? null,
    font_weight: parsed.data.font_weight ?? null,
    color: parsed.data.color ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/text-content");
}

export async function updateTextContent(formData: FormData) {
  const { client } = await requireAdmin();

  const parsed = updateTextContentSchema.safeParse({
    id: formData.get("id"),
    content: formData.get("content"),
    font_size: formData.get("font_size") || undefined,
    font_family: formData.get("font_family") || undefined,
    font_weight: formData.get("font_weight") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) return;

  const { error } = await client
    .from("text_content")
    .update({
      content: parsed.data.content,
      font_size: parsed.data.font_size ?? null,
      font_family: parsed.data.font_family ?? null,
      font_weight: parsed.data.font_weight ?? null,
      color: parsed.data.color ?? null,
    })
    .eq("id", parsed.data.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/text-content");
}

export async function deleteTextContent(id: string) {
  const { client } = await requireAdmin();

  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return;

  const { error } = await client
    .from("text_content")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", idParsed.data);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/text-content");
}
