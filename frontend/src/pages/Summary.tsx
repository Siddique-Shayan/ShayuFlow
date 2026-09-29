import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FiAward, FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock, FiZap } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { PageHeader, Skeleton, StatCard } from '../components/ui'
import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import type { WeeklySummary } from '../lib/types'

const STATUS = {
  ahead: { label: 'Ahead of plan', cls: 'bg-emerald-50 text-emerald-600' },
  on_track: { label: 'On track', cls: 'bg-indigo-50 text-indigo-700' },
  behind: { label: 'Behind', cls: 'bg-amber-50 text-amber-700' },
} as const

const dayLabel = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })

export default function Summary() {
  const [offset, setOffset] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['summary', offset],
    queryFn: async () => (await api.get<WeeklySummary>('/summary/weekly', { params: { offset } })).data,
  })

  const nav = (
    <div className="flex gap-1.5">
      <button className="btn-outline !p-2.5" aria-label="Previous week" disabled={offset <= -52} onClick={() => setOffset(offset - 1)}>
        <FiChevronLeft className="size-4" />
      </button>
      <button className="btn-outline !p-2.5" aria-label="Next week" disabled={offset === 0} onClick={() => setOffset(offset + 1)}>
        <FiChevronRight className="size-4" />
      </button>
    </div>
  )

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="This week" actions={nav} />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    )
  }

  const chartMax = Math.max(60, ...data.days.map((d) => Math.max(d.goalMinutes, d.studiedMinutes)))
  const status = data.status ? STATUS[data.status] : null
  const goalPercent = data.goalMinutes > 0 ? Math.round((data.studiedMinutes / data.goalMinutes) * 100) : 0
  const title = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : 'Past week'

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title={title}
        subtitle={`${dayLabel(data.weekStart, { day: 'numeric', month: 'short' })} – ${dayLabel(data.weekEnd, { day: 'numeric', month: 'short' })}`}
        actions={nav}
      />

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {status && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>{status.label}</span>}
          <span className="text-sm text-slate-500">{goalPercent}% of weekly goal</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{data.suggestion}</p>
        {data.backlogCount > 0 && offset === 0 && (
          <Link to="/today" className="btn-outline btn-sm">
            Catch up
          </Link>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={FiClock} tone="indigo" label="Time studied" value={formatDuration(data.studiedMinutes * 60)} />
        <StatCard icon={FiCheckCircle} tone="emerald" label="Videos done" value={data.videosCompleted} />
        <StatCard icon={FiZap} tone="amber" label="Day streak" value={data.streak} />
        <StatCard icon={FiAward} tone="rose" label="Best day" value={data.bestDay ? dayLabel(data.bestDay, { weekday: 'short' }) : '-'} />
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Study time</h2>
          <span className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-indigo-500" /> Studied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-3 border-t-2 border-dashed border-slate-300" /> Goal
            </span>
          </span>
        </div>
        <div className="flex h-44 items-end gap-2 sm:gap-4">
          {data.days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full flex-1 items-end justify-center">
                {d.goalMinutes > 0 && (
                  <div
                    className="absolute inset-x-0 border-t-2 border-dashed border-slate-300"
                    style={{ bottom: `${(d.goalMinutes / chartMax) * 100}%` }}
                  />
                )}
                <div
                  className="w-full max-w-9 rounded-t-md bg-indigo-500 transition-all duration-700"
                  style={{ height: `${(d.studiedMinutes / chartMax) * 100}%` }}
                  title={`${d.studiedMinutes} min`}
                />
              </div>
              <span className="text-xs text-slate-500">{dayLabel(d.date, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>

      {data.atRisk.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-amber-900">Deadlines at risk</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
            {data.atRisk.map((a) => (
              <li key={a.playlistId}>
                <Link to={`/playlists/${a.playlistId}`} className="font-medium underline-offset-2 hover:underline">
                  {a.title}
                </Link>
                {a.requiredMinutesPerDay ? ` needs ~${a.requiredMinutesPerDay} min/day` : ' can no longer finish in time'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
