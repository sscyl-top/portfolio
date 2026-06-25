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
            __html: `#__initial_loader{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#050505;transition:opacity .6s ease;}#__initial_loader.hidden{opacity:0;pointer-events:none;}#__initial_loader-text{color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:clamp(1.25rem,5vw,2.75rem);font-weight:300;letter-spacing:.035em;line-height:1;}#__initial_loader-pct{color:#8bd7cd;font-variant-numeric:tabular-nums;margin-left:.35em;}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#050505] text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <div id="__initial_loader" aria-hidden="true">
          <p id="__initial_loader-text">hello@sscyl.top<span id="__initial_loader-pct">0%</span></p>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var _f=0,_p=0,_loaded=!1;var pctEl=document.getElementById("__initial_loader-pct");function setPct(v){v=Math.min(100,Math.max(0,Math.round(v)));if(v!==_p){_p=v;if(pctEl)pctEl.textContent=v+"%";}}function done(){if(_f)return;_f=1;setPct(100);var l=document.getElementById("__initial_loader");if(!l){return;}l.classList.add("hidden");setTimeout(function(){if(l.parentNode)l.parentNode.removeChild(l);},650);}var alreadyComplete=document.readyState==="complete";var dur=alreadyComplete?400:1200;var minDisplay=alreadyComplete?200:600;var start=performance.now();var maxTimeout=setTimeout(done,4000);function tick(now){if(_f)return;var elapsed=now-start;var t=Math.min(1,elapsed/dur);setPct(t*100);if(_loaded&&t>=1){var wait=Math.max(0,minDisplay-elapsed);setTimeout(done,wait);return;}if(t>=1){setPct(100);if(_loaded){done();}return;}requestAnimationFrame(tick);}function onLoad(){if(_f)return;_loaded=!0;clearTimeout(maxTimeout);if(_p>=100){var elapsed=performance.now()-start;var wait=Math.max(0,minDisplay-elapsed);setTimeout(done,wait);}}if(alreadyComplete){_loaded=!0;}else{window.addEventListener("load",onLoad);window.addEventListener("pageshow",function(e){if(e.persisted)done();});}requestAnimationFrame(tick);})();`,
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
