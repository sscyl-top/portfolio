import type { BackendReadiness } from "@/lib/supabase/config";

type SetupNoticeProps = {
  readiness: BackendReadiness;
};

export function SetupNotice({ readiness }: SetupNoticeProps) {
  return (
    <main className="min-h-screen bg-[#07090b] px-5 py-24 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
          Admin setup
        </p>
        <h1 className="mt-4 text-4xl font-semibold">后台等待配置</h1>
        <div className="mt-8 rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/64">
          <p>
            当前后台还不能连接 Supabase。请按项目根目录的{" "}
            <code>.env.example</code> 配置环境变量，并执行{" "}
            <code>supabase/migrations</code> 中的迁移。
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusItem label="Supabase" ready={readiness.supabase} />
            <StatusItem label="联系邮件" ready={readiness.contactEmail} />
            <StatusItem label="CMS" ready={readiness.cms} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function StatusItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-md border border-white/10 px-3 py-2">
      <dt className="font-mono text-[10px] uppercase text-white/36">{label}</dt>
      <dd className={ready ? "text-cyan" : "text-white/48"}>
        {ready ? "已配置" : "未配置"}
      </dd>
    </div>
  );
}
