# 开发协调表

> 两位开发者（GLM-5.2 × 2）共用此文件协调工作，避免冲突。
> **开工前**：先 `git pull`，读此表，确认对方没在动你要碰的文件。
> **收工后**：更新状态为 ✅ Done，commit + push。

---

## 当前进行中

| 开发者 | 任务 | 涉及文件 | 状态 | 时间 |
|--------|------|----------|------|------|
| （示例）Trae-A | ISR 优化 | api/music, manifest.ts | ✅ Done | 2026-06-30 |
| （示例）Trae-B | bug 修复 | xxx | 🔄 In Progress | 2026-06-30 |

> 状态：🔄 In Progress（进行中）/ ⏸ Paused（暂停）/ ✅ Done（完成）/ ❌ Blocked（阻塞）

---

## 工作规则

### 1. 开工前必做
```bash
git pull origin master
# 读 DEV_COORDINATION.md，确认对方没在动你要碰的文件
# 如果冲突 → 在此文件留言协商，或先做其他不冲突的任务
```

### 2. 文件隔离原则
- 同一文件**不要同时修改**
- 如果必须改同一文件 → 先在表格里声明，等对方 push 后再 pull
- 优先选择不冲突的任务

### 3. 提交规范
```
[类型] 简述（涉及的文件或模块）

类型：
- fix     修 bug
- perf    性能优化
- feat    新功能
- refactor 重构（不改功能）
- docs    文档
- chore   杂项

示例：
[perf] /api/music 转 ISR + manifest 用 service client
[fix] 简历页 EditableText 404（补 text_content 记录）
```

### 4. 保守原则（重要！）
- **功能没坏就别动**——不要"顺手优化"
- 修 bug 前先**复现确认**，修完后**亲自验证**
- 每次改动前**创建备份分支**：`git checkout -b backup/before-xxx`
- 改动尽量**小而精**，一次只改一个问题
- **不重构**没坏的代码，即使看起来不优雅

### 5. 验证清单（push 前必做）
- [ ] TypeScript 编译零错误：`npx tsc --noEmit`
- [ ] 构建：`npx next build`
- [ ] 前台打开关键页面无 Application error
- [ ] 后台关键功能可用
- [ ] 没有引入新的 console 报错

---

## 最近完成（保留最近 10 条）

| 时间 | 开发者 | 任务 | 提交 hash |
|------|--------|------|-----------|
| 2026-06-30 | Trae-A | ISR 优化（layout/works/resume + EditableText N+1） | aa95084 |
| 2026-06-30 | Trae-A | EditableText Provider 存在时跳过 404 fetch | 237ff71 |

---

## 待办候选（谁空谁领）

> 领任务前在"当前进行中"表格声明，避免重复。

- [ ] R2 CORS 配置（需 Cloudflare dashboard，非代码任务）
- [ ] Vercel ISR stale-time 调查（平台设置，可能不可改）
- [ ] 补齐 admin.login.* 文案到 DB（目前硬编码，未接 EditableText）
