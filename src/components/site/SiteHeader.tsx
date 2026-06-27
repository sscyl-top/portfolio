import Image from "next/image";
import Link from "next/link";

import { siteSettings as staticSiteSettings } from "@/data/portfolio";
import type { PublicSiteSettings } from "@/lib/cms/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const defaultSiteSettings: PublicSiteSettings = {
  ctaCardScale: 1,
  ctaCardOffsetX: 0,
  ctaCardOffsetY: 0,
  ctaFigureScale: 1,
  ctaFigureOffsetX: 0,
  ctaFigureOffsetY: 0,
  description: staticSiteSettings.description,
  name: staticSiteSettings.name,
  navigation: staticSiteSettings.navigation,
  nickname: staticSiteSettings.logo,
  seoDescription: staticSiteSettings.description,
  seoTitle: staticSiteSettings.name,
  socialLinks: staticSiteSettings.socialLinks,
  title: staticSiteSettings.title,
};

export async function SiteHeader({
  siteSettings = defaultSiteSettings,
}: {
  siteSettings?: PublicSiteSettings;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const avatarHref = user ? "/admin" : "/resume";

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)]">
      <nav className="mx-auto grid h-14 max-w-[1420px] grid-cols-[1fr_auto_1fr] items-center px-3 md:h-24 md:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-4"
          aria-label={`${siteSettings.name} 首页`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] md:h-12 md:w-12">
            {siteSettings.logoMediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={siteSettings.logoMediaUrl}
                alt=""
                className="h-full w-full object-contain md:h-12 md:w-12"
              />
            ) : (
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-md border border-dashed border-white/24 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.28),transparent_38%),linear-gradient(135deg,rgba(139,215,205,0.18),rgba(201,162,127,0.16))] md:h-7 md:w-7"
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
                prefetch={true}
                className="relative px-3 py-2 text-sm text-white/62 transition after:absolute after:inset-x-4 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-white/70 after:transition-transform hover:text-white hover:after:scale-x-100 md:px-5 md:py-3 md:text-base"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {siteSettings.avatarMediaUrl ? (
          <Link
            href={avatarHref}
            className="justify-self-end grid place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] transition hover:border-white/25 h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12"
            aria-label={user ? "进入后台" : "查看简历"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteSettings.avatarMediaUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </Link>
        ) : (
          <Link
            href={avatarHref}
            className="justify-self-end grid h-10 w-20 place-items-center sm:h-12 sm:w-28 md:h-16 md:w-40"
            aria-label={user ? "进入后台" : "查看简历"}
          >
            <Image
              src="/brand/infinite-progress-logo.svg"
              alt="无限进步"
              width={120}
              height={30}
              className="h-auto w-[4.5rem] sm:w-28 md:w-32"
              priority
            />
          </Link>
        )}
      </nav>
    </header>
  );
}
