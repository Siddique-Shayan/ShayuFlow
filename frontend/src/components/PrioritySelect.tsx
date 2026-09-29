export function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (priority: number) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 p-0.5" role="radiogroup" aria-label="Priority">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`Priority ${n}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`size-8 rounded-[10px] text-sm font-medium transition ${
            value === n ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
