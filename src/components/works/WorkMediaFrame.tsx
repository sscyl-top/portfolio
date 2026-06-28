"use client";

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

  return (
    <>
      <div className={`absolute inset-0 ${toneClass(tone)} ${className}`} />
      {isVideo && media ? (
        <video
          src={media.url}
          className={`absolute inset-0 h-full w-full object-cover ${className} ${hoverClass}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
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
