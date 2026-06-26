import type { Metadata } from "next";
import type { Viewport } from "next";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};


import { AnalyticsTracker } from "@/components/admin/AnalyticsTracker";
import { VisualEditorHint } from "@/components/cms/VisualEditorHint";
import { FloatingMusicBall } from "@/components/site/FloatingMusicBall.client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { GlobalDragDropPrevention } from "@/components/GlobalDragDropPrevention";
import { createPublicCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const repository = createPublicCmsRepository();
  const settings = await repository.getSiteSettings();

  const imageUrl =
    settings.shareMediaUrl ?? settings.logoMediaUrl ?? settings.avatarMediaUrl;

  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    manifest: "/manifest.webmanifest",
    icons: imageUrl ? { icon: imageUrl, apple: imageUrl } : undefined,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seoTitle,
      description: settings.seoDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

const NAV_TEXT_KEYS = [
  "global.nav.home",
  "global.nav.works",
  "global.nav.resume",
];

function applyNavTextOverrides(
  navigation: Array<{ href: string; label: string }>,
  texts: Record<string, { content: string; styles: Record<string, string> }>,
) {
  const pick = (key: string) => {
    const content = texts[key]?.content;
    return content && content !== key ? content : undefined;
  };

  const labelByHref: Record<string, string | undefined> = {
    "/": pick("global.nav.home"),
    "/works": pick("global.nav.works"),
    "/resume": pick("global.nav.resume"),
  };

  return navigation.map((item) => {
    const override = labelByHref[item.href];
    return override ? { ...item, label: override } : item;
  });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const repository = createPublicCmsRepository();
  const [settings, navTexts] = await Promise.all([
    repository.getSiteSettings(),
    getTextContentsByKeys(NAV_TEXT_KEYS),
  ]);

  settings.navigation = applyNavTextOverrides(settings.navigation, navTexts);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#050505] text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <GlobalDragDropPrevention />
        <SiteHeader siteSettings={settings} />
        {children}
        <FloatingMusicBall />
        <VisualEditorHint />
        <AnalyticsTracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
