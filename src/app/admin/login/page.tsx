import { defaultAdminEmail } from "@/lib/admin";

import { loginAdmin } from "../actions";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  login: "邮箱或密码错误。",
  unauthorized: "该账号没有后台访问权限。",
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { error: errorCode } = await searchParams;

  return (
    <main className="min-h-screen bg-[#07090b] px-5 py-24 text-white">
      <section className="mx-auto max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
          Private access
        </p>
        <h1 className="mt-4 text-4xl font-semibold">后台登录</h1>
        <form
          action={loginAdmin}
          className="mt-8 rounded-md border border-white/10 bg-white/[0.035] p-5"
        >
          <label className="block text-sm text-white/64">
            邮箱
            <input
              type="email"
              name="email"
              defaultValue={defaultAdminEmail}
              required
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-cyan"
            />
          </label>
          <label className="mt-4 block text-sm text-white/64">
            密码
            <input
              type="password"
              name="password"
              required
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-cyan"
            />
          </label>
          {errorCode ? (
            <p className="mt-4 text-sm text-red-300">
              {errorMessages[errorCode] ?? "登录失败。"}
            </p>
          ) : null}
          <button className="mt-6 min-h-11 w-full rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-cyan">
            登录后台
          </button>
        </form>
      </section>
    </main>
  );
}
