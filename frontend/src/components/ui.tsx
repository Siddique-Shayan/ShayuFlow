import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

type Tone = 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'

const TONES: Record<Tone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-red-50 text-red-500',
  slate: 'bg-slate-100 text-slate-500',
}

export function IconBadge({ icon: Icon, tone = 'indigo', className = '' }: { icon: IconType; tone?: Tone; className?: string }) {
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]} ${className}`}>
      <Icon className="size-[18px]" />
    </span>
  )
}

export function StatCard({ icon, tone, label, value }: { icon: IconType; tone?: Tone; label: string; value: ReactNode }) {
  return (
    <div className="card flex items-center gap-3 !p-3.5 sm:!p-4">
      <IconBadge icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-tight text-slate-900 sm:text-xl">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: IconType
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white ${
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
      }`}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
