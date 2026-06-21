import { createSupabaseServerClient } from "@/lib/supabase/server";

import { MessageList, type ContactMessage } from "./MessageList";

export default async function AdminMessagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  const messages = (data ?? []) as ContactMessage[];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Contact inbox
      </p>
      <h2 className="mt-3 text-3xl font-semibold">联系消息</h2>
      <p className="mb-6 mt-3 font-mono text-xs text-white/38">
        {messages.length} 条消息
      </p>

      {error ? (
        <p className="rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          消息读取失败：{error.message}
        </p>
      ) : (
        <MessageList messages={messages} />
      )}
    </div>
  );
}
