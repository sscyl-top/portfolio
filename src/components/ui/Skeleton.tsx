/** 轻量 className 拼接 */
function cx(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** 基础脉冲骨架块 */
export function SkeletonPulse({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse rounded-lg bg-white/[0.05]", className)}
    />
  );
}

/** 骨架文字行 */
export function SkeletonLine({
  width = "100%",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse rounded bg-white/[0.05] h-4", className)}
      style={{ width }}
    />
  );
}

/** 骨架卡片 */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "rounded-lg border border-white/10 bg-white/[0.03] p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 作品列表骨架 — 模拟 4 列卡片网格 */
export function WorksListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i}>
          <SkeletonPulse className="aspect-[4/3] w-full rounded-md" />
          <div className="mt-4 space-y-2.5">
            <SkeletonLine width="72%" className="h-5" />
            <SkeletonLine width="48%" />
            <SkeletonLine width="60%" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/** 作品详情页骨架 */
export function WorkDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* 返回链接 */}
      <SkeletonLine width="140px" className="h-5" />

      {/* Header */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SkeletonLine width="40%" className="h-3.5" />
          <SkeletonLine width="85%" className="h-14" />
          <SkeletonLine width="65%" className="h-14" />
        </div>
        <div className="space-y-3">
          <SkeletonLine width="100%" className="h-4" />
          <SkeletonLine width="100%" className="h-4" />
          <SkeletonLine width="70%" className="h-4" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonPulse key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* 封面图 */}
      <SkeletonPulse className="mt-14 h-[520px] w-full rounded-[28px]" />

      {/* 内容区块 */}
      <div className="mt-16 grid gap-6">
        <SkeletonCard>
          <SkeletonLine width="30%" className="mb-4 h-6" />
          <SkeletonLine width="100%" className="h-4" />
          <SkeletonLine width="100%" className="mt-2.5 h-4" />
          <SkeletonLine width="55%" className="mt-2.5 h-4" />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonPulse className="aspect-video w-full rounded-md" />
          <SkeletonLine width="45%" className="mt-4 h-3.5" />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonLine width="25%" className="mb-4 h-6" />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonPulse className="h-80 w-full rounded-md" />
            <SkeletonPulse className="h-80 w-full rounded-md" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

/** Admin 表格骨架 */
export function AdminTableSkeleton({
  rows = 6,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-3">
      {/* 表头 */}
      <div className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={`${80 / cols}%`}
            className="h-4"
          />
        ))}
      </div>
      {/* 行 */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-5 py-4"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              aria-hidden="true"
              className="animate-pulse rounded bg-white/[0.05] h-4"
              style={{ width: `${Math.random() * 30 + 45}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 媒体库骨架 */
export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className="aspect-square w-full rounded-lg"
        />
      ))}
    </div>
  );
}
