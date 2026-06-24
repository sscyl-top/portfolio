import type { Metadata } from "next";
import type { Viewport } from "next";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};


import { SiteHeader } from "@/components/site/SiteHeader";
import { createServerCmsRepository } from "@/lib/cms/repository";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const repository = await createServerCmsRepository();
  const settings = await repository.getSiteSettings();

  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      type: "website",
      ...(settings.logoMediaUrl ? { images: [{ url: settings.logoMediaUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seoTitle,
      description: settings.seoDescription,
      ...(settings.logoMediaUrl ? { images: [settings.logoMediaUrl] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const repository = await createServerCmsRepository();
  const settings = await repository.getSiteSettings();

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#050505] text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <SiteHeader siteSettings={settings} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
