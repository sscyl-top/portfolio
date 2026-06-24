-- ============================================================================
-- Resume CMS — full editable profile
-- ============================================================================

alter table public.resumes
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists expertise jsonb not null default '[]'::jsonb,
  add column if not exists experience jsonb not null default '[]'::jsonb,
  add column if not exists campus jsonb not null default '[]'::jsonb,
  add column if not exists education jsonb not null default '{}'::jsonb,
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists downloads jsonb not null default '{}'::jsonb;

comment on column public.resumes.highlights is '高光标签，如 Brand Visual System';
comment on column public.resumes.expertise is '专长分类，每项包含 title 与 items 数组';
comment on column public.resumes.experience is '工作经验数组，每项包含 company/title/period/points';
comment on column public.resumes.campus is '校园经历数组，每项包含 company/title/period/description';
comment on column public.resumes.education is '教育背景对象，包含 school/major/period/achievements/activities';
comment on column public.resumes.services is '服务范围标签数组';
comment on column public.resumes.downloads is '简历下载链接，包含 pdf 与 jpg';

-- Seed with current static resume data so the page works immediately.
insert into public.resumes (
  id, name, alias, role, positioning, location, email, phone, zcool_url, wechat_id,
  strengths, highlights, expertise, experience, campus, education, services, downloads
)
values (
  true,
  '陈涛涛',
  'CHEN TAOTAO',
  '品牌/视觉 AI 设计师',
  '以求职面试为主的个人作品集，兼顾品牌视觉、AI 设计与网页视觉服务合作。',
  '广东-深圳',
  '3624457672@qq.com',
  '19276690901',
  'https://www.zcool.com.cn/u/25717361',
  'CTT522423',
  '[
    "综合 5 年+经验：曾作为年销亿级全球全产业链品牌「极克 Jetfly」的唯一首席设计师，以一人设计团队模式独立构建并落地品牌全链路视觉体系。",
    "全栈视觉闭环：精通品牌 VI、电商 UX、产品 ID、空间 SI、包装工程，具备从 0 到 1 搭建全链路品牌视觉体系落地的能力。",
    "技术驱动设计：深度掌握 AIGC 技术，熟练搭建 AI 设计工作流，运用 AI 工具输出多版本设计方案，实现设计产出效率 200% 提升。",
    "跨部门协同与落地：具备 Web 视觉设计与落地能力，可进行 vibe coding 式页面搭建与设计实现，同时支持短视频剪辑与动效表达。",
    "团队管理与品牌推广实战：曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。"
  ]'::jsonb,
  '["Brand Visual System", "AIGC Workflow", "Campaign Design", "Web Visual Direction", "Cross-functional Delivery"]'::jsonb,
  '[
    {"title": "Strategy", "items": ["品牌升级", "视觉体系规划", "商业转化支持", "跨平台一致性"]},
    {"title": "Creative", "items": ["品牌 VI/CI", "电商视觉", "包装设计", "活动主视觉"]},
    {"title": "AI Workflow", "items": ["AIGC 场景合成", "多方案提案", "视觉精修", "ComfyUI / Midjourney"]},
    {"title": "Production", "items": ["Web 视觉落地", "短视频剪辑", "动效表达", "展会与空间物料"]}
  ]'::jsonb,
  '[
    {"company": "深圳市天云极客科技有限公司", "title": "品牌视觉负责人", "period": "2025.4 - 2025.8 / 线上办公室至 2026.4", "points": [
      "独立主导全球品牌 JetFly 极克视觉重塑，搭建覆盖全球渠道的品牌视觉体系。",
      "统筹国内外 6+ 电商渠道视觉系统，通过 AIGC 辅助场景合成，提高详情页转化效率并降低素材成本。",
      "独立操刀 3 款年度旗舰新品 ID 设计及全系包装工程，统一全球 10+ 国家、100+ 经销商物料视觉标准。",
      "输出动力冲浪板赛事涂装、展会物料与商业空间视觉，支撑品牌在专业场景中的识别度。"
    ]},
    {"company": "深圳与可文化科技有限公司", "title": "电商品牌设计师", "period": "2024.7 - 2025.4", "points": [
      "根据公司定位与传播方向，优化品牌全案与宣传物料，确保视觉统一。",
      "协同完成主流电商平台店铺设计，覆盖主图、SKU、详情、首页、大促活动图与产品定制设计。",
      "全面提升品牌视觉输出效果，主图在天猫、京东点击率破公司纪录。"
    ]}
  ]'::jsonb,
  '[
    {"company": "七星关区域蓝酒坊", "title": "品牌设计师", "period": "2023.4 - 2023.12", "description": "负责品牌视觉与酒品包装设计，协同团队落地线下传播方案与推广预算。"},
    {"company": "武汉楚德宝智能设备有限公司", "title": "设计组长/副店长", "period": "2023.1 - 2023.3", "description": "统筹设计师团队管理、人员招聘、薪酬发放、稿件审核与客户售后问题。"},
    {"company": "维沃移动通信有限公司 vivo", "title": "主题 UI 设计师", "period": "2022.9 - 2022.12", "description": "全链路把控主题开发、测试、发布，通过视觉框架升级增强用户粘性。"},
    {"company": "成都艺天创意广告有限公司", "title": "广告设计师", "period": "2021.8 - 2022.8", "description": "对接客户并负责广告设计全流程，同时兼任多家电商品牌视觉设计。"}
  ]'::jsonb,
  '{
    "school": "毕节学院",
    "schoolEnglish": "BIJIE UNIVERSITY",
    "major": "视觉传达设计专业",
    "majorEnglish": "Visual Communication Design",
    "period": "2020.9 - 2024.7",
    "note": "绩点 3.93（专业第一）；获 vivo 全球主题大赛特邀奖、大广赛省赛一等奖 2 个、二等奖 3 个、优秀奖若干、贵州省包装大赛二等奖。",
    "achievements": [
      {"label": "GPA", "value": "3.93", "detail": "专业第一"},
      {"label": "AWARD", "value": "vivo 全球主题大赛特邀奖"},
      {"label": "AWARD", "value": "大广赛省赛一等奖 2 个"},
      {"label": "AWARD", "value": "大广赛省赛二等奖 3 个"},
      {"label": "AWARD", "value": "大广赛优秀奖若干"},
      {"label": "AWARD", "value": "贵州省包装大赛二等奖"}
    ],
    "activities": [
      {"period": "2021年4月", "title": "交通银行校园大使", "description": "自建团队并执行路演、联名活动等品牌推广方案，借助线上线下整合传播并达成 500+ 发卡量。"},
      {"period": "2021 - 2022", "title": "学生会宣传部部长", "description": "带领宣传部和融媒体中心干事，策划并落地校运会、迎新晚会等大型校园活动的全案视觉统筹。"},
      {"period": "2022 - 2023", "title": "动漫社社长", "description": "组织社团招新 137 人，打破社团 8 年记录；策划动漫文化节，负责视觉宣发、人员协调与现场氛围布置。"},
      {"period": "2024年4月 - 5月", "title": "毕业展主设计师", "description": "主导设计艺术学院本届美术系、音乐系、舞蹈系大型桁架毕业海报设计，策划设计系毕业宣传海报与设计展布置。"}
    ]
  }'::jsonb,
  '["品牌视觉升级", "AI 概念图与视觉提案", "作品集网页视觉", "活动与电商主视觉"]'::jsonb,
  '{"jpg": "/resume/chen-taotao-resume.jpg", "pdf": "/resume/chen-taotao-resume.pdf"}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  alias = excluded.alias,
  role = excluded.role,
  positioning = excluded.positioning,
  location = excluded.location,
  email = excluded.email,
  phone = excluded.phone,
  zcool_url = excluded.zcool_url,
  wechat_id = excluded.wechat_id,
  strengths = excluded.strengths,
  highlights = excluded.highlights,
  expertise = excluded.expertise,
  experience = excluded.experience,
  campus = excluded.campus,
  education = excluded.education,
  services = excluded.services,
  downloads = excluded.downloads;
