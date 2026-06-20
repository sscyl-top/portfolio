import { Archive, Check, LogOut, Mail, Trash2 } from "lucide-react";

import { defaultAdminEmail, isAdminEmail } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteMessage,
  loginAdmin,
  logoutAdmin,
  updateMessageStatus,
} from "./actions";

type ContactMessage = {
  id: string;
  type: "hiring" | "commercial";
  name: string;
  email: string;
  company: string;
  subject: string;
  range: string;
  message: string;
  note: string;
  status: "new" | "read" | "archived";
  email_notified: boolean;
  created_at: string;
};

type AdminPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  login: "邮箱或密码错误。",
  unauthorized: "该账号没有后台访问权限。",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { error: errorCode } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <AdminShell title="后台等待配置" eyebrow="Admin setup">
        <div className="rounded-lg border border-copper/25 bg-copper/10 p-6 text-sm leading-7 text-white/62">
          请先根据项目根目录的 <code>.env.example</code> 配置 Supabase 与
          Resend，并执行 <code>supabase/migrations</code> 中的建表脚本。
        </div>
      </AdminShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return (
      <AdminShell title="后台登录" eyebrow="Private access">
        <form
          action={loginAdmin}
          className="max-w-lg rounded-lg border border-white/10 bg-white/[0.035] p-6"
        >
          <label className="block text-sm text-white/62">
            邮箱
            <input
              type="email"
              name="email"
              defaultValue={defaultAdminEmail}
              required
              className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-copper/60"
            />
          </label>
          <label className="mt-5 block text-sm text-white/62">
            密码
            <input
              type="password"
              name="password"
              required
              className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-copper/60"
            />
          </label>
          {errorCode ? (
            <p className="mt-4 text-sm text-red-300">
              {errorMessages[errorCode] ?? "登录失败。"}
            </p>
          ) : null}
          <button className="mt-6 min-h-12 w-full rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-cyan">
            登录后台
          </button>
        </form>
      </AdminShell>
    );
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  const messages = (data ?? []) as ContactMessage[];

  return (
    <AdminShell title="联系消息" eyebrow="Contact inbox">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-4">
        <p className="font-mono text-xs text-white/42">
          {messages.length} 条消息 / {user?.email}
        </p>
        <form action={logoutAdmin}>
          <button className="inline-flex items-center gap-2 text-sm text-white/58 transition hover:text-white">
            <LogOut aria-hidden="true" className="h-4 w-4" />
            退出登录
          </button>
        </form>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          消息读取失败：{error.message}
        </p>
      ) : null}

      {!error && messages.length === 0 ? (
        <div className="grid min-h-64 place-items-center border-y border-white/10 text-sm text-white/38">
          暂无联系消息
        </div>
      ) : null}

      <div className="space-y-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-copper/30 px-2.5 py-1 font-mono text-[10px] uppercase text-copper">
                    {message.type === "hiring" ? "聘用联系" : "商业咨询"}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-white/34">
                    {message.status}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {message.subject}
                </h2>
              </div>
              <time className="font-mono text-xs text-white/36">
                {new Date(message.created_at).toLocaleString("zh-CN")}
              </time>
            </div>

            <div className="mt-5 grid gap-5 text-sm md:grid-cols-[0.7fr_1.3fr]">
              <div className="space-y-2 text-white/54">
                <p className="text-white/80">{message.name}</p>
                <a
                  href={`mailto:${message.email}`}
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  {message.email}
                </a>
                <p>{message.company || "未填写公司"}</p>
                <p>{message.range || "未填写范围"}</p>
              </div>
              <div className="space-y-4 leading-7 text-white/58">
                <p className="whitespace-pre-wrap">{message.message}</p>
                <p className="whitespace-pre-wrap border-t border-white/10 pt-4">
                  备注：{message.note}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <StatusButton id={message.id} status="read" label="标记已读" />
              <StatusButton id={message.id} status="archived" label="归档" />
              <form action={deleteMessage}>
                <input type="hidden" name="id" value={message.id} />
                <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-red-300/20 px-4 text-xs text-red-200 transition hover:bg-red-300/10">
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  删除
                </button>
              </form>
              <span className="ml-auto self-center font-mono text-[10px] text-white/28">
                {message.email_notified ? "邮件已通知" : "邮件未通知"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

function StatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: "read" | "archived";
  label: string;
}) {
  const Icon = status === "read" ? Check : Archive;

  return (
    <form action={updateMessageStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 px-4 text-xs text-white/62 transition hover:border-white/30 hover:text-white">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}

function AdminShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 pb-24 pt-32 md:px-8">
      <section className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-copper">
          {eyebrow}
        </p>
        <h1 className="mb-10 mt-4 text-5xl font-semibold text-white md:text-7xl">
          {title}
        </h1>
        {children}
      </section>
    </main>
  );
}
