"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";

export default function WorkModalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#181a1e]"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onDismiss();
        }
      }}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#181a1e]/90 px-4 py-4 backdrop-blur-xl md:px-8">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回作品列表
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
