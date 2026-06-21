"use client";

import { useTransition } from "react";

import { seedStaticPortfolio } from "./actions";

export function SeedPortfolioButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await seedStaticPortfolio();
        });
      }}
      className="min-h-10 rounded-md border border-cyan/35 px-4 text-sm text-cyan transition hover:bg-cyan/10 disabled:cursor-wait disabled:opacity-60"
    >
      {isPending ? "导入中..." : "导入当前作品"}
    </button>
  );
}
