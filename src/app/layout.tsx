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
            __html: `#__initial_loader{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#000;transition:opacity .5s ease;}#__initial_loader.hidden{opacity:0;pointer-events:none;}#__initial_loader-inner{text-align:center;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}#__initial_loader-text{margin:0;font-size:1.875rem;font-weight:300;line-height:1;letter-spacing:.035em;}@media(min-width:768px){#__initial_loader-text{font-size:3rem;}}#__initial_loader-pct{font-variant-numeric:tabular-nums;white-space:pre;}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#050505] text-foreground antialiased [-webkit-tap-highlight-color:transparent]">
        <div id="__initial_loader" aria-hidden="true">
          <div id="__initial_loader-inner">
            <p id="__initial_loader-text">hello@sscyl.top <span id="__initial_loader-pct">0%</span></p>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var finished=0,currentPct=0,pageLoaded=0,animStarted=0;var pctEl=document.getElementById("__initial_loader-pct");var loaderEl=document.getElementById("__initial_loader");function setPct(v){v=Math.min(100,Math.max(0,Math.round(v)));if(v===currentPct)return;currentPct=v;if(pctEl)pctEl.textContent=" "+v+"%";}function hideLoader(){if(finished)return;finished=1;setPct(100);if(!loaderEl)return;loaderEl.classList.add("hidden");setTimeout(function(){if(loaderEl.parentNode)loaderEl.parentNode.removeChild(loaderEl);},550);}var DURATION=1200;var HIDE_DELAY=120;var startTime=0;var safeTimer=setTimeout(hideLoader,5000);var rafId=0;function tick(){if(finished)return;var elapsed=performance.now()-startTime;var t=Math.min(1,elapsed/DURATION);setPct(t*100);if(t>=1){if(pageLoaded){setTimeout(hideLoader,HIDE_DELAY);}return;}rafId=requestAnimationFrame(tick);}function startAnim(){if(animStarted)return;animStarted=1;startTime=performance.now();rafId=requestAnimationFrame(tick);}function onPageLoad(){if(pageLoaded)return;pageLoaded=1;clearTimeout(safeTimer);if(currentPct>=100){setTimeout(hideLoader,HIDE_DELAY);}else if(!animStarted){startAnim();}else{var elapsed=performance.now()-startTime;var remaining=Math.max(0,DURATION-elapsed+HIDE_DELAY);setTimeout(hideLoader,remaining);}}window.addEventListener("pageshow",function(e){if(e.persisted)hideLoader();});requestAnimationFrame(function(){requestAnimationFrame(startAnim);});if(document.readyState==="complete"){setTimeout(onPageLoad,0);}else{window.addEventListener("load",onPageLoad);}})();`,
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
