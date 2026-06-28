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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-panel">
      <div className="min-h-screen">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-edge-2 bg-panel/90 px-4 py-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm text-ink-3 transition hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回作品列表
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-2 text-ink-3 transition hover:border-edge hover:text-ink"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && !work ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge-2 border-t-ink" />
          </div>
        ) : work ? (
          <>
            <header className="mx-auto max-w-[1420px] px-3 pt-8 md:px-8 md:pt-12">
              <div className="mt-8 md:mt-12">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
                  {work.category} / {work.year}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-tight text-ink md:text-6xl lg:text-7xl">
                  {work.title}
                </h1>
              </div>

              <div className="mt-8 grid gap-8 border-y border-edge-2 py-8 md:mt-12 md:grid-cols-[1fr_auto] md:items-start">
                <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-ink-2 md:text-lg md:leading-9">
                  {work.summary}
                </p>
                <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                  {work.tags.concat(work.tools).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-edge-2 bg-surface-2 px-3 py-1 font-mono text-xs text-ink-3"
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
              <aside className="mx-auto mt-16 max-w-5xl border-t border-edge-2 px-5 pt-10 md:px-8">
                <h2 className="text-2xl font-semibold text-ink">
                  相关作品
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {relatedWorks.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/works/${related.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-edge-2 bg-surface-3 p-5 text-ink-2 transition hover:border-edge hover:text-ink"
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
          <div className="flex h-96 items-center justify-center text-ink-4">
            作品加载失败
          </div>
        )}
      </div>
    </div>
  );
}
