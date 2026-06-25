# 后台作品编辑页布局调整交接文档

日期：2026-06-25
项目路径：`D:\上山采月亮的台式\作品集网站\2026-作品集网站`
线上后台页面：`https://sscyl.top/admin/works/334fae8d-7051-4d6d-b5d3-06c489fdc3e4`

## 当前状态

- 当前分支：`master`
- 最新提交：`ceffa218 fix: 缩小后台作品编辑工具区间距`
- 当前工作区还有一个未提交的本地改动：`src/app/admin/(protected)/media/actions.ts`
- 这个 `media/actions.ts` 是本轮布局调整之外的既有本地改动，不要误提交、不要还原。

## 用户最终反馈

用户希望后台作品上传/编辑页的布局满足：

- 中间作品编辑板块保持在页面中部，和顶部导航栏宽度视觉接近。
- 右侧功能区不要太宽，也不要跑到中间编辑区旁边形成错位。
- 右侧功能区应当位于截图标注的绿色区域内。
- 但中间编辑板块和右侧功能区之间也不能出现巨大空白。
- 保存作品按钮应放到右侧功能区。
- 右侧功能区 UI 要更紧凑，部分折叠内容可以展开，部分功能可以两列排布。

最新用户截图反馈说明：`ceffa218` 这一版虽然把右栏间距从弹性大空隙改小了，但用户仍认为整体布局不对，需要新账号重新校准。

## 已做过的布局相关提交

以下提交都已经推送到 `master`：

- `51467b3b fix: 调整后台作品编辑页布局`
- `2d3803a6 fix: 重置后台作品编辑区居中布局`
- `593b4b82 fix: 收紧后台作品编辑工具区`
- `f96e0171 fix: 将后台作品工具区推入右侧区域`
- `ceffa218 fix: 缩小后台作品编辑工具区间距`

这些提交反复修改了同一个文件：

`src/app/admin/(protected)/works/[id]/page.tsx`

## 已创建的回退备份

相关备份 tag：

- `backup-before-admin-work-layout-20260625-222035`
- `backup-before-admin-work-layout-recenter-20260625-224026`
- `backup-before-admin-tools-panel-compact-20260625-224717`
- `backup-before-admin-tools-panel-greenbox-20260625-225718`
- `backup-before-admin-tools-gap-fix-20260625-230623`
- `backup-before-handoff-admin-layout-20260625-231054`

另有一个保留本地未提交改动的 stash：

- `stash@{0}: backup-dirty-before-admin-tools-panel-greenbox-20260625-225718`

注意：该 stash 只是备份，当前 `media/actions.ts` 的本地改动已经通过 `git stash apply` 恢复到了工作区。

## 为什么尺寸改了几次还没改对

主要原因不是 Tailwind 类名本身，而是布局目标没有先被量化，导致多次用网格列宽猜测截图中的红框/绿框位置。

具体错误有四点：

1. 没有一开始就用内置浏览器在用户实际全屏视口下量 DOM 坐标。  
   用户截图是超宽视口，后台还有固定左侧菜单、顶部导航、页面内边距、滚动条、右下悬浮控件等干扰项。只看截图估算红框/绿框，容易把“视觉目标区域”和 CSS grid 可用宽度混在一起。

2. 把“右侧功能区进入绿色框”误解成“把右栏尽量推到最右”。  
   后来加入了 `minmax(0,1fr)` 作为中间编辑区和右栏之间的弹性空隙。这个做法在超宽屏下会吞掉所有剩余宽度，直接造成用户最新截图里的巨大空位。

3. 没有建立稳定的布局约束模型。  
   应先确定这些值：
   - 左侧后台菜单宽度
   - 页面内容区左右 padding
   - 中间编辑卡片目标宽度
   - 中间和右栏之间的目标间距
   - 右栏目标宽度
   - 整体是否允许横向滚动

   之前是在 `grid-template-columns` 中不断调 `clamp()`、`minmax()`，但没有固定这些关系，所以一个尺寸改对，另一个位置又错。

