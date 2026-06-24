import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { MessageList, type ContactMessage } from "./MessageList";

type StatusFilter = "all" | "new" | "read" | "archived";
type TypeFilter = "all" | "hiring" | "commercial";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status: rawStatus = "all", type: rawType = "all", q = "" } = await searchParams;
  const status: StatusFilter = ["all", "new", "read", "archived"].includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";
  const type: TypeFilter = ["all", "hiring", "commercial"].includes(rawType)
    ? (rawType as TypeFilter)
    : "all";
  const query = q.trim().toLowerCase();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  const allMessages = (data ?? []) as ContactMessage[];

  // 统计未读数
  const unreadCount = allMessages.filter((m) => m.status === "new").length;

  // 筛选
  const messages = allMessages.filter((m) => {
    if (status !== "all" && m.status !== status) return false;
    if (type !== "all" && m.type !== type) return false;
    if (query) {
      const haystack = `${m.subject} ${m.name} ${m.email} ${m.message} ${m.company}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "全部状态" },
    { value: "new", label: "未读" },
    { value: "read", label: "已读" },
    { value: "archived", label: "已归档" },
  ];

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "全部类型" },
    { value: "hiring", label: "聘用联系" },
    { value: "commercial", label: "商业咨询" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Contact inbox
          </p>
          <h2 className="mt-3 text-3xl font-semibold">联系消息</h2>
          <p className="mt-3 font-mono text-xs text-white/38">
            {allMessages.length} 条消息
            {unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-cyan/20 px-2 py-0.5 text-cyan">
                {unreadCount} 未读
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <form className="mt-6 flex flex-wrap items-center gap-3">
        <select
          name="status"
          defaultValue={status}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={type}
          className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
        >
          {typeOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="搜索主题 / 姓名 / 邮箱 / 内容"
          className="min-h-10 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan sm:min-w-64"
        />

        <button
          type="submit"
          className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10"
        >
          筛选
        </button>

        {(status !== "all" || type !== "all" || query) && (
          <Link
            href="/admin/messages"
            className="min-h-10 rounded-md border border-white/10 px-4 text-sm text-white/60 transition hover:text-white"
          >
            清除
          </Link>
        )}
      </form>

      <p className="mt-4 text-xs text-white/34">
        {messages.length === allMessages.length
          ? `显示全部 ${messages.length} 条`
          : `显示 ${messages.length} 条（共 ${allMessages.length} 条）`}
      </p>

      {error ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          消息读取失败：{error.message}
        </p>
      ) : (
        <div className="mt-6">
          <MessageList messages={messages} />
        </div>
      )}
    </div>
  );
}
