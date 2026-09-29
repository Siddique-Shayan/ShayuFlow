import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { ListSkeleton, PageHeader } from '../components/ui'
import { VideoRow } from '../components/VideoRow'
import { api } from '../lib/api'
import { dayKey, formatDuration } from '../lib/format'
import type { Playlist, Video } from '../lib/types'

const WEEK = 7
const DAY_MS = 86_400_000

const label = (d: Date, options: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })

export default function Plan() {
  const [offset, setOffset] = useState(0)
  const [now] = useState(() => Date.now())
  const start = new Date(now + offset * WEEK * DAY_MS)
  const from = dayKey(start)
  const to = dayKey(new Date(start.getTime() + (WEEK - 1) * DAY_MS))

  const plan = useQuery({
    queryKey: ['plan', from, to],
    queryFn: async () => (await api.get<{ videos: Video[] }>('/plan', { params: { from, to } })).data.videos,
  })
  const playlists = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<{ playlists: Playlist[] }>('/playlists')).data.playlists,
  })

  const days = Array.from({ length: WEEK }, (_, i) => new Date(start.getTime() + i * DAY_MS))
  const byDay = new Map<string, Video[]>()
  for (const v of plan.data ?? []) {
    const key = dayKey(v.scheduledDate!)
    byDay.set(key, [...(byDay.get(key) ?? []), v])
  }
  const todayKey = dayKey(new Date(now))

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Plan"
        subtitle={`${label(days[0], { day: 'numeric', month: 'short' })} – ${label(days[WEEK - 1], { day: 'numeric', month: 'short' })}`}
        actions={
          <div className="flex gap-1.5">
            <button className="btn-outline !p-2.5" aria-label="Previous week" disabled={offset === 0} onClick={() => setOffset(offset - 1)}>
              <FiChevronLeft className="size-4" />
            </button>
            <button className="btn-outline !p-2.5" aria-label="Next week" onClick={() => setOffset(offset + 1)}>
              <FiChevronRight className="size-4" />
            </button>
          </div>
        }
      />

      {plan.isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const key = dayKey(d)
            const vids = byDay.get(key) ?? []
            const isToday = key === todayKey
            const sec = vids.reduce((s, v) => s + v.durationSec, 0)

            if (vids.length === 0) {
              return (
                <div key={key} className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-500">
                    {label(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {isToday && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">Today</span>}
                  </span>
                  <span className="text-xs text-slate-400">Free</span>
                </div>
              )
            }
            return (
              <section key={key} className={`card ${isToday ? 'ring-2 ring-indigo-500/30' : ''}`}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {label(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {isToday && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Today</span>}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {vids.length} · {formatDuration(sec)}
                  </span>
                </div>
                <ul className="-mx-2 divide-y divide-slate-100">
                  {vids.map((v) => (
                    <VideoRow key={v._id} video={v} meta={playlists.data?.find((p) => p._id === v.playlistId)?.title} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
