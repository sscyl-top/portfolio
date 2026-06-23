import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ContactSubmission } from "@/lib/contact";
import { createContactHandler } from "./handler";

export const runtime = "nodejs";

const notificationRecipient = "hello@sscyl.top";

function contactTypeLabel(type: ContactSubmission["type"]) {
  return type === "hiring" ? "聘用联系" : "商业咨询";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const handler = createContactHandler({
  async hashIp(ip) {
    const secret =
      process.env.CONTACT_RATE_LIMIT_SECRET ??
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) throw new Error("Contact rate limit secret is not configured");
    return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
  },

  async countRecent(ipHash) {
    const supabase = createSupabaseServiceClient();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (error) throw error;
    return count ?? 0;
  },

  async save(submission, ipHash) {
    const supabase = createSupabaseServiceClient();
    const message = {
      type: submission.type,
      name: submission.name,
      email: submission.email,
      company: submission.company,
      subject: submission.subject,
      range: submission.range,
      message: submission.message,
      note: submission.note,
    };
    const { data, error } = await supabase
      .from("contact_messages")
      .insert({ ...message, ip_hash: ipHash })
      .select("id")
      .single();

    if (error) throw error;
    return data;
  },

  async notify(submission) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Resend API key is not configured");

    const type = contactTypeLabel(submission.type);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ??
          "Portfolio Contact <onboarding@resend.dev>",
        to: [notificationRecipient],
        reply_to: submission.email,
        subject: `[作品集] ${type} - ${submission.name}`,
        html: `
          <h1>${escapeHtml(type)}</h1>
          <p><strong>姓名：</strong>${escapeHtml(submission.name)}</p>
          <p><strong>邮箱：</strong>${escapeHtml(submission.email)}</p>
          <p><strong>公司：</strong>${escapeHtml(submission.company || "未填写")}</p>
          <p><strong>主题：</strong>${escapeHtml(submission.subject)}</p>
          <p><strong>范围：</strong>${escapeHtml(submission.range || "未填写")}</p>
          <p><strong>描述：</strong><br>${escapeHtml(submission.message).replaceAll("\n", "<br>")}</p>
          <p><strong>备注：</strong><br>${escapeHtml(submission.note).replaceAll("\n", "<br>")}</p>
        `,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend request failed: ${response.status} ${details}`);
    }
  },

  async markNotification(id, notified, error) {
    const supabase = createSupabaseServiceClient();
    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({
        email_notified: notified,
        email_error: error?.slice(0, 1000) ?? null,
      })
      .eq("id", id);

    if (updateError) throw updateError;
  },
});

export async function POST(request: Request) {
  try {
    return await handler(request);
  } catch (error) {
    console.error("Contact submission failed", error);
    return Response.json(
      { error: "消息暂时无法提交，请稍后再试" },
      { status: 503 },
    );
  }
}
