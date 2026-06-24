"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-session";
import { revalidatePath } from "next/cache";

export async function createTextContent(formData: FormData) {
  await requireAdmin();

  const key = formData.get("key") as string;
  const content = formData.get("content") as string;
  const page = formData.get("page") as string;
  const section = (formData.get("section") as string) || null;
  const fontSize = (formData.get("font_size") as string) || null;
  const fontFamily = (formData.get("font_family") as string) || null;
  const fontWeight = (formData.get("font_weight") as string) || null;
  const color = (formData.get("color") as string) || null;

  if (!key || !content || !page) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("text_content").insert({
    key,
    content,
    page,
    section,
    font_size: fontSize,
    font_family: fontFamily,
    font_weight: fontWeight,
    color,
  });

  revalidatePath("/admin/settings/text-content");
}

export async function updateTextContent(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string;
  const content = formData.get("content") as string;
  const fontSize = (formData.get("font_size") as string) || null;
  const fontFamily = (formData.get("font_family") as string) || null;
  const fontWeight = (formData.get("font_weight") as string) || null;
  const color = (formData.get("color") as string) || null;

  if (!id || !content) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("text_content")
    .update({
      content,
      font_size: fontSize,
      font_family: fontFamily,
      font_weight: fontWeight,
      color,
    })
    .eq("id", id)
    .is("deleted_at", null);

  revalidatePath("/admin/settings/text-content");
}

export async function deleteTextContent(id: string) {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("text_content")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/settings/text-content");
}
