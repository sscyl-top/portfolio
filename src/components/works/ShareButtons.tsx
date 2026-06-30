"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2, X } from "lucide-react";

type ShareButtonsProps = {
  /** 分享标题 */
  title: string;
  /** 分享描述 */
  description?: string;
  /** 当前页面 URL */
  url?: string;
  /** 分享图 URL（可选） */
  imageUrl?: string;
};

/** 平台分享链接生成器 */
function buildShareLinks(url: string, title: string, description: string, imageUrl?: string): {
  weibo: string;
  twitter: string;
  qq: string;
  linkedin: string;
  facebook: string;
} {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);
  const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : "";

  return {
    weibo: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}&pic=${encodedImage}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    qq: `https://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDesc}&pics=${encodedImage}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

export function ShareButtons({ title, description = "", url, imageUrl }: ShareButtonsProps) {
  const [currentUrl, setCurrentUrl] = useState(url ?? "");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 浏览器环境获取当前 URL
    if (!url) {
      setCurrentUrl(window.location.href);
    }
  }, [url]);

  // 动态生成二维码（仅在需要时加载 qrcode 库）
  useEffect(() => {
    if (!showQr || !currentUrl) return;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      QRCode.toDataURL(currentUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#0a0a0a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then(setQrDataUrl)
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [showQr, currentUrl]);

  const desc = description || title;
  const shareLinks = buildShareLinks(currentUrl, title, desc, imageUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback：旧浏览器
      const textarea = document.createElement("textarea");
      textarea.value = currentUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // best-effort
      }
      document.body.removeChild(textarea);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: desc,
          url: currentUrl,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      handleCopy();
    }
  };

  // 服务端渲染时输出占位结构，避免 hydration mismatch
  if (!mounted) {
    return <div className="h-9" />;
  }

  const platforms: { key: string; label: string; href: string; color: string; icon: string }[] = [
    { key: "weibo", label: "微博", href: shareLinks.weibo, color: "hover:text-[#ff820f]", icon: "🌐" },
    { key: "twitter", label: "Twitter", href: shareLinks.twitter, color: "hover:text-[#1d9bf0]", icon: "🐦" },
    { key: "qq", label: "QQ", href: shareLinks.qq, color: "hover:text-[#12b7f5]", icon: "🐧" },
    { key: "linkedin", label: "LinkedIn", href: shareLinks.linkedin, color: "hover:text-[#0a66c2]", icon: "💼" },
    { key: "facebook", label: "Facebook", href: shareLinks.facebook, color: "hover:text-[#1877f2]", icon: "📘" },
  ];

  return (
    <div className="relative">
      {/* 分享按钮组 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 复制链接 */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan"
          aria-label="复制链接"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制链接"}
        </button>

        {/* 二维码 */}
        <button
          type="button"
          onClick={() => setShowQr(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
            showQr
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-cyan/30 hover:text-cyan"
          }`}
          aria-label="二维码"
        >
          <Link2 className="h-3.5 w-3.5" />
          二维码
        </button>

        {/* 原生分享（移动端可用） */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-cyan/30 hover:text-cyan"
          aria-label="分享"
        >
          <Share2 className="h-3.5 w-3.5" />
          分享
        </button>

        {/* 平台分享 */}
        {platforms.map((p) => (
          <a
            key={p.key}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-white/20 ${p.color}`}
            aria-label={`分享到 ${p.label}`}
          >
            <span>{p.icon}</span>
            {p.label}
          </a>
        ))}
      </div>

      {/* 二维码弹层 */}
      {showQr && (
        <div className="absolute z-50 mt-2 rounded-md border border-white/10 bg-[#0a0c0f] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-xs text-white/70">扫码分享</span>
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="text-white/40 hover:text-white"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="页面二维码" className="h-40 w-40 rounded bg-white p-1" />
          ) : (
            <div className="grid h-40 w-40 place-items-center rounded bg-white/5 text-xs text-white/40">
              生成中...
            </div>
          )}
          <p className="mt-2 max-w-[180px] break-all text-center text-[10px] text-white/40">
            {currentUrl}
          </p>
        </div>
      )}
    </div>
  );
}
