'use client'

import { useState, useTransition } from 'react'
import { getTextContent, createTextContent, updateTextContent, deleteTextContent } from './actions'
import { FontSizePicker } from '@/components/admin/FontSizePicker'
import { FontFamilyPicker } from '@/components/admin/FontFamilyPicker'

type TextContentItem = {
  id: string
  key: string
  content: string
  font_size?: string | null
  font_family?: string | null
  font_weight?: string | null
  color?: string | null
  page: string
  section?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type PageProps = {
  searchParams: { page?: string; section?: string }
}

export default async function TextContentPage({ searchParams }: PageProps) {
  const { data: textItems, error } = await getTextContent(
    searchParams.page,
    searchParams.section
  )

  const pages = ['global', 'home', 'works', 'resume', 'contact']
  const sections = ['navigation', 'hero', 'footer', 'header', 'content']

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
            Content Management
          </p>
          <h2 className="mt-3 text-3xl font-semibold">全局文字管理</h2>
          <p className="mt-3 text-sm text-white/48">
            管理前台所有页面的文字内容、字号、字体。支持增删改查和实时预览。
          </p>
        </div>

        <button
          onClick={() => (document.getElementById('add-modal') as HTMLDialogElement | null)?.showModal()}
          className="min-h-10 rounded-md bg-cyan px-6 text-sm font-medium text-black transition hover:bg-white"
        >
          + 添加文字
        </button>
      </div>

      {/* 过滤器 */}
      <div className="mb-6 flex gap-4">
        <select
          onChange={(e) => window.location.href = `/admin/settings/text-content?page=${e.target.value}`}
          className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
          defaultValue={searchParams.page || ''}
        >
          <option value="">所有页面</option>
          {pages.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          onChange={(e) => window.location.href = `/admin/settings/text-content?page=${searchParams.page || ''}&section=${e.target.value}`}
          className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
          defaultValue={searchParams.section || ''}
        >
          <option value="">所有区域</option>
          {sections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          错误: {error}
        </div>
      )}

      {/* 文字列表 */}
      <div className="space-y-4">
        {textItems && textItems.length > 0 ? (
          textItems.map((item) => (
            <TextContentCard key={item.id} item={item} />
          ))
        ) : (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-white/48">
            暂无文字内容。点击"添加文字"创建第一条记录。
          </div>
        )}
      </div>

      {/* 添加文字模态框 */}
      <AddTextModal pages={pages} sections={sections} />
    </div>
  )
}

