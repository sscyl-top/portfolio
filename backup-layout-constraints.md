# 布局约束备份 - 2026-06-24

> 在移除所有布局约束前的完整备份，用于快速回滚

## 修改前约束清单

### 1. WorkContentBlocks.tsx (行 68-75) - 布局宽度

```tsx
function layoutWidthClass(layout?: BlockLayout): string {
  if (!layout || !layout.width || layout.width === "contained") {
    return "max-w-6xl mx-auto px-5 md:px-8";  // 1152px max
  }
  if (layout.width === "narrow") return "max-w-4xl mx-auto px-5 md:px-8";  // 896px max
  if (layout.width === "free") return "relative mx-auto max-w-7xl";  // 1280px max
  return ""; // full - 无约束
}
```

**约束说明**:
- contained: 内容区域最大 1152px，居中，有左右内边距
- narrow: 内容区域最大 896px，居中，有左右内边距
- free: 内容区域最大 1280px，居中
- full: 无宽度限制

---

### 2. WorkContentBlocks.tsx (行 124, 135-136) - 媒体高度

```tsx
// 自由排版模式 - 固定容器高度
isFree
  ? "relative h-[580px] md:h-[880px]"
  : "";

// 画廊模式 - 最小高度 60vh
isGallery
  ? "relative w-full overflow-hidden md:min-h-[60vh]"
  : "relative w-full overflow-hidden md:min-h-[80vh]";  // 单图/视频 - 最小高度 80vh
```

**约束说明**:
- 单图/视频: 桌面端最小高度为视口的 80%
- 画廊: 桌面端最小高度为视口的 60%
- 自由排版: 固定高度 580px (移动端) / 880px (桌面端)

---

### 3. WorkContentBlocks.tsx (行 173) - 视频块高度

```tsx
<div className="relative w-full overflow-hidden bg-black md:min-h-[80vh]">
  <video src={block.items[0].url} controls preload="metadata" className="h-full w-full" />
</div>
```

**约束说明**: 视频块在桌面端最小高度为视口的 80%

---

### 4. WorkContentBlocks.tsx (行 217) - Before/After 固定比例

```tsx
<div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-white/[0.03]">
  {media ? (
    <WorkMediaFrame media={media} tone={tone as never} className="h-full w-full" />
  ) : null}
</div>
```

**约束说明**: Before/After 对比块强制使用 4:3 长宽比，不考虑图片原始比例

---

### 5. WorkMediaFrame.tsx - 图片填充方式

```tsx
<img
  src={src}
  alt={alt}
  className={`object-cover ${className} ${hover ? "transition duration-700 group-hover:scale-105" : ""}`}
  // ...其他属性
/>
```

**约束说明**: 使用 `object-cover` 填充容器，会裁剪图片边缘以填满容器

---

## 回滚方法

### 方法 1: Git 回滚 (推荐)

```bash
# 查看约束移除前的 commit
git log --oneline -5

# 回滚到约束移除前的版本
git revert <commit-hash>
```

### 方法 2: 手动恢复

根据本文档中的代码片段，手动恢复对应文件的对应行。

---

## 修改记录

| 日期 | 操作 | 文件 | 说明 |
|------|------|------|------|
| 2026-06-24 | 备份 | WorkContentBlocks.tsx | 记录所有布局约束位置 |
| 2026-06-24 | 待修改 | WorkContentBlocks.tsx | 移除宽度/高度/比例约束 |
| 2026-06-24 | 待修改 | WorkMediaFrame.tsx | object-cover → object-contain |

---

**备份创建时间**: 2026-06-24 20:52
**最后更新时间**: 2026-06-24 21:04 (约束已恢复，再次备份后准备移除)
**操作人**: Buddy
**项目**: sscyl.top 作品集网站

---

# 第二次备份 - 2026-06-24 21:04

> 在第二次移除布局约束前的备份（第一次移除后已恢复）

## 当前约束状态（与第一次备份相同）

### 1. WorkContentBlocks.tsx (行 68-75) - 布局宽度
```tsx
function layoutWidthClass(layout?: BlockLayout): string {
  if (!layout || !layout.width || layout.width === "contained") {
    return "max-w-6xl mx-auto px-5 md:px-8";  // 1152px max
  }
  if (layout.width === "narrow") return "max-w-4xl mx-auto px-5 md:px-8";  // 896px max
  if (layout.width === "free") return "relative mx-auto max-w-7xl";  // 1280px max
  return ""; // full - 无约束
}
```

### 2. WorkContentBlocks.tsx (行 124-136) - 媒体高度
```tsx
// 自由排版模式 - 固定容器高度
isFree
  ? "relative h-[580px] md:h-[880px]"
  : isGallery
    ? "relative w-full overflow-hidden md:min-h-[80vh]"
    : "relative w-full overflow-hidden md:min-h-[80vh]";
```

### 3. WorkContentBlocks.tsx (行 173) - 视频块高度
```tsx
<div className="relative w-full overflow-hidden bg-black md:min-h-[80vh]">
```

### 4. WorkContentBlocks.tsx (行 217) - Before/After 固定比例
```tsx
<div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-white/[0.03]">
```

### 5. WorkMediaFrame.tsx - 图片填充方式
```tsx
<Image
  className={`object-cover ${className} ...`}
/>
```

## 回滚方法

与方法 1 相同，使用 `git revert` 或手动恢复。
