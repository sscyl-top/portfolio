"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Sun, Moon, Monitor } from "lucide-react";

const THEMES = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "dark", label: "深色", icon: Moon },
] as const;

export function ThemeToggle() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHome = pathname === "/";
  if (isHome) return null;
  if (!mounted) return null;

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[1];
  const CurrentIcon = current.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/25 hover:text-white [.light_&]:border-black/10 [.light_&]:bg-black/[0.04] [.light_&]:text-black/60 [.light_&]:hover:border-black/25 [.light_&]:hover:text-black"
        aria-label={`主题：${current.label}（点击切换）`}
        title={`主题：${current.label}`}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#10100f] shadow-2xl backdrop-blur-xl [.light_&]:border-black/10 [.light_&]:bg-white">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onMouseDown={() => {
                  setTheme(t.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition ${
                  active
                    ? "text-cyan"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white [.light_&]:text-black/60 [.light_&]:hover:bg-black/[0.04] [.light_&]:hover:text-black"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
