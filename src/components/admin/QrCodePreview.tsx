"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";

type QrCodePreviewProps = {
  /** 站点根 URL */
  baseUrl: string;
  /** 站点名称 */
  siteName: string;
};

type Theme = "dark" | "light";

/** 从 URL 提取显示用的简短标签 */
function getUrlLabel(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname === "/" || u.pathname === "") return "站点首页";
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments[0] === "works" && segments[1]) return `作品: ${decodeURIComponent(segments[1])}`;
    if (segments[0] === "resume") return "简历页";
    return u.pathname;
  } catch {
    return url;
  }
}

export function QrCodePreview({ baseUrl, siteName }: QrCodePreviewProps) {
  const [customUrl, setCustomUrl] = useState(baseUrl);
  const [theme, setTheme] = useState<Theme>("dark");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // 生成二维码
  useEffect(() => {
    const colors = theme === "dark"
      ? { dark: "#ffffff", light: "#050505" }
      : { dark: "#050505", light: "#ffffff" };
    QRCode.toDataURL(customUrl, {
      width: 256,
      margin: 2,
      color: colors,
      errorCorrectionLevel: "M",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [customUrl, theme]);

  const urlLabel = useMemo(() => getUrlLabel(customUrl), [customUrl]);

  // 快捷链接选项
  const quickLinks = useMemo(() => [
    { label: "站点首页", url: baseUrl },
    { label: "作品列表", url: `${baseUrl}/works` },
    { label: "简历页", url: `${baseUrl}/resume` },
  ], [baseUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // best-effort
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qrcode-${theme}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* 主题切换 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">主题：</span>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
            theme === "dark"
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          深色背景
        </button>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
            theme === "light"
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          浅色背景
        </button>
      </div>

      {/* 自定义 URL 输入 */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/50">二维码链接</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://..."
            className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] text-white/60 transition hover:border-cyan/30 hover:text-cyan"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
        <p className="text-[10px] text-white/34">
          当前指向：{urlLabel}
        </p>
      </div>

      {/* 快捷链接 */}
      <div className="flex flex-wrap gap-1.5">
        {quickLinks.map((link) => (
          <button
            key={link.url}
            type="button"
            onClick={() => setCustomUrl(link.url)}
            className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
              customUrl === link.url
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* 二维码预览 */}
      <div className="flex items-start gap-4">
        <div className={`rounded-md border p-2 ${theme === "dark" ? "border-white/10 bg-black" : "border-white/20 bg-white"}`}>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="二维码" className="h-32 w-32" />
          ) : (
            <div className="grid h-32 w-32 place-items-center text-[10px] text-white/40">
              生成中...
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-white/60">
            扫码访问<span className="text-white/80"> {siteName || "站点" }</span>
          </p>
          <p className="break-all font-mono text-[10px] text-white/34">
            {customUrl}
          </p>
          <button
            type="button"
            onClick={downloadQr}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 transition hover:border-cyan/30 hover:text-cyan"
          >
            下载二维码 PNG
          </button>
        </div>
      </div>
    </div>
  );
}
