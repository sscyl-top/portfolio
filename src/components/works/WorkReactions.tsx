"use client";

import { Heart, MessageCircle, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { getClientSessionId } from "@/lib/client-session";

// 模块级缓存：session id 在浏览器内全局唯一，首次读取后缓存，避免重复副作用
let cachedSessionId: string | null = null;
const noopSubscribe = () => () => {};
const getServerSession = () => null;
const getClientSession = (): string => {
  if (cachedSessionId === null) {
    cachedSessionId = getClientSessionId();
  }
  return cachedSessionId;
};

type WorkReactionsProps = {
  workSlug: string;
};

type Comment = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function WorkReactions({ workSlug }: WorkReactionsProps) {
  const sessionId = useSyncExternalStore(
    noopSubscribe,
    getClientSession,
    getServerSession,
  );
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likePending, setLikePending] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // 拉取初始点赞数
  useEffect(() => {
    if (!sessionId) return;
    void fetch(
      `/api/works/${encodeURIComponent(workSlug)}/like?sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
      },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLikeCount(data.count ?? 0);
          setLiked(Boolean(data.liked));
        }
      })
      .catch(() => {
        /* 忽略初始化失败 */
      });
  }, [workSlug, sessionId]);

  const toggleLike = useCallback(async () => {
    if (!sessionId || likePending) return;
    setLikePending(true);
    const wasLiked = liked;
    // 乐观更新
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    try {
      const res = await fetch(
        `/api/works/${encodeURIComponent(workSlug)}/like`,
        {
          method: wasLiked ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        },
      );
      if (!res.ok) throw new Error("like request failed");
      const data = (await res.json()) as { liked: boolean; count: number };
      setLiked(data.liked);
      setLikeCount(data.count);
    } catch {
      // 回滚
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLikePending(false);
    }
  }, [sessionId, liked, likePending, workSlug]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/works/${encodeURIComponent(workSlug)}/comments`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { comments: Comment[] };
      setComments(data.comments ?? []);
    } finally {
      setCommentsLoading(false);
    }
  }, [workSlug]);

  const toggleComments = useCallback(() => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) {
      void loadComments();
    }
  }, [commentsOpen, comments.length, loadComments]);

  const submitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || !content.trim()) return;
      setSubmitting(true);
      setSubmitMessage(null);

      try {
        const res = await fetch(
          `/api/works/${encodeURIComponent(workSlug)}/comments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authorName: authorName.trim(),
              content: content.trim(),
              _company: "", // honeypot
            }),
          },
        );

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setSubmitMessage(data?.error ?? "提交失败，请稍后再试");
          return;
        }

        setSubmitMessage("评论已提交，审核通过后将显示。");
        setContent("");
        void loadComments();
      } catch {
        setSubmitMessage("网络异常，请稍后再试");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, content, authorName, workSlug, loadComments],
  );

  const heartClass = useMemo(
    () =>
      liked
        ? "border-copper/40 bg-copper/[0.08] text-copper"
        : "border-white/10 bg-white/[0.025] text-white/55 hover:text-white",
    [liked],
  );

  return (
    <section className="mx-auto mt-16 max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        {/* 点赞按钮 */}
        <button
          type="button"
          onClick={toggleLike}
          disabled={!sessionId || likePending}
          aria-pressed={liked}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${heartClass} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <Heart
            aria-hidden="true"
            className={`h-4 w-4 ${liked ? "fill-current" : ""}`}
          />
          <span className="font-mono text-xs">{likeCount}</span>
          <span className="text-xs">{liked ? "已点赞" : "点赞"}</span>
        </button>

        {/* 评论切换按钮 */}
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-sm text-white/55 transition hover:text-white"
        >
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          <span className="text-xs">评论</span>
        </button>
      </div>

      {/* 评论区域 */}
      {commentsOpen ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-5">
          {/* 评论列表 */}
          <div className="space-y-4">
            {commentsLoading && comments.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/30">
                加载中…
              </p>
            ) : comments.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/30">
                还没有评论，来说点什么吧
              </p>
            ) : (
              <ul className="space-y-4">
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="border-b border-white/8 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-white/80">
                        {comment.author_name || "匿名"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-white/25">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/62">
                      {comment.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 提交表单 */}
          <form
            onSubmit={submitComment}
            className="mt-5 space-y-3 border-t border-white/8 pt-5"
          >
            {/* Honeypot：对用户隐藏，机器人会填充 */}
            <input
              type="text"
              name="_company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
              value=""
              onChange={() => {}}
            />
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="昵称（可选）"
              maxLength={60}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:border-copper/40 focus:outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的想法…"
              maxLength={1000}
              rows={3}
              required
              className="w-full resize-none rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-white/80 placeholder:text-white/30 focus:border-copper/40 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] text-white/25">
                {content.length}/1000
              </span>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="inline-flex items-center gap-1.5 rounded-md border border-copper/30 bg-copper/[0.06] px-3 py-1.5 text-xs text-copper transition hover:bg-copper/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send aria-hidden="true" className="h-3 w-3" />
                {submitting ? "提交中…" : "提交"}
              </button>
            </div>
            {submitMessage ? (
              <p className="text-xs text-white/45">{submitMessage}</p>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
