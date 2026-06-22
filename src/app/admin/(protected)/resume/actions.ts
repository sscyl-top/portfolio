"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const resumeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  alias: z.string().trim().max(120),
  role: z.string().trim().max(120),
  positioning: z.string().trim().max(500),
  location: z.string().trim().max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(30),
  zcool_url: z.string().trim().max(200),
  wechat_id: z.string().trim().max(60),
});

export async function saveResume(formData: FormData) {
  const labels = formData.getAll("strength").map(String).filter((s) => s.trim());
  const parsed = resumeSchema.safeParse({
    name: formData.get("name"),
    alias: formData.get("alias") ?? "",
    role: formData.get("role"),
    positioning: formData.get("positioning") ?? "",
    location: formData.get("location") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    zcool_url: formData.get("zcool_url") ?? "",
    wechat_id: formData.get("wechat_id") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client.from("resumes").upsert({
    id: true,
    ...parsed.data,
    strengths: labels,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/resume");
  revalidatePath("/admin/resume");
}