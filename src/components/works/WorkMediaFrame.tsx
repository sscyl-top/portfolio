"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

/** 微信内置浏览器(X5/WKWebView)视频兼容属性 */
const wxVideoAttrs: Record<string, string> = {
  "x5-video-player-type": "h5",
  "x5-video-player-fullscreen": "false",
  "webkit-playsinline": "true",
};

type WorkMediaFrameProps = {
  className?: string;
  hover?: boolean;
  media?: Work["coverMedia"];
  tone: Work["coverTone"];
  objectPosition?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  /** 可选 poster 图（用于视频加载前显示） */
  posterUrl?: string;
};

/**
 * 作品媒体展示组件。
 *
 * 加载策略：
 * - 视频：先显示骨架占位（脉冲动画），loadeddata 后淡出
 * - 图片：首屏 priority=true 立即加载，其他 lazy
 * - 视频懒加载：未进入视口 preload="none"，进入视口 preload="metadata"
 */
export function WorkMediaFrame({
  className = "",
  hover = false,
  media,
  tone,
  objectPosition,
  style,
  priority = false,
  posterUrl,
}: WorkMediaFrameProps) {
  const isVideo = media?.mimeType.startsWith("video/");
  const isGif = media?.mimeType === "image/gif";
  const isStaticImage = media && media.mimeType.startsWith("image/") && !isGif;
  const hoverClass = hover ? "transition-transform duration-700 group-hover:scale-105" : "";
  const positionStyle = { objectPosition, ...style };

  // 媒体加载状态：未加载完前显示骨架占位
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // 视频懒加载
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    if (!isVideo || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.3);
        }
      },
      { threshold: [0, 0.3, 0.6, 1], rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  // 离开视口时暂停视频，回到视口时恢复
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const v = videoRef.current;
    if (inViewport) {
      v.play().catch(() => {});
      // 微信内置浏览器需要 WeixinJSBridgeReady 后才能播放
      const tryPlay = () => v.play().catch(() => {});
      document.addEventListener("WeixinJSBridgeReady", tryPlay, { once: true });
      return () => document.removeEventListener("WeixinJSBridgeReady", tryPlay);
    } else {
      v.pause();
      if (!v.seeking) v.currentTime = 0;
    }
  }, [inViewport, isVideo]);

  // 超时兜底：微信X5可能不触发 loadeddata/canplay
  useEffect(() => {
    if (!isVideo) return;
    const t = setTimeout(() => setMediaLoaded(true), 3500);
    return () => clearTimeout(t);
  }, [isVideo]);

  // 图片优先使用 thumbUrl（多尺寸优化），回退到 url
  const imageUrl = media?.thumbUrl ?? media?.url;

  return (
    <>
      {/* 底层 toneClass 渐变（设计风格保留） */}
      <div ref={containerRef} className={`absolute inset-0 ${toneClass(tone)} ${className}`} />

      {/* 骨架占位：媒体未加载完时显示脉冲动画，避免黑背景 */}
      {!mediaLoaded && (
        <div
          className={`absolute inset-0 ${className} animate-pulse bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent`}
          aria-hidden="true"
        />
      )}

      {/* 可选 poster 图（视频加载前显示静态封面） */}
      {isVideo && posterUrl && !mediaLoaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt={media?.alt ?? ""}
          className={`absolute inset-0 h-full w-full object-cover ${className}`}
          style={positionStyle}
        />
      )}

      {isVideo && media ? (
        <video
          ref={videoRef}
          src={media.url}
          className={`absolute inset-0 h-full w-full object-cover ${className} ${hoverClass} transition-opacity duration-300 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload={inViewport ? "metadata" : "none"}
          poster={posterUrl}
          onLoadedData={() => setMediaLoaded(true)}
          onCanPlay={() => setMediaLoaded(true)}
          onLoadedMetadata={() => setMediaLoaded(true)}
          style={positionStyle}
          {...wxVideoAttrs}
        />
      ) : isGif && media ? (
        <img
          src={media.url}
          alt={media.alt}
          className={`absolute inset-0 h-full w-full object-cover ${className} ${hoverClass} transition-opacity duration-300 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setMediaLoaded(true)}
          style={positionStyle}
        />
      ) : isStaticImage && media ? (
        <Image
          alt={media.alt}
          className={`object-cover ${className} ${hoverClass}`}
          fill
          loading={priority ? "eager" : "lazy"}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          src={imageUrl ?? media.url}
          style={positionStyle}
          priority={priority}
          onLoad={() => setMediaLoaded(true)}
        />
      ) : null}
    </>
  );
}
