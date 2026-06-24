import Image from "next/image";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type WorkMediaFrameProps = {
  /** 图片填充方式，默认 cover（封面/Hero 等场景） */
  fit?: "cover" | "contain";
  className?: string;
  hover?: boolean;
  media?: Work["coverMedia"];
  tone: Work["coverTone"];
  objectPosition?: string;
  style?: React.CSSProperties;
};

export function WorkMediaFrame({
  fit = "cover",
  className = "",
  hover = false,
  media,
  tone,
  objectPosition,
  style,
}: WorkMediaFrameProps) {
  const showImage = media && media.mimeType.startsWith("image/");

  return (
    <>
      <div
        className={`absolute inset-0 ${showImage ? "bg-black" : toneClass(tone)} ${className}`}
      />
      {showImage ? (
        <Image
          alt={media.alt}
          className={`object-${fit} ${className} ${hover ? "transition duration-700 group-hover:scale-105" : ""}`}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
          src={media.url}
          style={objectPosition ? { objectPosition, ...style } : style}
        />
      ) : null}
    </>
  );
}
