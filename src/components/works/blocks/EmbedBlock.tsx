import type { ContentBlock } from "@/data/portfolio";

type EmbedBlockData = Extract<ContentBlock, { type: "embed" }>;

type Props = Omit<EmbedBlockData, "type" | "layout">;

/** 从 YouTube URL 中提取视频 ID */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** 从 Vimeo URL 中提取视频 ID */
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/** 根据 embedType 和 url 生成 iframe 的 src */
function resolveEmbedSrc(
  embedType: EmbedBlockData["embedType"],
  url: string,
): string {
  if (embedType === "youtube") {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (embedType === "vimeo") {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  // figma / codepen / generic：直接使用原始 url
  return url;
}

/** 嵌入块：根据 embedType 生成 iframe，带 sandbox 属性 */
export function EmbedBlock({ heading, url, embedType, caption }: Props) {
  const src = resolveEmbedSrc(embedType, url);

  return (
    <div className="space-y-3">
      {heading ? (
        <h2 className="text-2xl font-semibold text-white">{heading}</h2>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <div className="relative aspect-video w-full">
          <iframe
            src={src}
            title={heading || "嵌入内容"}
            loading="lazy"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
      {caption ? (
        <p className="text-sm font-medium text-white/54">{caption}</p>
      ) : null}
    </div>
  );
}
