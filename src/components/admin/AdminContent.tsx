"use client";

import { usePathname } from "next/navigation";

export function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkEditorPage = /^\/admin\/works\/[^/]+$/.test(pathname);

  if (isWorkEditorPage) {
    return <div className="w-full">{children}</div>;
  }

  return <div className="mx-auto w-full max-w-[1420px]">{children}</div>;
}
