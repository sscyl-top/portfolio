import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { siteSettings } from "@/data/portfolio";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteSettings.name} | ${siteSettings.title}`,
  description: siteSettings.description,
  openGraph: {
    title: `${siteSettings.name} | ${siteSettings.title}`,
    description: siteSettings.description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
