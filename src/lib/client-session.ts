/**
 * 客户端会话 ID 工具：用于作品点赞 / 评论等匿名互动场景。
 * 生成随机 session_id，持久化到 localStorage，并同步写入 cookie 供服务端读取。
 */

const SESSION_KEY = "portfolio_work_session_id";
const COOKIE_NAME = "portfolio_work_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 兜底：手动拼接一段足够随机的字符串
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function syncCookie(value: string) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

/**
 * 获取（或创建）当前浏览器会话 ID。
 * 仅可在客户端调用。
 */
export function getClientSessionId(): string {
  if (typeof window === "undefined") {
    throw new Error("getClientSessionId 只能在浏览器端调用");
  }

  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }

  syncCookie(sessionId);
  return sessionId;
}
