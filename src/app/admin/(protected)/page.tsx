export default function AdminDashboardPage() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Dashboard
      </p>
      <h2 className="mt-3 text-3xl font-semibold">控制台</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="作品草稿" value="0" />
        <Metric label="待处理消息" value="0" />
        <Metric label="待上传媒体" value="0" />
      </div>
      <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/62">
        CMS 基础正在搭建中。这里先保留真实空状态，后续计划会接入作品、媒体、页面和数据看板。
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
