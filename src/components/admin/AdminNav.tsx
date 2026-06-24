import {
  BarChart3,
  FolderKanban,
  Home,
  Images,
  Layers3,
  Mail,
  Music,
  Settings,
  Tags,
  Type,
} from "lucide-react";
import Link from "next/link";

export const adminNavigation = [
  { label: "控制台", href: "/admin", icon: Home },
  { label: "数据分析", href: "/admin/analytics", icon: BarChart3 },
  { label: "作品", href: "/admin/works", icon: FolderKanban },
  { label: "分类与标签", href: "/admin/categories", icon: Tags },
  { label: "媒体库", href: "/admin/media", icon: Images },
  { label: "音乐播放器", href: "/admin/music", icon: Music },
  { label: "简历", href: "/admin/resume", icon: Layers3 },
  { label: "页面", href: "/admin/pages", icon: Layers3 },
  { label: "联系消息", href: "/admin/messages", icon: Mail },
  { label: "全局文字", href: "/admin/settings/text-content", icon: Type },
  { label: "网站设置", href: "/admin/settings", icon: Settings },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="后台导航" className="grid gap-1">
      {adminNavigation.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-white/62 outline-none transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
