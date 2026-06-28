"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function WorkModalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function onDismiss() {
    router.back();
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [router]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          onDismiss();
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="fixed right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/60 hover:text-white md:right-6 md:top-6"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={panelRef}
        className="mx-auto my-4 w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl bg-[#181a1e] shadow-2xl md:my-8"
      >
        {children}
      </div>
    </div>
  );
}
