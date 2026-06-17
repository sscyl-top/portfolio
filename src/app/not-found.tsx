import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
          404
        </p>
        <h1 className="mt-5 text-5xl font-semibold text-white">页面不存在</h1>
        <p className="mt-5 leading-8 text-white/58">
          这个作品可能还没有发布，或者链接已经变更。
        </p>
        <Link
          href="/works"
          className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
        >
          返回作品页
        </Link>
      </div>
    </main>
  );
}
