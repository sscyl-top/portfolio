"use client";

import { useEffect } from "react";

const SECTION_TITLES: Record<string, string> = {
  "section-featured": "sscyl.top-代表作",
  "section-works": "sscyl.top-全部作品",
  "section-composite": "sscyl.top-复合设计",
};

export function SectionTitleObserver() {
  useEffect(() => {
    const sections = Object.keys(SECTION_TITLES)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const id = visible[0].target.id;
          const title = SECTION_TITLES[id];
          if (title && document.title !== title) {
            document.title = title;
          }
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return null;
}
