export default function TasksLoading() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse" style={{ background: "#0D0D0F" }}>
      <div className="h-7 w-40 rounded-lg bg-white/10" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="h-5 w-24 rounded bg-white/15" />
            {[1,2,3].map(j => (
              <div key={j} className="h-16 rounded-xl bg-white/8" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
