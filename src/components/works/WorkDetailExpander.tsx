"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import type { Work } from "@/data/portfolio";
import { WorkContentBlocks } from "./WorkContentBlocks";
import { WorkReactions } from "./WorkReactions";

type WorkDetailExpanderProps = {
  workSlug: string | null;
  onClose: () => void;
  allWorks?: Work[];
};

export function WorkDetailExpander({ workSlug, onClose, allWorks = [] }: WorkDetailExpanderProps) {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedWorks, setRelatedWorks] = useState<Work[]>([]);

  useEffect(() => {
    if (!workSlug) {
      setWork(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const foundWork = allWorks.find((w) => w.slug === workSlug);
    if (foundWork) {
      setWork(foundWork);
      const related = allWorks
        .filter((w) => w.slug !== workSlug && w.category === foundWork.category)
        .slice(0, 2);
      setRelatedWorks(related);
      setLoading(false);
      return;
    }

    fetch(`/api/works/${workSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch work");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setWork(data.work);
        setRelatedWorks(data.relatedWorks ?? []);
      })
      .catch((err) => {
        console.error("[WorkDetailExpander] Failed to fetch work:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workSlug, allWorks]);

  useEffect(() => {
    if (workSlug) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [workSlug]);

  if (!workSlug) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#181a1e]">
      <div className="min-h-screen">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#181a1e]/90 px-4 py-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回作品列表
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && !work ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : work ? (
          <>
            <header className="mx-auto max-w-[1420px] px-3 pt-8 md:px-8 md:pt-12">
              <div className="mt-8 md:mt-12">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
                  {work.category} / {work.year}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-tight text-white md:text-6xl lg:text-7xl">
                  {work.title}
                </h1>
              </div>

              <div className="mt-8 grid gap-8 border-y border-white/10 py-8 md:mt-12 md:grid-cols-[1fr_auto] md:items-start">
                <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-white/62 md:text-lg md:leading-9">
                  {work.summary}
                </p>
                <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                  {work.tags.concat(work.tools).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/52"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </header>

            <div className="mt-8 md:mt-12">
              <WorkContentBlocks blocks={work.blocks} coverTone={work.coverTone} mediaNoGap={work.mediaNoGap} />
            </div>

            <section className="mx-auto mt-16 max-w-[1420px] px-3 md:px-8">
              <WorkReactions workSlug={work.slug} />
            </section>

            {relatedWorks.length > 0 ? (
              <aside className="mx-auto mt-16 max-w-5xl border-t border-white/10 px-5 pt-10 md:px-8">
                <h2 className="text-2xl font-semibold text-white">
                  相关作品
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {relatedWorks.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/works/${related.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-5 text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      {related.title}
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </aside>
            ) : null}
          </>
        ) : (
          <div className="flex h-96 items-center justify-center text-white/40">
            作品加载失败
          </div>
        )}
      </div>
    </div>
  );
}
