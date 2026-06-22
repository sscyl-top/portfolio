import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [{ count: draftCount }, { count: unreadCount }, { count: mediaCount }] =
    await Promise.all([
      supabase
        .from("works")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft")
        .is("deleted_at", null),
      supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false),
      supabase
        .from("media_assets")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
    ]);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Dashboard
      </p>
      <h2 className="mt-3 text-3xl font-semibold">控制台</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="作品草稿" value={String(draftCount ?? 0)} />
        <Metric label="未读消息" value={String(unreadCount ?? 0)} />
        <Metric label="媒体文件" value={String(mediaCount ?? 0)} />
      </div>
      <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/62">
        从这里管理作品、分类、媒体和网站设置。左侧导航可进入各模块。
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <p className="font-mono text-[10px] uppercase text-white/36">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
