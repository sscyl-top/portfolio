"use client";

import { useState, useRef, useEffect } from "react";
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
};

export function WorkMediaFrame({
  className = "",
  hover = false,
  media,
  tone,
  objectPosition,
  style,
}: WorkMediaFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const showImage = media && media.mimeType.startsWith("image/");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleLoad = () => {
    rafRef.current = requestAnimationFrame(() => {
      setLoaded(true);
    });
  };

  return (
    <>
      <div className={`absolute inset-0 ${toneClass(tone)} ${className}`} />
      {showImage ? (
        <Image
          alt={media.alt}
          className={`object-cover ${className} ${hover ? "transition duration-700 group-hover:scale-105" : ""}`}
          fill
          loading="lazy"
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          src={media.url}
          style={{
            objectPosition,
            ...style,
            opacity: loaded ? 1 : 0,
            transition: "opacity 700ms ease-out, transform 700ms ease-out",
          }}
          onLoad={handleLoad}
        />
      ) : null}
    </>
  );
}
