import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-session";

import { SaveButton } from "@/components/admin/SaveButton";
import { createTextContent } from "./actions";
import { EditTextContentRow } from "./EditTextContentRow";

export const dynamic = "force-dynamic";

type TextContentItem = {
  id: string;
  key: string;
  content: string;
  page: string;
  section: string | null;
  font_size: string | null;
  font_family: string | null;
  font_weight: string | null;
  color: string | null;
};

export default async function TextContentPage({ searchParams }: { searchParams: Promise<{ toast?: string; id?: string }> }) {
  await requireAdmin();
  const { toast, id } = await searchParams;

  let items: TextContentItem[] = [];
  let error: { message: string } | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase
      .from("text_content")
      .select("*")
      .is("deleted_at", null)
      .order("page")
      .order("section")
      .order("sort_order");

    if (result.error) {
      console.error("Failed to fetch text_content:", result.error);
      error = result.error;
    }
    items = (result.data ?? []) as TextContentItem[];
  } catch (e: unknown) {
    console.error("text_content fetch error:", e);
    const message = e instanceof Error ? e.message : "未知错误";
    error = { message };
  }

  const grouped = items.reduce<Record<string, typeof items>>(
    (acc, item) => {
      const page = item.page ?? "unknown";
      if (!acc[page]) acc[page] = [];
      acc[page].push(item);
      return acc;
    },
    {}
  );

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Content management
      </p>
      <h2 className="mt-2 text-2xl font-semibold">全局文字管理</h2>
      <p className="mt-1.5 text-xs text-white/48">
        管理前台所有可动态修改的文字内容。修改后前台自动生效。
      </p>

      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs text-white/40">常用 key 参考：</p>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/55">
          hero.title.desktop、hero.title.mobile、home.hero.ticker、works.composite.kicker、
          works.composite.title、works.composite.description、works.cta.resume、
          works.cta.hiring、works.cta.commercial、cta.works、cta.resume、cta.hiring、
          contact.invitation、resume.contact.marquee、footer.copyright
        </p>
        <p className="mt-2 text-[10px] text-white/35">
          滚动字幕类 key（如 home.hero.ticker、resume.contact.marquee）：每行一条内容；使用「·」或「•」作为分隔圆点；以「stroke:」开头的文字显示为描边空心效果。
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-xs text-red-200">
          数据库读取失败：{error.message}。请确认已执行数据库迁移 SQL。
        </p>
      )}

      <CreateForm />

      {Object.keys(grouped).length === 0 && !error ? (
        <p className="mt-5 text-xs text-white/40">
          暂无文字记录。使用上方表单添加，或确认数据库迁移 SQL 已执行。
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {Object.entries(grouped).map(([page, items]) => (
            <section key={page}>
              <h3 className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                {page}
              </h3>
              <div className="mt-2 overflow-x-auto rounded-md border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="px-4 py-2">Key</th>
                      <th className="px-4 py-2">内容</th>
                      <th className="px-4 py-2">Section</th>
                      <th className="px-4 py-2">字号</th>
                      <th className="px-4 py-2">字体</th>
                      <th className="px-4 py-2">字重</th>
                      <th className="px-4 py-2">颜色</th>
                      <th className="px-4 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <EditTextContentRow key={item.id} item={item} toast={toast} savedId={id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm() {
  const fontSizes = [
    "",
    "text-xs",
    "text-sm",
    "text-base",
    "text-lg",
    "text-xl",
    "text-2xl",
    "text-3xl",
    "text-4xl",
  ];
  const fontFamilies = [
    "",
    "font-sans",
    "font-serif",
    "font-mono",
    "font-Inter",
  ];

  return (
    <form
      action={createTextContent}
      className="mt-5 grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <input
        name="key"
        placeholder="key（如 hero.title）*"
        required
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <input
        name="content"
        placeholder="内容 *"
        required
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <input
        name="page"
        placeholder="page（如 home/works）*"
        required
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <input
        name="section"
        placeholder="section（如 hero/footer）"
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <select
        name="font_size"
        defaultValue=""
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      >
        <option value="">字号（默认）</option>
        {fontSizes.filter(Boolean).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        name="font_family"
        defaultValue=""
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      >
        <option value="">字体（默认）</option>
        {fontFamilies.filter(Boolean).map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <input
        name="font_weight"
        placeholder="字重（如 400/700）"
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <input
        name="color"
        placeholder="颜色（如 #ffffff）"
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
      <div className="md:col-span-2 lg:col-span-4">
        <SaveButton className="w-full" size="sm">添加文字记录</SaveButton>
      </div>
    </form>
  );
}
