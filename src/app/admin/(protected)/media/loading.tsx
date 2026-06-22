import { MediaGridSkeleton } from "@/components/ui/Skeleton";

export default function AdminMediaLoading() {
  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/[0.03]" />
      </div>

      {/* 搜索/操作栏骨架 */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-white/[0.05]" />
      </div>

      <MediaGridSkeleton />
    </div>
  );
}
