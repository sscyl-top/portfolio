export type WorkStatus = "draft" | "published" | "private";

export type ContentBlock =
  | {
      type: "text";
      heading: string;
      body: string;
    }
  | {
      type: "image";
      heading: string;
      alt: string;
      tone: string;
    }
  | {
      type: "media";
      caption?: string;
      items: WorkMedia[];
    }
  | {
      type: "gallery";
      caption?: string;
      items: WorkMedia[];
    }
  | {
      type: "beforeAfter";
      heading: string;
      beforeLabel: string;
      afterLabel: string;
      note: string;
    };

export type Work = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  tools: string[];
  year: string;
  status: WorkStatus;
  priority: number;
  featuredPriority?: number;
  palette: string[];
  coverTone: string;
  coverMedia?: WorkMedia;
  hoverMedia?: WorkMedia;
  shareMedia?: WorkMedia;
  blocks: ContentBlock[];
};

export type WorkMedia = {
  alt: string;
  mimeType: string;
  url: string;
};

export const siteSettings = {
  name: "CHEN TAOTAO",
  logo: "CT",
  title: "Brand Visual + AI Designer",
  description:
    "面向求职面试的个人作品集网站，兼顾品牌视觉、AI 设计与网页视觉服务合作入口。",
  navigation: [
    { label: "首页", href: "/" },
    { label: "全部作品", href: "/works" },
    { label: "简历", href: "/resume" },
  ],
  socialLinks: [
    { label: "Zcool", href: "https://www.zcool.com.cn/u/25717361" },
    { label: "Email", href: "mailto:3020714732@qq.com" },
  ],
};

export const categories = [
  "视觉设计",
  "品牌全案",
  "概念设计",
  "AI漫剧",
  "TVC广告",
  "包装设计",
  "电商设计",
  "工作流搭建",
  "Agent设计",
  "早期设计",
  "工作案例",
];

