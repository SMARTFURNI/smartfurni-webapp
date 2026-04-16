export default function PageLoading() {
  return (
    <div className="flex-1 p-6 space-y-4 animate-pulse" style={{ background: "#0D0D0F" }}>
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-lg bg-white/10" />
        <div className="h-9 w-32 rounded-lg bg-white/10" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 h-24" />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 h-96" />
    </div>
  );
}
