# SSCYL Portfolio — 完整项目交接文档

## 一、项目概述

### 1.1 基本信息
- **项目名称**：SSCYL Portfolio（陈涛涛个人作品集网站）
- **线上地址**：https://sscyl.top
- **自定义域名**：sscyl.top（腾讯云购买，Vercel DNS 管理）
- **GitHub 仓库**：https://github.com/sscyl-top/portfolio.git
- **代码规模**：约 9,100 行（TypeScript/TSX/CSS，不含 node_modules）
- **本地路径**：`D:\上山采月亮的台式\作品集网站\2026-作品集网站`

### 1.2 目标
为品牌视觉设计师陈涛涛构建一个专业的在线作品集，兼顾求职面试展示和少量商业合作。核心需求：
- 展示 7 个精选代表作品 + 全部作品库 + 复合设计墙
- 手机端和电脑端都有良好的浏览体验
- 后台可管理作品、分类、媒体、简历、站点设置
- 支持 AIGC 工作流标签、3D 粒子动画等「技术驱动设计」的品牌调性

### 1.3 账号与平台
| 平台 | 账号/项目 | 说明 |
|------|----------|------|
| **域名** | sscyl.top | 腾讯云购买 |
| **DNS** | Vercel 管理 | NS 记录指向 Vercel |
| **部署** | Vercel (sscyl/portfolio) | 自动从 GitHub master 部署 |
| **数据库** | Supabase (hnujowombcgfxledpnxe) | PostgreSQL + Storage |
| **代码托管** | GitHub (sscyl-top/portfolio) | master 分支 |

---

## 二、技术架构

### 2.1 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.9 (App Router + Turbopack) | 全栈框架 |
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式系统 |
| Three.js | 0.184.0 | 3D 渲染 |
| @react-three/fiber | 9.6.1 | React 3D 集成 |
| GSAP | 3.15.0 | 入场动画 |
| Supabase | 2.108.2 | 数据库 + 认证 + 存储 |
| Zod | 4.4.3 | 数据验证 |
| Lucide React | 1.20.0 | 图标库 |
| yet-another-react-lightbox | 3.32.0 | 图片灯箱 |
| Vitest | 4.1.9 | 单元测试 |

### 2.2 架构设计

项目采用「CMS + 静态回退」的双轨架构：

```
┌─────────────────────────────────────────────┐
│                  用户浏览器                    │
├─────────────────────────────────────────────┤
│              Next.js App Router              │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ 首页 /   │ │ 作品 /works│ │ 简历 /resume │  │
│  │ (3D粒子) │ │ (轮播+筛选)│ │ (静态排版)   │  │
│  └─────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │         后台 /admin                  │   │
│  │  (作品CRUD、分类、媒体、简历、设置)    │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│          数据层 (repository.ts)              │
│     ┌──────────────┐  ┌──────────────┐      │
│     │ Supabase 在线 │  │ portfolio.ts │      │
│     │ (数据库读取)  │  │ (静态回退)    │      │
│     └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────┘
```

**关键设计决策**：
- 如果 Supabase 不可用（环境变量未配置），自动回退到静态数据 `portfolio.ts`
- 前台页面（首页/作品/简历）都走 SSR，layout 中读取站点设置
- 后台页面通过 Supabase Auth + RLS 保护

### 2.3 路由结构
| 路由 | 文件 | 类型 |
|------|------|------|
| `/` | `src/app/page.tsx` | 服务端组件 |
| `/works` | `src/app/works/page.tsx` | 服务端组件（SSR 查 Supabase） |
| `/works/[slug]` | `src/app/works/[slug]/page.tsx` | 服务端组件 |
| `/resume` | `src/app/resume/page.tsx` | 服务端组件 |
| `/admin` | `src/app/admin/page.tsx` | 客户端组件 |
| `/admin/login` | `src/app/admin/login/page.tsx` | 客户端组件 |
| `/admin/works` | `src/app/admin/(protected)/works/page.tsx` | 客户端组件 |
| `/admin/works/[id]` | `src/app/admin/(protected)/works/[id]/page.tsx` | 客户端组件 |
| `/admin/categories` | `src/app/admin/(protected)/categories/page.tsx` | 客户端组件 |
| `/admin/media` | `src/app/admin/(protected)/media/page.tsx` | 客户端组件 |
| `/admin/messages` | `src/app/admin/(protected)/messages/page.tsx` | 客户端组件 |
| `/admin/resume` | `src/app/admin/(protected)/resume/page.tsx` | 客户端组件 |
| `/admin/settings` | `src/app/admin/(protected)/settings/page.tsx` | 客户端组件 |
| `/api/contact` | `src/app/api/contact/route.ts` | API 路由 |