export const resume = {
  name: "陈涛涛",
  alias: "CHEN TAOTAO",
  role: "品牌/视觉 AI 设计师",
  positioning:
    "以求职面试为主的个人作品集，兼顾品牌视觉、AI 设计与网页视觉服务合作。",
  location: "广东-深圳",
  contact: {
    email: "3020714732@qq.com",
    phone: "19276690901",
    zcool: "https://www.zcool.com.cn/u/25717361",
  },
  strengths: [
    "综合 5 年+经验：曾作为年销亿级全球全产业链品牌「极克 Jetfly」的唯一首席设计师，以一人设计团队模式独立构建并落地品牌全链路视觉体系。",
    "全栈视觉闭环：精通品牌 VI、电商 UX、产品 ID、空间 SI、包装工程，具备从 0 到 1 搭建全链路品牌视觉体系落地的能力。",
    "技术驱动设计：深度掌握 AIGC 技术，熟练搭建 AI 设计工作流，运用 AI 工具输出多版本设计方案，实现设计产出效率 200% 提升。",
    "跨部门协同与落地：具备 Web 视觉设计与落地能力，可进行 vibe coding 式页面搭建与设计实现，同时支持短视频剪辑与动效表达。",
    "团队管理与品牌推广实战：曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。",
  ],
  highlights: [
    "Brand Visual System",
    "AIGC Workflow",
    "Campaign Design",
    "Web Visual Direction",
    "Cross-functional Delivery",
  ],
  expertise: [
    {
      title: "Strategy",
      items: ["品牌升级", "视觉体系规划", "商业转化支持", "跨平台一致性"],
    },
    {
      title: "Creative",
      items: ["品牌 VI/CI", "电商视觉", "包装设计", "活动主视觉"],
    },
    {
      title: "AI Workflow",
      items: ["AIGC 场景合成", "多方案提案", "ComfyUI / Midjourney", "视觉精修"],
    },
    {
      title: "Production",
      items: ["Web 视觉落地", "短视频剪辑", "动效表达", "展会与空间物料"],
    },
  ],
  experience: [
    {
      company: "深圳市天云极客科技有限公司",
      title: "品牌视觉负责人",
      period: "2025.4 - 2025.8 / 线上办公室至 2026.4",
      points: [
        "独立主导全球品牌 JetFly 极克视觉重塑，搭建覆盖全球渠道的品牌视觉体系。",
        "统筹国内外 6+ 电商渠道视觉系统，通过 AIGC 辅助场景合成，提高详情页转化效率并降低素材成本。",
        "独立操刀 3 款年度旗舰新品 ID 设计及全系包装工程，统一全球 10+ 国家、100+ 经销商物料视觉标准。",
        "输出动力冲浪板赛事涂装、展会物料与商业空间视觉，支撑品牌在专业场景中的识别度。",
      ],
    },
    {
      company: "深圳与可文化科技有限公司",
      title: "电商品牌设计师",
      period: "2024.7 - 2025.4",
      points: [
        "根据公司定位与传播方向，优化品牌全案与宣传物料，确保视觉统一。",
        "协同完成主流电商平台店铺设计，覆盖主图、SKU、详情、首页、大促活动图与产品定制设计。",
        "全面提升品牌视觉输出效果，主图在天猫、京东点击率破公司纪录。",
      ],
    },
  ],
  campus: [
    {
      company: "七星关区域蓝酒坊",
      title: "品牌设计师",
      period: "2023.4 - 2023.12",
      description: "负责品牌视觉与酒品包装设计，协同团队落地线下传播方案与推广预算。",
    },
    {
      company: "武汉楚德宝智能设备有限公司",
      title: "设计组长/副店长",
      period: "2023.1 - 2023.3",
      description: "统筹设计师团队管理、人员招聘、薪酬发放、稿件审核与客户售后问题。",
    },
    {
      company: "维沃移动通信有限公司 vivo",
      title: "主题 UI 设计师",
      period: "2022.9 - 2022.12",
      description: "全链路把控主题开发、测试、发布，通过视觉框架升级增强用户粘性。",
    },
    {
      company: "成都艺天创意广告有限公司",
      title: "广告设计师",
      period: "2021.8 - 2022.8",
      description: "对接客户并负责广告设计全流程，同时兼任多家电商品牌视觉设计。",
    },
  ],
  education: {
    school: "毕节学院",
    schoolEnglish: "BIJIE UNIVERSITY",
    major: "视觉传达设计专业",
    majorEnglish: "Visual Communication Design",
    period: "2020.9 - 2024.7",
    note: "绩点 3.93（专业第一）；获 vivo 全球主题大赛特邀奖、大广赛省赛一等奖 2 个、二等奖 3 个、优秀奖若干、贵州省包装大赛二等奖。",
    achievements: [
      { label: "GPA", value: "3.93", detail: "专业第一" },
      { label: "AWARD", value: "vivo 全球主题大赛特邀奖" },
      { label: "AWARD", value: "大广赛省赛一等奖 2 个" },
      { label: "AWARD", value: "大广赛省赛二等奖 3 个" },
      { label: "AWARD", value: "大广赛优秀奖若干" },
      { label: "AWARD", value: "贵州省包装大赛二等奖" },
    ],
    activities: [
      {
        period: "2021年4月",
        title: "交通银行校园大使",
        description:
          "自建团队并执行路演、联名活动等品牌推广方案，借助线上线下整合传播并达成 500+ 发卡量。",
      },
      {
        period: "2021 - 2022",
        title: "学生会宣传部部长",
        description:
          "带领宣传部和融媒体中心干事，策划并落地校运会、迎新晚会等大型校园活动的全案视觉统筹。",
      },
      {
        period: "2022 - 2023",
        title: "动漫社社长",
        description:
          "组织社团招新 137 人，打破社团 8 年记录；策划动漫文化节，负责视觉宣发、人员协调与现场氛围布置。",
      },
      {
        period: "2024年4月 - 5月",
        title: "毕业展主设计师",
        description:
          "主导设计艺术学院本届美术系、音乐系、舞蹈系大型桁架毕业海报设计，策划设计系毕业宣传海报与设计展布置。",
      },
    ],
  },
  services: ["品牌视觉升级", "AI 概念图与视觉提案", "作品集网页视觉", "活动与电商主视觉"],
  downloads: {
    jpg: "/resume/chen-taotao-resume.jpg",
    pdf: "/resume/chen-taotao-resume.pdf",
  },
};

