import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Text } from "@/components/cms/Text";
import { WorkReactions } from "@/components/works/WorkReactions";
import { WorkContentBlocks } from "@/components/works/WorkContentBlocks";
import { ShareButtons } from "@/components/works/ShareButtons";
import type { Work } from "@/data/portfolio";

type WorkDetailContentProps = {
  work: Work;
  relatedWorks: Work[];
  isModal?: boolean;
};

export function WorkDetailContent({ work, relatedWorks, isModal = false }: WorkDetailContentProps) {
  const containerClass = isModal
    ? "pb-24 pt-6 md:pt-10"
    : "min-h-screen pb-24 pt-28 md:pt-32";

  const sidePad = isModal
    ? "px-4 md:px-8 lg:px-10"
    : "mx-auto max-w-[1420px] px-3 md:px-8";

  const headerClass = isModal ? `w-full ${sidePad}` : sidePad;
  const reactionsClass = isModal ? `mt-16 w-full ${sidePad}` : `mx-auto mt-16 ${sidePad}`;
  const relatedClass = isModal
    ? `mt-16 w-full border-t border-edge-2 px-4 pt-10 md:px-8 lg:px-10`
    : "mx-auto mt-16 max-w-5xl border-t border-edge-2 px-5 pt-10 md:px-8";

  return (
    <main className={`bg-panel ${containerClass}`}>
      <header className={headerClass}>
        {!isModal && (
          <Link
            href="/works"
            className="inline-flex items-center gap-2 text-sm text-ink-3 transition hover:text-ink"
          >
            <Text k="work.detail.backToWorks" fallback="返回全部作品" />
          </Link>
        )}

        <div className={isModal ? "mt-4 md:mt-6" : "mt-8 md:mt-12"}>
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
        <WorkContentBlocks blocks={work.blocks} coverTone={work.coverTone} mediaNoGap={work.mediaNoGap} isModal={isModal} />
      </div>

      <section className={reactionsClass}>
        <WorkReactions workSlug={work.slug} />
        <div className="mt-6 border-t border-edge-2 pt-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-ink-3">
            <Text k="work.detail.shareTitle" fallback="分享此作品" />
          </p>
          <ShareButtons
            title={work.title}
            description={work.summary}
            imageUrl={work.shareMedia?.url ?? work.coverMedia?.url}
          />
        </div>
      </section>

      {relatedWorks.length > 0 ? (
        <aside className={relatedClass}>
          <h2 className="text-2xl font-semibold text-ink">
            <Text k="work.detail.relatedWorks" fallback="相关作品" />
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {relatedWorks.map((related) => (
              <Link
                key={related.slug}
                href={`/works/${related.slug}`}
                target={isModal ? undefined : "_blank"}
                rel={isModal ? undefined : "noopener noreferrer"}
                className="flex items-center justify-between rounded-lg border border-edge-2 bg-surface-3 p-5 text-ink-2 transition hover:border-edge hover:text-ink"
              >
                {related.title}
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </main>
  );
}
