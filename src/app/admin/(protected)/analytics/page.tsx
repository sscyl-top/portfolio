import { Check, Eye, Globe, MapPin, MessageSquare, Smartphone, Trash2, Users } from "lucide-react";
import Link from "next/link";

import { getAnalyticsStats } from "@/lib/cms/analytics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { approveComment, deleteComment } from "./actions";
import { approveWorkCommentAction, deleteWorkCommentAction } from "../works/actions";
import { LiveVisitors } from "./LiveVisitors";

type PendingComment = {
  id: string;
  work_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

async function getPendingComments(): Promise<PendingComment[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("work_comments")
    .select("id, work_id, author_name, content, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as PendingComment[];
}

export default async function AdminAnalyticsPage() {
  const stats = await getAnalyticsStats();
  const pendingComments = await getPendingComments();

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Analytics
      </p>
      <h2 className="mt-2 text-2xl font-semibold">数据分析</h2>
      <p className="mt-1.5 text-xs text-white/48">
        网站访问、作品热度与互动数据概览
      </p>

      {/* 顶部数字卡片 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="总访问" value={stats.totalVisits} icon={<Eye className="h-3.5 w-3.5" />} />
        <MetricCard label="今日 PV" value={stats.todayPageViews} accent icon={<Eye className="h-3.5 w-3.5" />} />
        <MetricCard label="独立访客" value={stats.uniqueVisitors} icon={<Users className="h-3.5 w-3.5" />} />
        <LiveVisitors initial={stats.liveVisitors} />
      </div>

      {/* 内容网格 */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* 热门作品 */}
        <Panel title="热门作品排行">
          {stats.topWorks.length > 0 ? (
            <ul className="divide-y divide-white/8">
              {stats.topWorks.map((work, index) => (
                <li
                  key={`${work.slug}-${index}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-white/50">
                      {index + 1}
                    </span>
                    <Link
                      href={work.slug ? `/works/${work.slug}` : "#"}
                      className="truncate text-sm text-white/80 transition hover:text-cyan"
                    >
                      {work.title}
                    </Link>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-white/40">
                    {work.views}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="暂无作品浏览数据" />
          )}
        </Panel>

        {/* 来源 Top10 */}
        <Panel title="来源 Top10">
          {stats.topSources.length > 0 ? (
            <ul className="divide-y divide-white/8">
              {stats.topSources.map((source) => (
                <li
                  key={source.source}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm text-white/70">
                    {source.source}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-white/40">
                    {source.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="暂无来源数据" />
          )}
        </Panel>

        {/* 设备占比 */}
        <Panel title="设备占比">
          {stats.deviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.deviceBreakdown.map((item) => (
                <div key={item.device}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-white/70">
                      <Smartphone aria-hidden="true" className="h-3.5 w-3.5 text-white/30" />
                      {deviceLabel(item.device)}
                    </span>
                    <span className="font-mono text-xs text-white/40">
                      {item.percent}% ({item.count})
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-cyan/70"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="暂无设备数据" />
          )}
        </Panel>

        {/* 最近留言 / 评论 */}
        <Panel title="最近留言 / 评论">
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-white/40">
                <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                联系消息
              </h4>
              {stats.recentMessages.length > 0 ? (
                <ul className="divide-y divide-white/8">
                  {stats.recentMessages.map((msg) => (
                    <li
                      key={msg.id}
                      className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/80">
                          {msg.name || "匿名"}
                        </p>
                        <p className="truncate text-xs text-white/40">
                          {msg.subject || "（无主题）"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-white/25">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="暂无联系消息" />
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-white/40">
                <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                作品评论
              </h4>
              {stats.recentComments.length > 0 ? (
                <ul className="divide-y divide-white/8">
                  {stats.recentComments.map((comment) => (
                    <li
                      key={comment.id}
                      className="py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white/80">
                            {comment.author_name || "匿名"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-white/40">
                            {comment.content}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-white/25">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <form action={approveComment}>
                          <input type="hidden" name="id" value={comment.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/55 transition hover:border-cyan/30 hover:text-cyan"
                          >
                            <Check aria-hidden="true" className="h-3 w-3" />
                            通过
                          </button>
                        </form>
                        <form action={deleteComment}>
                          <input type="hidden" name="id" value={comment.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-md border border-red-300/20 px-2 py-1 text-[10px] text-red-200 transition hover:bg-red-300/10"
                          >
                            <Trash2 aria-hidden="true" className="h-3 w-3" />
                            删除
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="暂无作品评论" />
              )}
            </div>
          </div>
        </Panel>

        {/* 作品评论审核 */}
        <Panel title="作品评论审核" className="lg:col-span-2">
          {pendingComments.length > 0 ? (
            <ul className="divide-y divide-white/8">
              {pendingComments.map((comment) => (
                <li key={comment.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white/80">
                          {comment.author_name || "匿名"}
                        </span>
                        <span className="font-mono text-[10px] text-white/25">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-white/62">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={approveWorkCommentAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/55 transition hover:border-cyan/30 hover:text-cyan"
                        >
                          <Check aria-hidden="true" className="h-3 w-3" />
                          通过
                        </button>
                      </form>
                      <form action={deleteWorkCommentAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md border border-red-300/20 px-2 py-1 text-[10px] text-red-200 transition hover:bg-red-300/10"
                        >
                          <Trash2 aria-hidden="true" className="h-3 w-3" />
                          删除
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="暂无待审评论" />
          )}
        </Panel>

        {/* 最近访客 */}
        <Panel title="最近访客" className="lg:col-span-2">
          <div className="overflow-x-auto">
            {stats.recentVisits.length > 0 ? (
              <table className="min-w-full text-left text-sm">
                <thead className="font-mono text-[10px] uppercase text-white/36">
                  <tr>
                    <th className="py-2 pr-3 font-normal">时间</th>
                    <th className="px-3 py-2 font-normal">页面</th>
                    <th className="px-3 py-2 font-normal">设备</th>
                    <th className="px-3 py-2 font-normal">位置</th>
                    <th className="px-3 py-2 font-normal">浏览器 / 系统</th>
                    <th className="py-2 pl-3 font-normal">来源</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {stats.recentVisits.map((visit) => (
                    <tr key={visit.id} className="align-top">
                      <td className="py-3 pr-3 text-white/55">
                        {formatRelativeTime(visit.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={visit.landing_path || "/"}
                          className="truncate text-cyan hover:text-white"
                        >
                          {visit.landing_path || "/"}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {deviceLabel(visit.device_type)}
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-white/25" />
                          {formatLocation(visit.country, visit.region, visit.city)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {visit.browser || "未知"} / {visit.os || "未知"}
                      </td>
                      <td className="py-3 pl-3 text-white/55">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-white/25" />
                          {formatReferrer(visit.referer)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty text="暂无访客记录" />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-cyan/25 bg-cyan/[0.04]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase text-white/36">{label}</p>
        {icon ? <span className="text-white/25">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.025] p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-semibold text-white/70">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-white/25">{text}</p>;
}

function deviceLabel(device: string): string {
  const labels: Record<string, string> = {
    desktop: "桌面端",
    mobile: "移动端",
    tablet: "平板",
    bot: "爬虫 / 机器人",
    unknown: "未知",
  };
  return labels[device] ?? device;
}

function formatLocation(
  country: string | null,
  region: string | null,
  city: string | null,
): string {
  const parts = [country, region, city].filter(Boolean) as string[];
  if (parts.length === 0) return "未知";
  // 如果国家/地区/城市重复则去重
  const unique = Array.from(new Set(parts));
  return unique.join(" · ");
}

function formatReferrer(referrer: string | null): string {
  if (!referrer) return "直接访问";
  try {
    const url = new URL(referrer);
    return url.hostname || referrer;
  } catch {
    return referrer.length > 40 ? `${referrer.slice(0, 40)}…` : referrer;
  }
}

function formatRelativeTime(dateStr: string): string {
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
