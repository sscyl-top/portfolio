import { AdminTableSkeleton } from "@/components/ui/Skeleton";

export default function AdminWorksLoading() {
  return (
    <div>
      {/* 页面标题骨架 */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.03]" />
      </div>

      {/* 操作栏骨架 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-10 w-56 animate-pulse rounded-lg bg-white/[0.05]" />
      </div>

      <AdminTableSkeleton rows={8} cols={5} />
    </div>
  );
}
