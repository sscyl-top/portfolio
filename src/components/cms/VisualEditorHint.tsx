'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MousePointer2, X } from 'lucide-react'

export function VisualEditorHint() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const isAdminRoute = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    if (!isAdminRoute) return
    fetch('/api/admin/check')
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => setIsAdmin(false))
  }, [isAdminRoute])

  if (!isAdminRoute || !isAdmin || dismissed) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-[9998] -translate-x-1/2 animate-pulse">
      <div className="flex items-center gap-2 rounded-full border border-cyan/30 bg-[#0d0d0d]/90 px-4 py-2 text-xs text-cyan shadow-lg backdrop-blur-md">
        <MousePointer2 className="h-3.5 w-3.5" />
        <span>双击任意文字可直接编辑内容和样式</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-1 rounded-full p-0.5 text-cyan/60 transition hover:bg-white/10 hover:text-cyan"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
