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
import { createServerCmsRepository } from "@/lib/cms/repository";
import { getTextContentsByKeys } from "@/lib/cms/text-content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const repository = await createServerCmsRepository();
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
  const repository = await createServerCmsRepository();
  const [settings, navTexts] = await Promise.all([
    repository.getSiteSettings(),
    getTextContentsByKeys(NAV_TEXT_KEYS),
  ]);

  settings.navigation = applyNavTextOverrides(settings.navigation, navTexts);

  return (
    <html lang="zh-CN">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `#__initial_loader{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#050505;transition:opacity .6s ease;}#__initial_loader.hidden{opacity:0;pointer-events:none;}#__initial_loader-text{color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:clamp(1.25rem,5vw,2.75rem);font-weight:300;letter-spacing:.035em;line-height:1;}#__initial_loader-cursor{display:inline-block;width:.5em;height:1em;margin-left:2px;background:#8bd7cd;vertical-align:-0.1em;animation:__blink 1s steps(1) infinite;}@keyframes __blink{0%,50%{opacity:1}51%,100%{opacity:0}}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#050505] text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <div id="__initial_loader" aria-hidden="true">
          <p id="__initial_loader-text">hello@sscyl.top<span id="__initial_loader-cursor" /></p>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var _f=0;function done(){if(_f)return;_f=1;var l=document.getElementById("__initial_loader");if(!l){return;}l.classList.add("hidden");setTimeout(function(){if(l.parentNode)l.parentNode.removeChild(l);},650);}var start=performance.now();var minDisplay=600;var maxTimeout=setTimeout(done,4000);function finish(){if(_f)return;clearTimeout(maxTimeout);var elapsed=performance.now()-start;var wait=Math.max(0,minDisplay-elapsed);setTimeout(done,wait);}if(document.readyState==="complete"){setTimeout(done,100);}else{window.addEventListener("load",finish);window.addEventListener("pageshow",function(e){if(e.persisted)done();});(function c(){if(_f)return;if(document.readyState==="complete"){finish();}else{requestAnimationFrame(c);}})();}})();`,
          }}
        />
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
