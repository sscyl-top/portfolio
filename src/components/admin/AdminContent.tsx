"use client";

import { usePathname } from "next/navigation";

export function AdminContent({
  children,
  fillHeight = false,
}: {
  children: React.ReactNode;
  fillHeight?: boolean;
}) {
  const pathname = usePathname();
  const isWorkEditorPage = /^\/admin\/works\/[^/]+$/.test(pathname);

  if (isWorkEditorPage || fillHeight) {
    return <div className={`w-full ${fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}`}>{children}</div>;
  }

  return <div className="w-full">{children}</div>;
}
