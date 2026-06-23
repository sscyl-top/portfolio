# SSCYL Portfolio — 项目交接文档（2026-06-23 更新）

## 一、项目基本信息

| 项目 | 信息 |
|------|------|
| **项目名称** | SSKYL Portfolio（陈涛涛个人作品集网站） |
| **本地路径** | `D:\上山采月亮的台式\作品集网站\2026-作品集网站` |
| **线上地址** | https://sscyl.top |
| **GitHub 仓库** | https://github.com/sscyl-top/portfolio.git |
| **Supabase 项目 ID** | `hnujowombcgfxledpnxe` |
| **Vercel 项目** | `sscyl/portfolio` |

---

## 二、当前完成状态

### ✅ 已完成
1. **前台页面**
   - 首页（3D 粒子动画 + 核心优势段落）
   - 作品列表页（`/works`，含代表作轮播、分类筛选）
   - 作品详情页（`/works/[slug]`）
   - 简历页（`/resume`）

2. **后台基础框架**
   - 登录认证（Supabase Auth）
   - 作品 CRUD（列表 + 编辑页）
   - 媒体库上传（单文件）
   - 分类 / 标签管理
   - 留言管理

3. **内容块系统**
   - 支持 6 种块类型：文本 / 媒体 / 图库 / 视频 / PDF / BeforeAfter
   - 块排序、可见性控制

### ⚠️ 已知问题（用户反馈）

**核心痛点：后台上传作品流程太复杂**

1. **流程割裂**
   - 必须先去"媒体库"上传文件
   - 再回到"作品编辑"选择已上传的媒体
   - 两个页面之间来回切换，体验差

2. **无法多选**
   - 每次只能选一个文件
   - 几十张图片的作品需要重复操作几十次

3. **媒体库分类混乱**
   - 图片、视频、PDF 分散在不同区块
   - 用户想要统一的上传入口

4. **缺乏可视化排版**
   - 无法像 Word/PPT 一样拖拽调整位置
   - 无法在内联编辑图片说明

---

## 三、用户需求（新方向）

### 3.1 参考对象
- **Behance**：作品展示 + 排版方式
- **站酷 (Zcool)**：个人后台管理流程

### 3.2 核心需求

1. **简化上传流程**
   - 在作品编辑页直接拖拽上传
   - 支持多选（图片、视频、PDF 等）
   - 上传后自动生成内容块

2. **Word/PPT 式排版**
   - 内容从上到下流式排列
   - 拖拽调整块顺序
   - 点击图片可直接裁剪/调整大小

3. **板块快捷添加**
   - 后台首页按板块（代表作 / 全部作品 / 复合设计）展示
   - 每个板块有"添加作品"按钮
   - 点击后进入简化创建流程

4. **保留媒体库**
   - 不作为主要上传方式
   - 保留用于管理已上传文件

---

## 四、技术架构

### 4.1 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.9 (App Router) | 全栈框架 |
| React | 19.2.4 | UI |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式 |
| Supabase | 2.108.2 | 数据库 + 存储 |
| Three.js | 0.184.0 | 3D 动画 |
| GSAP | 3.15.0 | 动画 |

### 4.2 关键文件
| 文件 | 说明 |
|------|------|
| `src/app/admin/(protected)/works/[id]/page.tsx` | 作品编辑页（主要改造对象） |
| `src/app/admin/(protected)/works/page.tsx` | 作品列表页 |
| `src/components/admin/MediaPicker.tsx` | 媒体选择器（需改造支持多选） |
| `src/lib/cms/repository.ts` | 数据层（Supabase + 静态回退） |
| `src/app/admin/(protected)/media/UploadForm.tsx` | 媒体上传组件 |

---

## 五、待完成工作（优先级排序）

### P0（核心功能）
- [ ] **重新设计作品上传流程**
  - 在作品编辑页添加拖拽上传区
  - 支持多选文件
  - 上传后自动创建内容块

- [ ] **实现流式内容编辑器**
  - 内容块可拖拽排序
  - 点击图片可裁剪
  - 文字可内联编辑

### P1（体验优化）
- [ ] **后台首页改版**
  - 按板块展示作品
  - 每个板块有"添加作品"按钮

- [ ] **媒体库保留但弱化**
  - 不作为主要上传入口
  - 保留用于批量管理

### P2（后续迭代）
- [ ] 前台作品详情页排版优化
- [ ] 响应式适配（手机端编辑体验）
- [ ] 性能优化（大量图片时懒加载）

---

## 六、数据库设计

### 6.1 现有表结构
- `works`：作品主表
- `work_blocks`：内容块（文本/媒体/图库/视频/PDF/BeforeAfter）
- `media_assets`：媒体库
- `categories` / `tags`：分类与标签
- `work_categories` / `work_tags`：作品-分类/标签关联

### 6.2 需要新增的功能
- 支持批量插入 `work_blocks`
- 支持块排序更新（拖拽后保存新顺序）

---

## 七、开发指南

### 7.1 本地开发
```bash
# 启动开发服务器
cd "D:\上山采月亮的台式\作品集网站\2026-作品集网站"
npm run dev
# 访问 http://localhost:3000
```

### 7.2 构建检查
```bash
npm run build   # 生产构建
npm run lint    # 代码检查
npm run test    # 单元测试
```

### 7.3 部署
```bash
# 自动部署：push 到 GitHub master 分支 → Vercel 自动构建
# 手动部署：
npx vercel deploy --prod --yes --token <VERCEL_TOKEN>
```

---

## 八、环境变量

### 8.1 本地（`.env.local`）
```
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<service role key>
ADMIN_EMAIL=3624457672@qq.com
```

### 8.2 Vercel
在 Vercel 项目设置中配置同上环境变量。

---

## 九、常见问题

### Q1: 本地开发服务器打不开？
**解决**：
1. 检查端口占用：`netstat -ano | grep ":3000"`
2. 如果端口被占用但无法访问，结束进程后重启：
   ```bash
   taskkill /F /PID <PID>
   npm run dev
   ```

### Q2: Supabase 本地连接失败？
**原因**：需要 Docker Desktop 运行。
**解决**：启动 Docker Desktop，然后运行：
```bash
npx supabase db reset
```

### Q3: GitHub Push 被拒绝？
**原因**：secret scanning 检测到 token。
**解决**：确保 `.env.local` 在 `.gitignore` 中，移除 commit 中的敏感信息。

---

## 十、下一步建议

### 方案 A：先做交互原型
- 用 HTML/CSS/JS 实现 Behance 风格编辑器原型
- 确认交互细节后再集成到 Next.js

### 方案 B：直接改造现有代码
- 重写 `src/app/admin/(protected)/works/[id]/page.tsx`
- 引入拖拽上传库（如 `react-dropzone` + `dnd-kit`）

**推荐**：先执行方案 A，避免反复修改代码。

---

## 十一、关键联系人

| 角色 | 信息 |
|------|------|
| **开发者** | 陈涛涛（视觉设计师） |
| **邮箱** | 3624457672@qq.com |
| **微信** | CTT522423 |

---

**文档更新时间**：2026-06-23  
**最后确认功能**：作品编辑页内容块系统（6 种块类型）  
**待确认**：新上传流程的交互设计原型
