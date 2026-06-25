"use client";

import { useEffect } from "react";

export function GlobalDragDropPrevention() {
  useEffect(() => {
    const preventDefaultOnly = (e: Event) => {
      e.preventDefault();
    };

    const events = ["dragover", "drop", "dragenter"] as const;

    events.forEach((event) => {
      window.addEventListener(event, preventDefaultOnly);
      document.addEventListener(event, preventDefaultOnly);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, preventDefaultOnly);
        document.removeEventListener(event, preventDefaultOnly);
      });
    };
  }, []);

  return null;
}
