import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteWork, updateWork } from "../actions";

type WorkEditorRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  year: string;
  client: string;
  status: "draft" | "published" | "private";
  palette: string[];
  is_representative: boolean;
  representative_order: number | null;
  is_composite: boolean;
  composite_order: number | null;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  updated_at: string;
};

type WorkBlockRow = {
  id: string;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  payload: Record<string, unknown>;
};

export default async function AdminWorkEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: work }, { data: blocks }] = await Promise.all([
    supabase
      .from("works")
      .select(
        "id,slug,title,subtitle,summary,year,client,status,palette,is_representative,representative_order,is_composite,composite_order,sort_order,seo_title,seo_description,updated_at",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("work_blocks")
      .select("id,block_type,sort_order,is_visible,payload")
      .eq("work_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!work) notFound();

  return (
    <div>
      <Link
        href="/admin/works"
        className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回作品列表
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Work editor
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {(work as WorkEditorRow).title}
          </h2>
          <p className="mt-3 font-mono text-xs text-white/38">
            {(work as WorkEditorRow).slug}
          </p>
        </div>
        <form action={deleteWork}>
          <input type="hidden" name="id" value={(work as WorkEditorRow).id} />
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-300/20 px-4 text-sm text-red-200 transition hover:bg-red-300/10">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            删除
          </button>
        </form>
      </div>

      <WorkForm work={work as WorkEditorRow} />
      <BlockPreview blocks={(blocks ?? []) as WorkBlockRow[]} />
    </div>
  );
}

function WorkForm({ work }: { work: WorkEditorRow }) {
  return (
    <form
      action={updateWork}
      className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
    >
      <input type="hidden" name="id" value={work.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="标题" name="title" defaultValue={work.title} required />
        <Field label="Slug" name="slug" defaultValue={work.slug} required />
        <Field label="副标题" name="subtitle" defaultValue={work.subtitle} />
        <Field label="年份" name="year" defaultValue={work.year} />
        <Field label="客户" name="client" defaultValue={work.client} />
        <Field
          label="排序"
          name="sort_order"
          type="number"
          defaultValue={String(work.sort_order)}
        />
      </div>

      <label className="grid gap-2 text-sm">
        <span className="text-white/58">摘要</span>
        <textarea
          name="summary"
          defaultValue={work.summary}
          rows={4}
          className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="text-white/58">状态</span>
          <select
            name="status"
            defaultValue={work.status}
            className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="private">私密</option>
          </select>
        </label>
        <CheckField
          label="代表作"
          name="is_representative"
          defaultChecked={work.is_representative}
        />
        <Field
          label="代表作排序"
          name="representative_order"
          type="number"
          defaultValue={work.representative_order?.toString() ?? ""}
        />
        <CheckField
          label="复合设计"
          name="is_composite"
          defaultChecked={work.is_composite}
        />
        <Field
          label="复合设计排序"
          name="composite_order"
          type="number"
          defaultValue={work.composite_order?.toString() ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="SEO 标题" name="seo_title" defaultValue={work.seo_title} />
        <Field
          label="SEO 描述"
          name="seo_description"
          defaultValue={work.seo_description}
        />
      </div>

      <div className="flex justify-end">
        <button className="min-h-10 rounded-md bg-cyan px-5 text-sm font-medium text-black transition hover:bg-white">
          保存
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}

function CheckField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/68">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-cyan"
      />
      {label}
    </label>
  );
}

function BlockPreview({ blocks }: { blocks: WorkBlockRow[] }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-white/80">内容块</h3>
      <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
        {blocks.length === 0 ? (
          <p className="py-8 text-sm text-white/38">
            暂无内容块。下一步会接入文本、媒体和图库块编辑。
          </p>
        ) : (
          blocks.map((block) => (
            <div
              key={block.id}
              className="grid gap-3 py-3 text-sm md:grid-cols-[3rem_9rem_1fr_auto]"
            >
              <span className="font-mono text-white/34">{block.sort_order}</span>
              <span className="text-white/62">{block.block_type}</span>
              <code className="break-all text-xs text-white/42">
                {JSON.stringify(block.payload)}
              </code>
              <span className="text-white/48">
                {block.is_visible ? "可见" : "隐藏"}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
