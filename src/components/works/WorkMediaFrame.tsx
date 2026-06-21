import Image from "next/image";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type WorkMediaFrameProps = {
  className?: string;
  hover?: boolean;
  media?: Work["coverMedia"];
  tone: Work["coverTone"];
};

export function WorkMediaFrame({
  className = "",
  hover = false,
  media,
  tone,
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
          className={`object-cover ${className} ${hover ? "transition duration-700 group-hover:scale-105" : ""}`}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
          src={media.url}
        />
      ) : null}
    </>
  );
}
