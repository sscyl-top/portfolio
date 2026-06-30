import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// 自托管 Geist 字体：构建时下载，浏览器零 Google Fonts 请求
// 用 CSS variable 模式注入，由 globals.css 中的 --font-sans / --font-mono 引用
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

// ISR 策略：默认页面可被静态生成 + 按需 revalidate
// 后台所有写入操作（Server Actions + API）通过 revalidatePath 触发刷新
// 数据高度动态的页面（如 /admin）在子布局中单独设 dynamic='force-dynamic'
export const revalidate = 60; // 兜底：60 秒后台自动重新生成，避免 revalidatePath 漏掉时永久缓存

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// metadataBase：让 OG/Twitter 图片 URL 解析为线上地址，而非 localhost
// 注意：不能同时导出 metadata 和 generateMetadata，所以 metadataBase 放在 generateMetadata 的返回值里


import { AnalyticsTracker } from "@/components/admin/AnalyticsTracker";
import { FloatingMusicBall } from "@/components/site/FloatingMusicBall.client";
import { GlobalPageLoader } from "@/components/site/GlobalPageLoader";
import { SiteHeader } from "@/components/site/SiteHeader";
import { GlobalDragDropPrevention } from "@/components/GlobalDragDropPrevention";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const repository = await createServerCmsRepository();
  const settings = await repository.getSiteSettings();

  const imageUrl =
    settings.shareMediaUrl ?? settings.logoMediaUrl ?? settings.avatarMediaUrl;

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://sscyl.top",
    ),
    title: settings.seoTitle,
    description: settings.seoDescription,
    manifest: "/manifest.webmanifest",
    applicationName: "sscyl.top",
    authors: [{ name: "陈涛涛" }],
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
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const repository = await createServerCmsRepository();
  const [settings, navTexts] = await Promise.all([
    repository.getSiteSettings(),
    getTextContentsByKeys(NAV_TEXT_KEYS),
  ]);

  settings.navigation = applyNavTextOverrides(settings.navigation, navTexts);

  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <ThemeProvider>
          <GlobalPageLoader />
          <GlobalDragDropPrevention />
          <SiteHeader siteSettings={settings} />

          {children}
          {modal}
          <FloatingMusicBall />
          <AnalyticsTracker />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