---

## 三、核心文件详解

### 3.1 数据与配置
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/data/portfolio.ts` | 536 | 静态作品数据、简历数据、导航配置、类型定义（Work, WorkMedia, ContentBlock 等） |
| `src/lib/cms/repository.ts` | 369 | CMS 数据仓库，封装 Supabase 查询 + 静态回退逻辑 |
| `src/lib/supabase/config.ts` | 39 | Supabase 环境变量读取 |
| `src/lib/supabase/server.ts` | 23 | 服务端 Supabase 客户端（cookie-based auth） |
| `src/lib/supabase/service.ts` | 11 | Service Role 客户端（绕过 RLS） |
| `src/lib/cms/private-preview.ts` | 16 | 私有作品预览 token 验证 |
| `next.config.ts` | 25 | Next.js 配置（图片 remotePatterns） |
| `.env.local` | - | 本地开发环境变量 |

### 3.2 首页组件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/components/home/HeroShowcase.tsx` | 232 | 首页第一屏：视频卡片 + 浮动装饰卡片 + ticker |
| `src/components/home/CapabilityBands.tsx` | 1,575 | 核心优势 5 个面板 + 3D 粒子（火箭/卫星/地球/土星/宇航员形状变换） |
| `src/components/home/AmbientParticles.tsx` | 69 | 首页背景粒子（Three.js ShaderMaterial） |
| `src/components/home/particleMotion.ts` | 166 | 粒子动画引擎（过渡混合、轨道、波纹、入场效果） |

### 3.3 作品页组件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/components/works/RepresentativeWorks.tsx` | 252 | **代表作 7 卡轮播**（手机端滑动 + 电脑端扇形展开） |
| `src/components/works/WorksExplorer.tsx` | 177 | 全部作品分类筛选 + 详情卡片 |
| `src/components/works/CompositeDesignWall.tsx` | 238 | 复合设计作品墙 |
| `src/components/works/WorksPageShell.tsx` | 46 | 作品页容器（3D 光斑背景） |
| `src/components/works/WorkMediaFrame.tsx` | 34 | 作品媒体预览框 |

### 3.4 简历组件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/components/resume/ContactFinale.tsx` | 124 | 简历底部联系区域 |

### 3.5 后台组件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/app/admin/actions.ts` | 420 | 后台所有 Server Actions（作品 CRUD、分类、媒体、简历、设置） |
| `src/lib/cms/admin-model.ts` | 83 | 后台数据模型 |
| `src/lib/cms/validation.ts` | 98 | Zod 验证 schema |

---

## 四、代表作轮播实现详解（重点踩坑记录）

### 4.1 需求
手机端 7 张卡片扇形层叠排列，手指左右滑动触发层级切换：
- 左滑：当前卡片移到左边，右边下一张顶上来
- 右滑：当前卡片移到右边，左边下一张顶上来
- 无限循环轮播
- 不跟手移动，松手后自然切换
- 背景不能闪

### 4.2 最终方案（commit 60ca246 + 5f0c222）
**核心思路**：
1. 每张卡片用 `key={`s-${realIndex}`}` 保持 DOM 稳定
2. `relPos`（视觉位置 -3~+3）根据 `centerIndex` 通过模运算动态计算：
   ```ts
   const rawPos = (realIndex - centerIndex + CARD_COUNT + 3) % CARD_COUNT;
   const relPos = rawPos - 3;
   ```
3. CSS transition 作用于 transform，卡片在槽位间平滑滑动
4. 跨边界卡片（relPos 从 -3 跳到 3 或反过来）跳过 transform transition，避免"飞越屏幕"的闪烁：
   ```ts
   const _wrapped = new Set<number>();
   // 检测 relPos 变化超过 3 的卡片
   if (prev !== undefined && Math.abs(relPos - prev) > 3) {
     _wrapped.add(realIndex);
   }
   // 跨边界卡片只保留 opacity transition
   transition: _wrapped.has(realIndex)
     ? "opacity 0.4s ease"
     : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease"
   ```

