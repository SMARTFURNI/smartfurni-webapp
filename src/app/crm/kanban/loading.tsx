export default function KanbanLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse" style={{ background: "#0D0D0F" }}>
      <div className="h-7 w-40 rounded-lg bg-white/10 mb-4" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="min-w-[280px] rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="h-5 w-24 rounded bg-white/15" />
            {[1,2,3].map(j => (
              <div key={j} className="h-20 rounded-xl bg-white/8" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
