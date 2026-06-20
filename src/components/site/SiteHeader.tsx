import Link from "next/link";
import Image from "next/image";

import { siteSettings } from "@/data/portfolio";

const headerLogoSrc = "";

export function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/45 backdrop-blur-xl">
      <nav className="mx-auto grid h-24 max-w-[1420px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-4"
          aria-label={`${siteSettings.name} 首页`}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/15 bg-white/[0.04]">
            {headerLogoSrc ? (
              <Image
                src={headerLogoSrc}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            ) : (
              <span
                aria-hidden="true"
                className="h-7 w-7 rounded-md border border-dashed border-white/24 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.28),transparent_38%),linear-gradient(135deg,rgba(139,215,205,0.18),rgba(201,162,127,0.16))]"
              />
            )}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-base font-semibold tracking-[0.18em] text-white">
              {siteSettings.name}
            </span>
            <span className="mt-1 block truncate font-mono text-xs text-white/45">
              {siteSettings.title}
            </span>
          </span>
        </Link>

        <div className="justify-self-center">
          <div className="flex items-center gap-1">
            {siteSettings.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-5 py-3 text-base text-white/62 transition after:absolute after:inset-x-5 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-white/70 after:transition-transform hover:text-white hover:after:scale-x-100 max-sm:px-3 max-sm:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden justify-self-end md:grid md:h-16 md:w-40 md:place-items-center">
          <Image
            src="/brand/infinite-progress-logo.svg"
            alt="无限进步"
            width={120}
            height={30}
            className="h-auto w-32"
            priority
          />
        </div>
      </nav>
    </header>
  );
}
