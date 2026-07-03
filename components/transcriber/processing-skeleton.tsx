export function ProcessingSkeleton() {
  return (
    <div className="snow-panel space-y-4 p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/20" />
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-64 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}