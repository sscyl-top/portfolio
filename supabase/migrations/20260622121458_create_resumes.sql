-- ============================================================================
-- Resume CMS — single-row editable profile
-- ============================================================================

create table public.resumes (
  id boolean primary key default true check (id),
  name text not null default '',
  alias text not null default '',
  role text not null default '',
  positioning text not null default '',
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  zcool_url text not null default '',
  wechat_id text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "public reads resume"
  on public.resumes
  for select
  to anon, authenticated
  using (true);

create policy "admin manages resume"
  on public.resumes
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.resumes from anon, authenticated;

grant select on public.resumes to anon, authenticated;
grant insert, update, delete on public.resumes to authenticated;
grant insert, update, delete on public.resumes to service_role;

-- Seed with current static resume data so the page works immediately.
insert into public.resumes (id, name, alias, role, positioning, location, email, phone, zcool_url, wechat_id, strengths)
values (
  true,
  '陈涛涛',
  'CHEN TAOTAO',
  '品牌/视觉 AI 设计师',
  '以求职面试为主的个人作品集，兼顾品牌视觉、AI 设计与网页视觉服务合作。',
  '广东-深圳',
  '3020714732@qq.com',
  '19276690901',
  'https://www.zcool.com.cn/u/25717361',
  'CTT522423',
  '[
    "综合 5 年+经验：曾作为年销亿级全球全产业链品牌「极克 Jetfly」的唯一首席设计师，以一人设计团队模式独立构建并落地品牌全链路视觉体系。",
    "全栈视觉闭环：精通品牌 VI、电商 UX、产品 ID、空间 SI、包装工程，具备从 0 到 1 搭建全链路品牌视觉体系落地的能力。",
    "技术驱动设计：深度掌握 AIGC 技术，熟练搭建 AI 设计工作流，运用 AI 工具输出多版本设计方案，实现设计产出效率 200% 提升。",
    "跨部门协同与落地：具备 Web 视觉设计与落地能力，可进行 vibe coding 式页面搭建与设计实现，同时支持短视频剪辑与动效表达。",
    "团队管理与品牌推广实战：曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。"
  ]'::jsonb
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
  strengths = excluded.strengths;

-- Insert into deploy table so the CMS RLS admin-manages loop sees it.
do $$
begin
  execute format(
    'create policy "admin manages resumes" on public.resumes for all '
    'to authenticated using (private.is_admin()) '
    'with check (private.is_admin())'
  );
exception when duplicate_object then null;
end;
$$;