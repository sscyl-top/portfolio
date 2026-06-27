/**
 * 在新标签页打开作品详情，并立即显示十字星加载动画。
 *
 * 问题：新标签页打开 /works/[slug] 时，服务端 SSR（layout + page 数据获取）
 * 需要 ~2 秒才返回 HTML，这段时间浏览器显示灰屏。
 *
 * 方案：先 window.open 空白窗口，注入含十字星动画的 HTML，再导航到目标 URL。
 * 浏览器在等待新 HTML 期间会保持当前 loading 内容显示，用户点击瞬间即可看到十字星。
 *
 * @param url 作品详情页 URL（如 /works/rj-tech-brand-system?from=works）
 * @returns true 表示成功注入 loading；false 表示弹窗被拦截，调用方应回退到浏览器默认行为
 */
export function openWorkDetailInNewTab(url: string): boolean {
  const win = window.open("", "_blank");
  if (!win) {
    return false; // 弹窗被拦截，调用方应回退到浏览器默认行为
  }

  win.document.write(WORK_LOADING_HTML);
  win.document.close();

  // 导航到实际页面，浏览器会保持 loading 内容直到新 HTML 到达
  win.location.href = url;
  return true;
}

/** 十字星加载动画 HTML（自包含，不依赖外部 CSS/JS） */
const WORK_LOADING_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>加载中...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#000;overflow:hidden}
.loader{position:fixed;inset:0;display:grid;place-items:center}
.star{position:relative;height:112px;width:112px}
.star svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.spin{animation:spin 2.4s linear infinite}
.spin-rev{animation:spin 1.6s linear infinite reverse}
.dot-wrap{position:absolute;inset:0;display:grid;place-items:center}
.dot{height:6px;width:6px;border-radius:50%;background:#8bd7cd;box-shadow:0 0 8px rgba(139,215,205,0.9)}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="loader"><div class="star">
<svg class="spin" viewBox="0 0 100 100">
<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="50" cy="50" r="132">
<stop offset="0%" stop-color="rgba(255,255,255,1)"/>
<stop offset="18%" stop-color="rgba(255,255,255,0.95)"/>
<stop offset="55%" stop-color="rgba(255,255,255,0.2)"/>
<stop offset="100%" stop-color="rgba(255,255,255,0)"/>
</radialGradient></defs>
<path d="M50 -82 L52 48 L182 50 L52 52 L50 182 L48 52 L-82 50 L48 48 Z" fill="url(#g)"/>
</svg>
<svg class="spin-rev" viewBox="0 0 100 100" fill="none" stroke="rgba(139,215,205,0.55)" stroke-width="1" stroke-linecap="round">
<circle cx="50" cy="50" r="28.6" stroke-dasharray="3 7"/>
</svg>
<div class="dot-wrap"><span class="dot"></span></div>
</div></div>
</body>
</html>`;
