import Link from "next/link";

import { siteSettings } from "@/data/portfolio";

export function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/45 backdrop-blur-xl">
      <nav className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.04] font-mono text-sm text-white">
            {siteSettings.logo}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold tracking-[0.18em] text-white">
              {siteSettings.name}
            </span>
            <span className="block truncate font-mono text-[11px] text-white/45">
              {siteSettings.title}
            </span>
          </span>
        </Link>

        <div className="justify-self-center rounded-full border border-white/10 bg-white/[0.035] p-1">
          <div className="flex items-center gap-1">
            {siteSettings.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-white/62 transition hover:bg-white/10 hover:text-white max-sm:px-3"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden justify-self-end rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-right md:block">
          <p className="text-sm font-black tracking-[0.16em] text-white">
            无限进步
          </p>
          <p className="font-mono text-[10px] uppercase text-white/40">
            Infinite Progress
          </p>
        </div>
      </nav>
    </header>
  );
}
