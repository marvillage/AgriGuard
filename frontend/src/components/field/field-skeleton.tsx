export function FieldSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="h-4 w-32 animate-pulse rounded-md bg-slate-200/70" />
      <div className="space-y-3">
        <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-slate-200/70" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-6 w-24 animate-pulse rounded-full bg-slate-200/60" />
          ))}
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden border-b border-slate-200/80 pb-3">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="h-6 w-20 shrink-0 animate-pulse rounded-md bg-slate-200/60" />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl bg-slate-200/50" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}
