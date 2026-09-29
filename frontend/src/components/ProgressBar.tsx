export function ProgressBar({ percent, tone = 'indigo' }: { percent: number; tone?: 'indigo' | 'emerald' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