4. 右侧 UI 紧凑化和页面大布局混在一起改。  
   保存按钮、私密预览、媒体、分类、更多设置、版本历史这些内部卡片应该先在固定右栏宽度下排版。此前把部分区域改成两列后，又和右栏宽度调整一起验证，增加了判断复杂度。

## 当前代码中的关键布局

文件：`src/app/admin/(protected)/works/[id]/page.tsx`

当前主布局大致是：

```tsx
<div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-[clamp(220px,12vw,250px)_minmax(0,1030px)_24px_minmax(440px,480px)]">
  <div className="hidden 2xl:block" aria-hidden="true" />
  <div className="min-w-0">中间编辑卡片</div>
  <div className="hidden 2xl:block" aria-hidden="true" />
  <div className="min-w-0 ...">右侧功能区</div>
</div>
```

这个版本把上一版的巨大弹性空隙改成了 `24px`，但最终仍需用浏览器重新校准整体起点、宽度和间距。

## 建议下一位接手的正确流程

1. 不要继续凭截图猜列宽。先打开用户当前页面：

   `https://sscyl.top/admin/works/334fae8d-7051-4d6d-b5d3-06c489fdc3e4`

2. 使用内置浏览器或 Playwright，在用户全屏视口下量这些矩形：

   - `#work-title` 所在编辑卡片的 `x / width / right`
   - 右侧功能区容器的 `x / width / right`
   - 主内容区域容器的 `x / width / right`
   - viewport 宽度
   - 是否存在横向滚动：`document.documentElement.scrollWidth > window.innerWidth`

3. 先确定目标，而不是直接改类名：

   - 中间编辑卡片宽度建议保持约 `1030px`
   - 中间编辑卡片和右栏之间建议约 `24px` 到 `32px`
   - 右侧功能区建议约 `440px` 到 `480px`
   - 如果用户坚持右栏必须更靠右，则应整体右移中间编辑区和右栏，而不是在两者之间塞大空隙。

4. 更稳的布局方式建议：

   用一个有明确最大宽度的页面级 wrapper，而不是在 grid 里用多个隐形列凑位置。示例思路：

   ```tsx
   <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1030px)_minmax(440px,480px)] gap-6">
     <main>编辑区</main>
     <aside>功能区</aside>
   </div>
   ```

   如果需要让整组内容相对顶部导航居中，就调 wrapper 的 `max-width` 和 `mx-auto`；如果需要让整组更靠右，可以用父容器 padding 或 `justify-self`，不要在 main 和 aside 中间放 `1fr`。

5. 右侧内部 UI 建议保持：

   - 顶部：保存作品 + 私密预览，两列可以保留。
   - 媒体：整宽，不建议两列，因为选择器、上传按钮、文件名容易挤。
   - 分类与标签：可以默认展开，但分类和标签内部是否两列，需要在 440px 右栏内验证。
   - 更多设置 + 版本历史：可以两列，若宽度不足则改回单列。

6. 每次修改后必须：

   - 先打 backup tag。
   - 不要提交 `src/app/admin/(protected)/media/actions.ts`。
   - 运行 `npm run build`。
   - 只提交相关布局文件。
   - 推送 `master`。
   - 等 Vercel 部署 READY 后，用内置浏览器刷新用户指定后台页，并量 DOM 坐标。

## 可回退建议

如果新账号想先回退到较不离谱的状态，可优先比较：

- `2d3803a6`：重置后台作品编辑区居中布局
- `593b4b82`：收紧后台作品编辑工具区
- `ceffa218`：当前最新，去掉了巨大弹性空隙

不要盲目 `git reset --hard`，因为工作区有用户的本地未提交改动 `media/actions.ts`。如需回退，先单独保存或 stash 这个文件。

## 交接结论

本轮问题的本质是：没有先以真实浏览器坐标建立布局约束，导致把“右侧功能区在绿色框内”错误实现成了网格列宽试错。下一步应从实际 DOM 测量开始，把页面布局收敛成“一个居中的整体 wrapper + 固定编辑区宽度 + 固定右栏宽度 + 小间距”，避免继续用隐形弹性列推位置。
