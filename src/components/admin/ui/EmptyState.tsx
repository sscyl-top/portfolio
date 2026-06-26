import { Inbox, Music, Image as ImageIcon, FolderOpen, MessageSquare, BarChart3 } from "lucide-react";

type EmptyStateProps = {
  icon?: React.ReactNode;
  iconVariant?: "inbox" | "music" | "image" | "folder" | "message" | "chart";
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

const iconMap = {
  inbox: Inbox,
  music: Music,
  image: ImageIcon,
  folder: FolderOpen,
  message: MessageSquare,
  chart: BarChart3,
};

export function EmptyState({
  icon,
  iconVariant = "inbox",
  title = "暂无内容",
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const IconComponent = iconMap[iconVariant];
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center ${className}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-white/25">
        {icon ?? <IconComponent className="h-5 w-5" />}
      </div>
      <p className="mt-3 text-sm font-medium text-white/45">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/28">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
