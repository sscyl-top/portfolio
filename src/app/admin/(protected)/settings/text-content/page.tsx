import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-session";

import {
  createTextContent,
  deleteTextContent,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function TextContentPage() {
  await requireAdmin();

  let items: any[] = [];
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
    items = result.data ?? [];
  } catch (e: any) {
    console.error("text_content fetch error:", e);
    error = { message: e.message || "未知错误" };
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
      <h2 className="mt-3 text-3xl font-semibold">全局文字管理</h2>
      <p className="mt-3 text-sm text-white/48">
        管理前台所有可动态修改的文字内容。修改后前台自动生效。
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          数据库读取失败：{error.message}。请确认已执行数据库迁移 SQL。
        </p>
      )}

      <CreateForm />

      {Object.keys(grouped).length === 0 && !error ? (
        <p className="mt-8 text-sm text-white/40">
          暂无文字记录。使用上方表单添加，或确认数据库迁移 SQL 已执行。
        </p>
      ) : (
        <div className="mt-6 grid gap-8">
          {Object.entries(grouped).map(([page, items]) => (
            <section key={page}>
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                {page}
              </h3>
              <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="px-4 py-2">Key</th>
                      <th className="px-4 py-2">内容</th>
                      <th className="px-4 py-2">Section</th>
                      <th className="px-4 py-2">字号</th>
                      <th className="px-4 py-2">字体</th>
                      <th className="px-4 py-2">字重</th>
                      <th className="px-4 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-2 font-mono text-xs">
                          {item.key}
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-2">
                          {item.content}
                        </td>
                        <td className="px-4 py-2 text-white/50">
                          {item.section ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-white/50">
                          {item.font_size ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-white/50">
                          {item.font_family ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-white/50">
                          {item.font_weight ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          <form
                            action={deleteTextContent.bind(null, item.id)}
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  `确定删除「${item.key}」？此操作可软删除恢复。`
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              删除
                            </button>
                          </form>
                        </td>
                      </tr>
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
      className="mt-8 grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <input
        name="key"
        placeholder="key（如 hero.title）*"
        required
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <input
        name="content"
        placeholder="内容 *"
        required
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <input
        name="page"
        placeholder="page（如 home/works）*"
        required
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <input
        name="section"
        placeholder="section（如 hero/footer）"
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <select
        name="font_size"
        defaultValue=""
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
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
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
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
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <input
        name="color"
        placeholder="颜色（如 #ffffff）"
        className="min-h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
      <div className="md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="min-h-9 w-full rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white"
        >
          添加文字记录
        </button>
      </div>
    </form>
  );
}
