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
  const showImage = media && media.mimeType.startsWith("image/");

  return (
    <>
      <div className={`absolute inset-0 ${toneClass(tone)} ${className}`} />
      {showImage ? (
        <Image
          alt={media.alt}
          className={`object-cover ${className} ${hover ? "transition-transform duration-700 group-hover:scale-105" : ""}`}
          fill
          loading={priority ? "eager" : "lazy"}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          src={media.url}
          style={{
            objectPosition,
            ...style,
          }}
          priority={priority}
        />
      ) : null}
    </>
  );
}
