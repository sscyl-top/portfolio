export default function AdminSettingsLoading() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
