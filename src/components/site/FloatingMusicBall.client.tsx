"use client";

import dynamic from "next/dynamic";

const FloatingMusicBallInner = dynamic(
  () =>
    import("@/components/site/FloatingMusicBall").then(
      (mod) => mod.FloatingMusicBall,
    ),
  { ssr: false, loading: () => null },
);

export function FloatingMusicBall() {
  return <FloatingMusicBallInner />;
}
