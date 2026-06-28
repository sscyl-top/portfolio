import { WorksPageShell } from "@/components/works/WorksPageShell";
import { WorksListSkeleton } from "@/components/ui/Skeleton";

export default function WorksLoading() {
  return (
    <WorksPageShell>
      {/* 分类导航骨架 */}
      <div className="mb-10 flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-20 animate-pulse rounded-full bg-surface-2"
          />
        ))}
      </div>
      <WorksListSkeleton />
    </WorksPageShell>
  );
}
