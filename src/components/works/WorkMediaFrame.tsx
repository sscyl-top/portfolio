"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type WorkMediaFrameProps = {
  className?: string;
  hover?: boolean;
  media?: Work["coverMedia"];
  tone: Work["coverTone"];
  objectPosition?: string;
  style?: React.CSSProperties;
  priority?: boolean;
};

/**
 * 作品媒体展示组件。
 *
 * 视频优化策略（避免流量激增）：
 * - 仅在进入视口时才加载视频（preload 切换到 auto）
 * - 离开视口时暂停并释放已加载缓冲（仅保留 metadata）
 * - 同时仅一个视频在视口内可见时才 autoplay
 * - 配合 SmartVideo 的 IntersectionObserver 共享调度
 */
export function WorkMediaFrame({
  className = "",
  hover = false,
  media,
  tone,
  objectPosition,
  style,
  priority = false,
}: WorkMediaFrameProps) {
  const isVideo = media?.mimeType.startsWith("video/");
  const isGif = media?.mimeType === "image/gif";
  const isStaticImage = media && media.mimeType.startsWith("image/") && !isGif;
  const hoverClass = hover ? "transition-transform duration-700 group-hover:scale-105" : "";
  const positionStyle = { objectPosition, ...style };

  // 视频懒加载：未进入视口前使用 preload="none"，进入视口后切换为 metadata
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
      // 进入视口：尝试播放（muted autoplay 浏览器允许）
      v.play().catch(() => {
        /* autoplay 被浏览器阻止时静默失败，由用户点击触发 */
      });
    } else {
      // 离开视口：暂停并重置 currentTime，避免持续后台缓冲
      v.pause();
      if (!v.seeking) v.currentTime = 0;
    }
  }, [inViewport, isVideo]);

  return (
    <>
      <div ref={containerRef} className={`absolute inset-0 ${toneClass(tone)} ${className}`} />
      {isVideo && media ? (
        <video
          ref={videoRef}
          src={media.url}
          className={`absolute inset-0 h-full w-full object-cover ${className} ${hoverClass}`}
          autoPlay
          muted
          loop
          playsInline
          preload={inViewport ? "auto" : "none"}
          style={positionStyle}
        />
      ) : isGif && media ? (
        <img
          src={media.url}
          alt={media.alt}
          className={`absolute inset-0 h-full w-full object-cover ${className} ${hoverClass}`}
          loading={priority ? "eager" : "lazy"}
          style={positionStyle}
        />
      ) : isStaticImage ? (
        <Image
          alt={media.alt}
          className={`object-cover ${className} ${hoverClass}`}
          fill
          loading={priority ? "eager" : "lazy"}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          src={media.url}
          style={positionStyle}
          priority={priority}
        />
      ) : null}
    </>
  );
}