export const works: Work[] = [
  {
    title: "RJ Tech Brand System",
    slug: "rj-tech-brand-system",
    summary: "沙地摩托品牌识别、电商视觉与商业传播系统。",
    category: "品牌全案",
    tags: ["品牌识别", "电商", "视觉系统"],
    tools: ["Illustrator", "Photoshop", "Figma"],
    year: "2026",
    status: "published",
    priority: 100,
    featuredPriority: 100,
    palette: ["#121417", "#E7ECEC", "#D60012"],
    coverTone: "red",
    blocks: [
      {
        type: "text",
        heading: "项目背景",
        body: "为沙地摩托品牌建立可用于官网、电商页面、销售材料与展会传播的视觉语言。",
      },
      {
        type: "image",
        heading: "视觉系统",
        alt: "沙地摩托品牌视觉占位图",
        tone: "red",
      },
    ],
  },
  {
    title: "TECLOMAN Energy Visuals",
    slug: "tecloman-energy-visuals",
    summary: "新能源品牌传播、产品图形与展会视觉。",
    category: "品牌全案",
    tags: ["新能源", "传播", "展会"],
    tools: ["Photoshop", "Illustrator", "Midjourney"],
    year: "2025",
    status: "published",
    priority: 90,
    featuredPriority: 90,
    palette: ["#0B0F12", "#D7E4DF", "#4EA7FF"],
    coverTone: "blue",
    blocks: [
      {
        type: "text",
        heading: "视觉目标",
        body: "将能源产品的理性参数转译为更具品牌感的视觉叙事，兼顾专业度与市场传播效率。",
      },
      {
        type: "image",
        heading: "传播资产",
        alt: "新能源传播视觉占位图",
        tone: "blue",
      },
    ],
  },
  {
    title: "Hotelite Hospitality Identity",
    slug: "hotelite-hospitality-identity",
    summary: "酒店与生活方式品牌识别、应用系统与氛围图形。",
    category: "视觉设计",
    tags: ["酒店", "生活方式", "品牌应用"],
    tools: ["Figma", "Illustrator", "Photoshop"],
    year: "2025",
    status: "published",
    priority: 80,
    featuredPriority: 80,
    palette: ["#15110E", "#F1E7D6", "#9F6E4D"],
    coverTone: "warm",
    blocks: [
      {
        type: "text",
        heading: "品牌语气",
        body: "通过克制的色彩、版式和细节系统，表达酒店品牌的舒适、秩序与高端质感。",
      },
      {
        type: "image",
        heading: "空间延展",
        alt: "酒店品牌视觉占位图",
        tone: "warm",
      },
    ],
  },
  {
    title: "Kukaski Interface Design",
    slug: "kukaski-interface-design",
    summary: "官网首页、移动端活动页与产品视觉组件库。",
    category: "视觉设计",
    tags: ["网页视觉", "UI", "组件"],
    tools: ["Figma", "Photoshop"],
    year: "2025",
    status: "published",
    priority: 70,
    featuredPriority: 70,
    palette: ["#0A0B0D", "#EAE7DE", "#8BD7CD"],
    coverTone: "cyan",
    blocks: [
      {
        type: "text",
        heading: "页面系统",
        body: "建立可复用的视觉组件、头图规则和模块节奏，让营销页面保持统一的品牌气质。",
      },
    ],
  },
  {
    title: "AIGC Concept Lab",
    slug: "aigc-concept-lab",
    summary: "AI 概念生成、视觉探索与商业提案工作流。",
    category: "概念设计",
    tags: ["AIGC", "概念设计", "视觉提案"],
    tools: ["Midjourney", "ComfyUI", "Photoshop"],
    year: "2026",
    status: "published",
    priority: 60,
    featuredPriority: 60,
    palette: ["#0B0B0B", "#F3F6F3", "#C8A27E"],
    coverTone: "mono",
    blocks: [
      {
        type: "text",
        heading: "工作流",
        body: "用 AI 快速建立方向，再通过人工审美、合成修图和品牌逻辑筛选可落地方案。",
      },
      {
        type: "beforeAfter",
        heading: "从草图到商业视觉",
        beforeLabel: "AI 初稿",
        afterLabel: "设计精修",
        note: "展示从生成图到可交付商业视觉的判断、取舍和修正过程。",
      },
    ],
  },
  {
    title: "Packaging Engineering",
    slug: "packaging-engineering",
    summary: "产品包装工程、物料规范与全球渠道标准。",
    category: "包装设计",
    tags: ["包装", "产品", "物料标准"],
    tools: ["Illustrator", "Photoshop"],
    year: "2025",
    status: "published",
    priority: 50,
    featuredPriority: 50,
    palette: ["#111111", "#F5F0E8", "#2F64FF"],
    coverTone: "graphite",
    blocks: [
      {
        type: "text",
        heading: "包装落地",
        body: "统一产品包装、经销商物料和跨国家渠道视觉标准，减少品牌碎片化。",
      },
    ],
  },
  {
    title: "ClubBuy Campaign System",
    slug: "clubbuy-campaign-system",
    summary: "电商促销活动主视觉、页面节奏与物料模板。",
    category: "电商设计",
    tags: ["电商", "活动", "转化"],
    tools: ["Photoshop", "Figma"],
    year: "2024",
    status: "published",
    priority: 40,
    featuredPriority: 40,
    palette: ["#111111", "#F6F2E8", "#6FA6D9"],
    coverTone: "blue",
    blocks: [
      {
        type: "text",
        heading: "活动系统",
        body: "围绕活动节奏拆解页面层级、商品模块和传播物料，让视觉效率服务转化目标。",
      },
      {
        type: "image",
        heading: "页面延展",
        alt: "电商活动页面占位图",
        tone: "blue",
      },
    ],
  },
  {
    title: "JetFly Retail Launch",
    slug: "jetfly-retail-launch",
    summary: "线下展会、门店物料、销售工具与渠道传播整合。",
    category: "工作案例",
    tags: ["展会", "渠道", "物料"],
    tools: ["Illustrator", "Photoshop", "After Effects"],
    year: "2025",
    status: "published",
    priority: 30,
    palette: ["#101010", "#F3F2EE", "#D9A66F"],
    coverTone: "bronze",
    blocks: [
      {
        type: "text",
        heading: "执行链路",
        body: "把品牌识别延展到展架、队旗、门店海报与销售资料，保证多场景一致性。",
      },
    ],
  },
  {
    title: "Visual Ops Playbook",
    slug: "visual-ops-playbook",
    summary: "设计团队协作规范、素材管理与多版本交付流程。",
    category: "工作案例",
    tags: ["团队协作", "规范", "交付"],
    tools: ["Figma", "Notion", "Photoshop"],
    year: "2024",
    status: "published",
    priority: 20,
    palette: ["#0D0D0D", "#EDEDED", "#8BD7CD"],
    coverTone: "cyan",
    blocks: [
      {
        type: "text",
        heading: "流程优化",
        body: "沉淀命名、版本、审核与复盘规则，让高频设计需求更稳定地交付。",
      },
    ],
  },
  {
    title: "Helmet Composite Design",
    slug: "helmet-composite-design",
    summary: "赛车头盔复合设计、图案系统与展示排版。",
    category: "复合设计",
    tags: ["复合设计", "运动视觉", "图案"],
    tools: ["Photoshop", "Illustrator"],
    year: "2024",
    status: "published",
    priority: 15,
    palette: ["#101010", "#F4F4F1", "#C55542"],
    coverTone: "bronze",
    blocks: [
      {
        type: "text",
        heading: "图案逻辑",
        body: "以速度、保护与赛事识别为主线，建立可适配不同角度和介质的图案系统。",
      },
      {
        type: "image",
        heading: "组合展示",
        alt: "赛车头盔复合设计占位图",
        tone: "red",
      },
    ],
  },
  {
    title: "Lando Helmet Series",
    slug: "lando-helmet-series",
    summary: "竞速主题头盔配色、号码元素与动态视觉延展。",
    category: "复合设计",
    tags: ["头盔", "赛事", "图形延展"],
    tools: ["Photoshop", "Illustrator"],
    year: "2024",
    status: "published",
    priority: 14,
    palette: ["#0B0B0B", "#FFFFFF", "#F26D21"],
    coverTone: "orange",
    blocks: [
      {
        type: "text",
        heading: "识别设计",
        body: "围绕赛事速度感和远距离识别，拆解颜色、号码、线条和赞助商区域的组合逻辑。",
      },
    ],
  },
  {
    title: "Racing Pattern Study",
    slug: "racing-pattern-study",
    summary: "运动装备纹样、贴花系统与多角度落地验证。",
    category: "复合设计",
    tags: ["贴花", "纹样", "装备"],
    tools: ["Photoshop", "C4D"],
    year: "2023",
    status: "published",
    priority: 13,
    palette: ["#111111", "#EDEDED", "#8BD7CD"],
    coverTone: "graphite",
    blocks: [
      {
        type: "text",
        heading: "多角度验证",
        body: "通过模型预览验证图案在曲面、边缘和远近视距中的稳定识别效果。",
      },
    ],
  },
  {
    title: "Private Client Preview",
    slug: "private-client-preview",
    summary: "用于后续私密链接功能验证的非公开作品。",
    category: "品牌全案",
    tags: ["私密分享"],
    tools: ["Figma"],
    year: "2026",
    status: "private",
    priority: 1,
    palette: ["#101010", "#EDEDED", "#888888"],
    coverTone: "private",
    blocks: [
      {
        type: "text",
        heading: "私密作品",
        body: "第二阶段接入后台后通过 token 链接访问，不进入公开列表。",
      },
    ],
  },
];

export function getPublishedWorks() {
  return works
    .filter((work) => work.status === "published")
    .sort((a, b) => b.priority - a.priority);
}

export function getStaticVisibleCategories() {
  return categories.map((name, sort_order) => ({ name, sort_order }));
}

export function getStaticSiteSettings() {
  return siteSettings;
}

export function getFeaturedWorks() {
  return getPublishedWorks()
    .filter((work) => typeof work.featuredPriority === "number")
    .sort((a, b) => (b.featuredPriority ?? 0) - (a.featuredPriority ?? 0));
}

export function getCompositeWorks() {
  return getPublishedWorks().filter((work) => work.category === "复合设计");
}

export function getWorkBySlug(slug: string) {
  return works.find((work) => work.slug === slug);
}

export function getRelatedWorks(slug: string) {
  const current = getWorkBySlug(slug);

  if (!current) {
    return [];
  }

  return getPublishedWorks()
    .filter((work) => work.slug !== slug && work.category === current.category)
    .slice(0, 2);
}
