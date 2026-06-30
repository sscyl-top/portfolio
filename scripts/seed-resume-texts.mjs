// 一次性脚本：为简历页 EditableText 插入缺失的 text_content 记录
// 运行后可删除此文件
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

// 读取 .env.local
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 简历页所有 EditableText 的 key + fallback 值
// 来源：src/app/resume/page.tsx + src/components/resume/ContactFinale.tsx
const records = [
  // hero 区
  { key: 'resume.hero.yearLabel', content: 'Portfolio / Resume 2026', page: 'resume', section: 'hero', sort_order: 1 },
  { key: 'resume.hero.greeting', content: "HI, I'M 陈涛涛", page: 'resume', section: 'hero', sort_order: 2 },
  { key: 'resume.hero.intro', content: '我是陈涛涛，一名专注于品牌全链路视觉、商业设计落地与 AIGC 工作流的设计师。当前以求职面试为主，同时保留少量品牌视觉与网页视觉服务合作入口。', page: 'resume', section: 'hero', sort_order: 3 },
  { key: 'resume.hero.downloadJpg', content: '下载简历 JPG', page: 'resume', section: 'hero', sort_order: 4 },
  { key: 'resume.hero.downloadPdf', content: '下载简历 PDF', page: 'resume', section: 'hero', sort_order: 5 },
  // strengths section
  { key: 'resume.section.strengths.title', content: '核心优势', page: 'resume', section: 'sections', sort_order: 10 },
  { key: 'resume.section.strengths.subtitle', content: 'Core strengths', page: 'resume', section: 'sections', sort_order: 11 },
  // experience section
  { key: 'resume.section.experience.title', content: '社会经历', page: 'resume', section: 'sections', sort_order: 12 },
  { key: 'resume.section.experience.subtitle', content: 'Social experience', page: 'resume', section: 'sections', sort_order: 13 },
  // campus section
  { key: 'resume.section.campus.title', content: '校园经历', page: 'resume', section: 'sections', sort_order: 14 },
  { key: 'resume.section.campus.subtitle', content: 'Campus experience', page: 'resume', section: 'sections', sort_order: 15 },
  // education section
  { key: 'resume.section.education.title', content: '教育背景', page: 'resume', section: 'sections', sort_order: 16 },
  { key: 'resume.section.education.subtitle', content: 'Educational background', page: 'resume', section: 'sections', sort_order: 17 },
  // activities section
  { key: 'resume.section.activities.title', content: '组织与实践', page: 'resume', section: 'sections', sort_order: 18 },
  { key: 'resume.section.activities.subtitle', content: 'Activities', page: 'resume', section: 'sections', sort_order: 19 },
  // contact 区
  { key: 'resume.contact.subtitle', content: 'Design service / Contact', page: 'resume', section: 'contact', sort_order: 20 },
  { key: 'resume.contact.title', content: '设计服务合作', page: 'resume', section: 'contact', sort_order: 21 },
];

async function main() {
  console.log(`共 ${records.length} 个 key 需要检查`);

  // 查询已存在的 key
  const { data: existing, error: queryError } = await supabase
    .from('text_content')
    .select('key')
    .in('key', records.map((r) => r.key))
    .eq('is_active', true)
    .is('deleted_at', null);

  if (queryError) {
    console.error('查询失败:', queryError.message);
    process.exit(1);
  }

  const existingKeys = new Set((existing ?? []).map((r) => r.key));
  const toInsert = records.filter((r) => !existingKeys.has(r.key));

  if (toInsert.length === 0) {
    console.log('所有记录已存在，无需插入');
    process.exit(0);
  }

  console.log(`需要插入 ${toInsert.length} 条记录:`);
  toInsert.forEach((r) => console.log(`  - ${r.key}`));

  const { data, error } = await supabase
    .from('text_content')
    .insert(
      toInsert.map((r) => ({
        key: r.key,
        content: r.content,
        page: r.page,
        section: r.section,
        sort_order: r.sort_order,
        is_active: true,
      })),
    )
    .select('key');

  if (error) {
    console.error('插入失败:', error.message);
    process.exit(1);
  }

  console.log(`\n成功插入 ${data?.length ?? 0} 条记录`);
}

main();
