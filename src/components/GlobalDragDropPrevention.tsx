"use client";

import { useEffect } from "react";

export function GlobalDragDropPrevention() {
  useEffect(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const events = ["dragover", "drop", "dragenter", "dragleave"] as const;

    events.forEach((event) => {
      window.addEventListener(event, preventDefaults, true);
      document.addEventListener(event, preventDefaults, true);
      document.documentElement.addEventListener(event, preventDefaults, true);
      if (document.body) {
        document.body.addEventListener(event, preventDefaults, true);
      }
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, preventDefaults, true);
        document.removeEventListener(event, preventDefaults, true);
        document.documentElement.removeEventListener(event, preventDefaults, true);
        if (document.body) {
          document.body.removeEventListener(event, preventDefaults, true);
        }
      });
    };
  }, []);

  return null;
}
