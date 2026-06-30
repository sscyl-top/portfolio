"use client";

import { Archive, Check, Mail, Trash2 } from "lucide-react";

import { deleteMessage, updateMessageStatus } from "./actions";

export type ContactMessage = {
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

export function MessageList({ messages }: { messages: ContactMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center border-y border-white/10 text-xs text-white/38">
        暂无联系消息
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`rounded-md border p-4 transition ${
            message.status === "new"
              ? "border-cyan/30 bg-cyan/[0.04]"
              : "border-white/10 bg-white/[0.035]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-cyan/30 px-2 py-0.5 font-mono text-[10px] uppercase text-cyan">
                  {message.type === "hiring" ? "聘用联系" : "商业咨询"}
                </span>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 font-mono text-[10px] uppercase ${
                    message.status === "new"
                      ? "bg-cyan/20 text-cyan"
                      : "text-white/34"
                  }`}
                >
                  {message.status === "new" ? "未读" : message.status === "read" ? "已读" : "已归档"}
                </span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-white">
                {message.subject}
              </h2>
            </div>
            <time className="font-mono text-[11px] text-white/36">
              {new Date(message.created_at).toLocaleString("zh-CN")}
            </time>
          </div>

          <div className="mt-3 grid gap-4 text-xs md:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-1.5 text-white/54">
              <p className="text-white/80">{message.name || "未填写姓名"}</p>
              {message.email ? (
                <p className="inline-flex items-center gap-1.5">
                  <Mail aria-hidden="true" className="h-3 w-3" />
                  {message.email}
                </p>
              ) : (
                <p>未填写邮箱</p>
              )}
              <p>{message.company || "未填写公司"}</p>
              <p>{message.range || "未填写范围"}</p>
            </div>
            <div className="space-y-3 leading-6 text-white/58">
              <p className="whitespace-pre-wrap">
                {message.message || "未填写详细描述"}
              </p>
              <p className="whitespace-pre-wrap border-t border-white/10 pt-3">
                备注：{message.note || "无"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            <StatusButton id={message.id} status="read" label="标记已读" />
            <StatusButton id={message.id} status="archived" label="归档" />
            <form action={deleteMessage} onSubmit={(e) => { if (!confirm("确定删除此消息？此操作不可撤销。")) e.preventDefault(); }}>
              <input type="hidden" name="id" value={message.id} />
              <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300/20 px-3 text-xs text-red-200 transition hover:bg-red-300/10">
                <Trash2 aria-hidden="true" className="h-3 w-3" />
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
      <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 px-3 text-xs text-white/62 transition hover:border-white/30 hover:text-white">
        <Icon aria-hidden="true" className="h-3 w-3" />
        {label}
      </button>
    </form>
  );
}
