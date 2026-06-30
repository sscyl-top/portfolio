"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

type Platform = "wechat" | "twitter" | "qq" | "weibo";

type ShareCardProps = {
  /** 分享标题 */
  title: string;
  /** 分享描述 */
  description: string;
  /** 分享图片 URL */
  imageUrl?: string;
  /** 分享链接（默认站点根 URL） */
  url: string;
  /** 站点名称 */
  siteName: string;
};

const PLATFORMS: { key: Platform; label: string; icon: string }[] = [
  { key: "wechat", label: "微信", icon: "💬" },
  { key: "twitter", label: "Twitter / X", icon: "🐦" },
  { key: "qq", label: "QQ", icon: "🐧" },
  { key: "weibo", label: "微博", icon: "🌐" },
];

/** 从 URL 提取显示用的域名 */
function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 微信卡片样式：缩略图在左，文字在右，紧凑布局 */
function WechatCard({ title, description, imageUrl, url }: ShareCardProps) {
  return (
    <div className="flex max-w-md gap-3 rounded-md bg-[#f7f7f7] p-3 text-[#1a1a1a] shadow-sm">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded bg-[#e5e5e5]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-[#999]">无图</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-medium leading-tight">{title || "未设置标题"}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-[#888]">{description || "未设置描述"}</p>
        <p className="mt-1 text-[10px] text-[#b2b2b2]">{getDomain(url)}</p>
      </div>
    </div>
  );
}

/** Twitter / X 卡片样式：大图在上，文字在下 */
function TwitterCard({ title, description, imageUrl, url, siteName }: ShareCardProps) {
  return (
    <div className="max-w-md overflow-hidden rounded-2xl border border-[#cfd9de] bg-white text-[#0f1419] shadow-sm">
      <div className="aspect-[1.91/1] w-full bg-[#e5e5e5]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-[#999]">无分享图</div>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-[13px] font-medium leading-tight">{title || "未设置标题"}</p>
        <p className="mt-1 line-clamp-1 text-[12px] text-[#536471]">{description || "未设置描述"}</p>
        <p className="mt-1 text-[11px] text-[#8899a6]">{getDomain(url)}</p>
      </div>
      <div className="border-t border-[#eff3f4] px-3 py-2 text-[11px] text-[#536471]">
        通过 {siteName || "站点"} 分享
      </div>
    </div>
  );
}

/** QQ 卡片样式：缩略图在右，文字在左 */
function QQCard({ title, description, imageUrl, url }: ShareCardProps) {
  return (
    <div className="flex max-w-md gap-3 rounded-md bg-white p-3 text-[#1a1a1a] shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-medium leading-tight">{title || "未设置标题"}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-[#888]">{description || "未设置描述"}</p>
        <p className="mt-1 text-[10px] text-[#12b7f5]">{getDomain(url)}</p>
      </div>
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded bg-[#e5e5e5]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-[#999]">无图</div>
        )}
      </div>
    </div>
  );
}

/** 微博卡片样式：大图带文字浮层 */
function WeiboCard({ title, description, imageUrl, url }: ShareCardProps) {
  return (
    <div className="max-w-md overflow-hidden rounded-md bg-white text-[#1a1a1a] shadow-sm">
      <div className="relative aspect-[1.91/1] w-full bg-[#e5e5e5]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-[#999]">无分享图</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="line-clamp-1 text-[12px] font-medium text-white">{title || "未设置标题"}</p>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-1 text-[11px] text-[#888]">{description || "未设置描述"}</p>
        <p className="mt-0.5 text-[10px] text-[#ff820f]">{getDomain(url)}</p>
      </div>
    </div>
  );
}

export function ShareCardPreview(props: ShareCardProps) {
  const [platform, setPlatform] = useState<Platform>("wechat");
  const [renderKey, setRenderKey] = useState(0);

  const current = PLATFORMS.find((p) => p.key === platform)!;

  return (
    <div className="space-y-3">
      {/* 平台切换 Tab */}
      <div className="flex flex-wrap items-center gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPlatform(p.key)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition ${
              platform === p.key
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <span>{p.icon}</span>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRenderKey((k) => k + 1)}
          title="重新渲染预览"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/40 transition hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          刷新
        </button>
      </div>

      {/* 卡片预览区 */}
      <div key={`${platform}-${renderKey}`} className="rounded-md bg-white/[0.02] p-4">
        {platform === "wechat" && <WechatCard {...props} />}
        {platform === "twitter" && <TwitterCard {...props} />}
        {platform === "qq" && <QQCard {...props} />}
        {platform === "weibo" && <WeiboCard {...props} />}
      </div>

      {/* 当前分享链接显示 */}
      <div className="flex items-center gap-2 rounded-md border border-white/8 bg-black/20 px-3 py-2 text-xs">
        <span className="text-white/40">当前预览链接：</span>
        <code className="min-w-0 flex-1 truncate font-mono text-white/70">{props.url}</code>
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan hover:underline"
        >
          打开 <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* OG 调试器外链 */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-white/40">OG 调试器：</span>
        <a
          href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(props.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan/80 hover:text-cyan hover:underline"
        >
          Facebook <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-white/20">·</span>
        <a
          href={`https://cards-dev.twitter.com/validator?url=${encodeURIComponent(props.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan/80 hover:text-cyan hover:underline"
        >
          Twitter <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-white/20">·</span>
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan/80 hover:text-cyan hover:underline"
        >
          查看页面源码 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