function TextContentCard({ item }: { item: TextContentItem }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('确定要删除这条文字内容吗？')) return

    const formData = new FormData()
    formData.append('id', item.id)

    startTransition(async () => {
      const result = await deleteTextContent(formData)
      if (!result.success) {
        alert(`删除失败: ${result.error}`)
      }
    })
  }

  const handleToggleActive = () => {
    const formData = new FormData()
    formData.append('id', item.id)
    formData.append('is_active', (!item.is_active).toString())

    startTransition(async () => {
      const result = await updateTextContent(formData)
      if (!result.success) {
        alert(`操作失败: ${result.error}`)
      }
    })
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-xs text-cyan">{item.key}</span>
            <span className={`rounded px-2 py-0.5 text-[10px] ${item.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {item.is_active ? '激活' : '未激活'}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              {item.page} / {item.section || '未分类'}
            </span>
          </div>

          <p className="mb-3 text-sm text-white/90">{item.content}</p>

          <div className="flex flex-wrap gap-4 text-xs text-white/40">
            {item.font_size && <span>字号: {item.font_size}</span>}
            {item.font_family && <span>字体: {item.font_family}</span>}
            {item.font_weight && <span>字重: {item.font_weight}</span>}
            {item.color && <span>颜色: {item.color}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
          >
            {isEditing ? '取消' : '编辑'}
          </button>
          <button
            onClick={handleToggleActive}
            className={`rounded-md border px-3 py-1.5 text-xs transition ${
              item.is_active
                ? 'border-yellow-500/20 text-yellow-300 hover:border-yellow-500/40'
                : 'border-green-500/20 text-green-300 hover:border-green-500/40'
            }`}
          >
            {item.is_active ? '禁用' : '激活'}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs text-red-300 transition hover:border-red-500/40"
          >
            删除
          </button>
        </div>
      </div>

      {isEditing && (
        <EditTextForm item={item} onCancel={() => setIsEditing(false)} />
      )}
    </div>
  )
}

function EditTextForm({ item, onCancel }: { item: TextContentItem; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    formData.append('id', item.id)

    startTransition(async () => {
      const result = await updateTextContent(formData)
      if (result.success) {
        onCancel()
      } else {
        alert(`更新失败: ${result.error}`)
      }
    })
  }

  return (
    <form action={handleSubmit} className="mt-4 border-t border-white/10 pt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/60">Key (唯一标识)</label>
          <input
            name="key"
            defaultValue={item.key}
            required
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">页面</label>
          <select
            name="page"
            defaultValue={item.page}
            required
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="global">global</option>
            <option value="home">home</option>
            <option value="works">works</option>
            <option value="resume">resume</option>
            <option value="contact">contact</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-white/60">内容</label>
          <textarea
            name="content"
            defaultValue={item.content}
            required
            rows={3}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">字号</label>
          <FontSizePicker name="font_size" defaultValue={item.font_size || ''} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">字体</label>
          <FontFamilyPicker name="font_family" defaultValue={item.font_family || ''} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">字重</label>
          <select
            name="font_weight"
            defaultValue={item.font_weight || ''}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="">默认</option>
            <option value="font-light">Light (300)</option>
            <option value="font-normal">Normal (400)</option>
            <option value="font-medium">Medium (500)</option>
            <option value="font-semibold">Semibold (600)</option>
            <option value="font-bold">Bold (700)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">颜色</label>
          <input
            name="color"
            type="text"
            defaultValue={item.color || ''}
            placeholder="text-white 或 #FFFFFF"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">区域</label>
          <input
            name="section"
            type="text"
            defaultValue={item.section || ''}
            placeholder="navigation, hero, footer..."
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">排序</label>
          <input
            name="sort_order"
            type="number"
            defaultValue={item.sort_order}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
      <button
        onClick={() => {
          const dialog = document.getElementById('add-modal') as HTMLDialogElement | null
          dialog?.close()
        }}
        className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/20"
      >
        取消
      </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}

function AddTextModal({ pages, sections }: { pages: string[]; sections: string[] }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createTextContent(formData)
      if (result.success) {
        ;(document.getElementById('add-modal') as HTMLDialogElement)?.close()
        window.location.reload()
      } else {
        alert(`创建失败: ${result.error}`)
      }
    })
  }

  return (
    <dialog id="add-modal" className="rounded-lg border border-white/10 bg-[#1a1a1a] p-0 text-white backdrop:bg-black/80">
      <div className="w-full max-w-2xl p-6">
        <h3 className="mb-6 text-xl font-semibold">添加新文字</h3>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/60">Key (唯一标识) *</label>
              <input
                name="key"
                type="text"
                required
                placeholder="如: home.hero.title"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">页面 *</label>
              <select
                name="page"
                required
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {pages.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-white/60">内容 *</label>
              <textarea
                name="content"
                required
                rows={3}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">字号</label>
              <FontSizePicker name="font_size" />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">字体</label>
              <FontFamilyPicker name="font_family" />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">字重</label>
              <select
                name="font_weight"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="">默认</option>
                <option value="font-light">Light (300)</option>
                <option value="font-normal">Normal (400)</option>
                <option value="font-medium">Medium (500)</option>
                <option value="font-semibold">Semibold (600)</option>
                <option value="font-bold">Bold (700)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">颜色</label>
              <input
                name="color"
                type="text"
                placeholder="text-white 或 #FFFFFF"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">区域</label>
              <input
                name="section"
                type="text"
                placeholder="navigation, hero, footer..."
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">排序</label>
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => (document.getElementById('add-modal') as HTMLDialogElement | null)?.close()}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/20"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
            >
              {isPending ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
