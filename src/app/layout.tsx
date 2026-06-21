import type { Metadata } from "next";

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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SiteHeader siteSettings={settings} />
        {children}
      </body>
    </html>
  );
}
