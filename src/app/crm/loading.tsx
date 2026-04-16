// Loading skeleton cho Dashboard CRM — hiển thị ngay lập tức khi navigate
// Next.js App Router tự động dùng file này trong Suspense boundary
export default function CrmDashboardLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse" style={{ background: "#0D0D0F" }}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-lg bg-white/10" />
          <div className="h-4 w-48 rounded-md bg-white/6" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-white/10" />
          <div className="h-9 w-24 rounded-lg bg-white/10" />
          <div className="h-9 w-24 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Focus hôm nay skeleton */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-white/20" />
          <div className="h-4 w-32 rounded bg-white/15" />
          <div className="h-5 w-20 rounded-full bg-white/10" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-14 rounded-xl bg-white/8 border border-white/8" />
          ))}
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-8 w-8 rounded-full bg-white/15" />
              <div className="h-4 w-16 rounded bg-white/10" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-white/20" />
            <div className="h-3 w-28 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Plan report skeleton */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-5 w-48 rounded-lg bg-white/15" />
            <div className="h-3 w-36 rounded bg-white/10" />
          </div>
          <div className="h-8 w-20 rounded-lg bg-white/10" />
        </div>
        <div className="grid grid-cols-5 gap-4 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-10 w-full rounded-xl bg-white/10" />
              <div className="h-3 w-3/4 rounded bg-white/8" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-64" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-64" />
      </div>
    </div>
  );
}
