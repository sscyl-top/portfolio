import { SkeletonPulse, SkeletonLine, SkeletonCard } from "@/components/ui/Skeleton";

export default function AdminWorkDetailLoading() {
  return (
    <div>
      {/* 顶部导航骨架 */}
      <div className="mb-8 flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-6 w-48 animate-pulse rounded bg-white/[0.05]" />
      </div>

      {/* 标题区域 */}
      <div className="mb-8 space-y-3">
        <SkeletonLine width="50%" className="h-8" />
        <SkeletonLine width="35%" className="h-4" />
      </div>

      {/* 表单区域骨架 */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* 主表单 */}
        <div className="space-y-5">
          <SkeletonCard>
            <SkeletonLine width="20%" className="mb-5 h-4" />
            <SkeletonPulse className="h-10 w-full rounded-md" />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonLine width="20%" className="mb-5 h-4" />
            <SkeletonPulse className="h-32 w-full rounded-md" />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonLine width="25%" className="mb-5 h-4" />
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonPulse className="h-10 w-full rounded-md" />
              <SkeletonPulse className="h-10 w-full rounded-md" />
            </div>
          </SkeletonCard>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-5">
          <SkeletonCard>
            <SkeletonLine width="35%" className="mb-5 h-4" />
            <SkeletonPulse className="aspect-[4/3] w-full rounded-md" />
            <div className="mt-3 space-y-2">
              <SkeletonLine width="80%" />
              <SkeletonLine width="55%" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonLine width="40%" className="mb-5 h-4" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-16 animate-pulse rounded-full bg-white/[0.05]"
                />
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>

      {/* 区块列表骨架 */}
      <div className="mt-10">
        <SkeletonLine width="30%" className="mb-5 h-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i}>
              <div className="flex items-center gap-4">
                <div className="h-5 w-5 animate-pulse rounded bg-white/[0.08]" />
                <SkeletonLine width="40%" className="h-4" />
                <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-white/[0.05]" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
