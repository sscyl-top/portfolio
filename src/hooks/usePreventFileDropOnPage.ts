"use client";

import { useEffect } from "react";

let handlersAdded = false;
let refCount = 0;

function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

export function usePreventFileDropOnPage() {
  useEffect(() => {
    refCount++;
    if (!handlersAdded) {
      handlersAdded = true;
      ["dragover", "drop", "dragenter", "dragleave"].forEach((event) => {
        window.addEventListener(event, preventDefaults, false);
        document.addEventListener(event, preventDefaults, false);
        document.body?.addEventListener(event, preventDefaults, false);
      });
    }

    return () => {
      refCount--;
      if (refCount <= 0 && handlersAdded) {
        handlersAdded = false;
        refCount = 0;
        ["dragover", "drop", "dragenter", "dragleave"].forEach((event) => {
          window.removeEventListener(event, preventDefaults, false);
          document.removeEventListener(event, preventDefaults, false);
          document.body?.removeEventListener(event, preventDefaults, false);
        });
      }
    };
  }, []);
}
