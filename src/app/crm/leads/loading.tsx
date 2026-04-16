export default function LeadsLoading() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse" style={{ background: "#0D0D0F" }}>
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-lg bg-white/10" />
        <div className="h-9 w-32 rounded-lg bg-white/10" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded-lg bg-white/8" />
        <div className="h-10 w-32 rounded-lg bg-white/8" />
        <div className="h-10 w-32 rounded-lg bg-white/8" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="h-12 bg-white/8 border-b border-white/10" />
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="h-14 border-b border-white/5 flex items-center px-4 gap-4">
            <div className="h-8 w-8 rounded-full bg-white/10" />
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/8 ml-auto" />
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