### 4.3 踩坑历程（约 20 次失败尝试）
1. **React key 问题**：最初用 `key={realIndex}`，右滑时 key 从 0→6、1→0 跨边界，React diff 策略导致 DOM 重建丢失 CSS transition → 右滑不动
2. **固定槽位只换内容**：尝试用 `key={relPos}` 让 DOM 稳定，但 transform 不加 transition → 卡片不动只换内容
3. **容器 bump 动画**：给整个容器加 translateX 偏移再弹回 → 有回弹感，效果不好
4. **opacity 闪烁**：瞬间隐藏再显示 → 用户要的是层级切换不是淡入淡出
5. **跟手移动**：最早有拖拽跟随（dragOffset），用户明确要求去掉

**最终绕行方案**：保留 transform transition + 跨边界检测关闭 transition，避免闪烁；左右滑动完全对称。

---

## 五、部署与环境

### 5.1 Vercel 部署
```bash
# 部署命令
npx vercel deploy --prod --yes --token <VERCEL_TOKEN>

# 自动从 GitHub master 分支部署
# 域名别名：sscyl.top
```

### 5.2 环境变量（Vercel）
```
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon_key>
SUPABASE_SECRET_KEY=<service_role_key>
CONTACT_RATE_LIMIT_SECRET=<any_secret>
ADMIN_EMAIL=3624457672@qq.com
```

### 5.3 本地开发
```bash
cd "D:\上山采月亮的台式\作品集网站\2026-作品集网站"
npm run dev    # http://localhost:3000
npm run build  # 生产构建
npm run test   # 运行测试
```

### 5.4 Supabase 本地
本地 Supabase CLI 运行在 `http://127.0.0.1:54321`

---

## 六、已知问题与绕行方案

### 6.1 GitHub Push 被拒绝
**现象**：push 时报 `push declined due to repository rule violations`
**原因**：GitHub 仓库设置了 secret scanning，检测到 commit 中包含 token 格式字符串
**绕行**：从 commit 中移除敏感 token，用 `<VERCEL_TOKEN>` 占位符替代

### 6.2 Vercel 部署失败（临时文件）
**现象**：部署构建时报 `Cannot find module './WorkMediaFrame'` 在临时文件中
**原因**：工作目录中的 `temp_*.tsx` 文件被上传到 Vercel，TypeScript 编译时扫描到它们
**解决**：部署前删除所有 `temp_*` 文件

### 6.3 Vercel socket hang up
**现象**：部署偶尔报 `socket hang up`
**原因**：网络不稳定（国内访问 Vercel API）
**解决**：重试即可，通常第二次成功

### 6.4 手机端 Vivo 自带浏览器显示异常
**状态**：未完全解决
**现象**：首页导航栏在 Vivo 自带浏览器中显示不正常
**建议**：在更多真机上测试，可能需要加 CSS vendor prefix 或 polyfill

---

## 七、待完成工作

### 7.1 首页移动端优化
- [ ] 导航栏右边 logo 手机端不可见（SiteHeader.tsx 中 logo 区域在窄屏被隐藏）
- [ ] 核心优势板块间距需进一步调整，英文 outline 大字样式恢复
- [ ] 终场三个按钮（浏览作品、查看简历、聘用联系）改为横排一排
- [ ] 底部 CTA 区域可能需要调整

### 7.2 功能
- [ ] 后台管理完整功能测试（所有 CRUD 操作）
- [ ] 联系表单邮件发送（需配置 Resend）
- [ ] SEO 优化（sitemap、meta 标签）
- [ ] 作品详情页的媒体画廊功能完善

### 7.3 测试
- [ ] 更多真机测试（iOS Safari、Android Chrome、微信内置浏览器）
- [ ] 性能优化（3D 粒子在低端机上可能卡顿）

---

## 八、运维注意事项

1. **Supabase 数据库**：项目 `hnujowombcgfxledpnxe`，注意不要删除
2. **Vercel 环境变量**：切换 API 后需要重新配置
3. **域名续费**：sscyl.top 在腾讯云，注意续费时间
4. **GitHub Token**：Vercel 部署需要 GitHub 集成，确保授权不过期
5. **临时文件清理**：部署前运行 `git status` 检查是否有 temp 文件

---

**文档生成时间**：2026-06-22
**最后 commit**：54d7e76
