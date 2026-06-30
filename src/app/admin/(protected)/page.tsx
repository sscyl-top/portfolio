import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Image,
  Mail,
  MessageSquare,
  PenLine,
  Plus,
  Settings,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  // --- counts ---
  const [
    { count: publishedCount },
    { count: draftCount },
    { count: unreadCount },
    { count: mediaCount },
    { count: categoryCount },
  ] = await Promise.all([
    supabase
      .from("works")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    supabase
      .from("works")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .is("deleted_at", null),
      supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
    supabase
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
  ]);

  // --- recent works & messages (parallel) ---
  const [
    { data: recentWorks },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from("works")
      .select("slug,title,status,updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("contact_messages")
      .select("id,name,email,subject,status,created_at")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const recent = (recentWorks ?? []) as Array<{
    slug: string;
    title: string;
    status: string;
    updated_at: string;
  }>;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Dashboard
      </p>
      <h2 className="mt-2 text-2xl font-semibold">控制台</h2>
      <p className="mt-1.5 text-xs text-white/48">
        网站内容管理与数据概览
      </p>

      {/* ── stats grid ── */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="已发布"
          value={String(publishedCount ?? 0)}
          href="/admin/works"
          icon={<ExternalLink className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="草稿"
          value={String(draftCount ?? 0)}
          accent
          href="/admin/works"
          icon={<PenLine className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="未读消息"
          value={String(unreadCount ?? 0)}
          accent={Boolean(unreadCount)}
          href="/admin/messages"
          icon={<MessageSquare className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="媒体文件"
          value={String(mediaCount ?? 0)}
          href="/admin/media"
          icon={<Image className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="分类标签"
          value={String(categoryCount ?? 0)}
          href="/admin/categories"
          icon={<FileText className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ── quick actions ── */}
      <div className="mt-5 flex flex-wrap gap-2">
        <QuickAction href="/admin/works" icon={<Plus />} label="新建作品" />
        <QuickAction href="/admin/media" icon={<Image />} label="上传媒体" />
        <QuickAction href="/admin/messages" icon={<Mail />} label="查看消息" />
        <QuickAction href="/admin/settings" icon={<Settings />} label="网站设置" />
      </div>

      {/* ── two columns: recent works + messages ── */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* recent works */}
        <Panel title="最近更新">
          {recent && recent.length > 0 ? (
            <ul className="divide-y divide-white/8">
              {recent.map((work) => (
                <li key={work.slug} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <div
                    className={`size-1.5 shrink-0 rounded-full ${
                      work.status === "published" ? "bg-emerald-400/60" : "bg-amber-400/60"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-white/80">
                    {work.title}
                  </span>
                  <span
                    className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-medium ${
                      work.status === "published"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    {work.status === "published" ? "已发布" : "草稿"}
                  </span>
                  <Link
                    href={`/admin/works/${work.slug}`}
                    className="shrink-0 text-[11px] text-white/35 transition hover:text-cyan"
                  >
                    编辑
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="暂无作品" />
          )}
        </Panel>

        {/* recent messages */}
        <Panel title="最近消息">
          {recentMessages && recentMessages.length > 0 ? (
            <ul className="divide-y divide-white/8">
              {recentMessages.map((msg) => (
                <li key={msg.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                        {msg.status === "new" ? (
                          <span className="inline-block size-1.5 shrink-0 rounded-full bg-cyan" />
                        ) : null}
                        <span className="truncate">
                          {msg.name || "匿名"}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-white/40">
                        {msg.subject || "（无主题）"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-white/25">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="暂无消息" />
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── sub-components ── */

function MetricCard({
  label,
  value,
  accent,
  href,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-lg border p-4 transition ${
        accent
          ? "border-cyan/25 bg-cyan/[0.04] hover:border-cyan/50"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase text-white/36">{label}</p>
        <span className="text-white/25 transition group-hover:text-white/60">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs text-white/55 transition hover:border-cyan/30 hover:text-cyan"
    >
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      {label}
    </Link>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <h3 className="mb-3 text-xs font-semibold text-white/70">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-xs text-white/25">{text}</p>
  );
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;

  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
