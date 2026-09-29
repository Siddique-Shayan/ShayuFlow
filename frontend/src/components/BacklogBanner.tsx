import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { FiAlertTriangle, FiCalendar, FiLayers, FiTrendingUp } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import { useRefreshAll } from '../lib/queries'
import type { BacklogStrategy, Video } from '../lib/types'
import { IconBadge } from './ui'

const OPTIONS: { strategy: BacklogStrategy; icon: IconType; title: string; hint: string }[] = [
  { strategy: 'spread', icon: FiLayers, title: 'Spread it out', hint: 'Share it over the days left' },
  { strategy: 'increase', icon: FiTrendingUp, title: 'Study more', hint: 'Raise your daily minutes' },
  { strategy: 'extend', icon: FiCalendar, title: 'Extend deadline', hint: 'Push the end date out' },
]

export function BacklogBanner() {
  const { user } = useAuth()
  const refresh = useRefreshAll()

  const { data } = useQuery({
    queryKey: ['backlog'],
    queryFn: async () =>
      (await api.get<{ count: number; totalSec: number; videos: Video[] }>('/plan/backlog')).data,
  })

  const recalc = useMutation({
    mutationFn: (strategy: BacklogStrategy) => api.post('/plan/recalculate', { strategy }),
    onSuccess: async () => {
      await refresh()
      toast.success('Plan updated')
    },
  })

  // If the user chose a default in Settings, apply it automatically (once per visit).
  const autoApplied = useRef(false)
  const preference = user?.backlogPreference
  useEffect(() => {
    if (data && data.count > 0 && preference && preference !== 'ask' && !autoApplied.current) {
      autoApplied.current = true
      recalc.mutate(preference)
    }
  }, [data, preference, recalc])

  if (!data || data.count === 0) return null
  const auto = preference && preference !== 'ask'

  return (
    <div className="animate-fade-up rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconBadge icon={FiAlertTriangle} tone="amber" className="!bg-amber-200/60 dark:!bg-amber-200/20" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-amber-900">
            {data.count} video{data.count === 1 ? '' : 's'} behind schedule
          </h3>
          <p className="mt-0.5 text-sm text-amber-800/80">
            {formatDuration(data.totalSec)} to catch up. {auto ? 'Re-planning with your saved preference…' : 'How should we fix your plan?'}
          </p>
        </div>
      </div>
      {!auto && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => (
            <button
              key={o.strategy}
              disabled={recalc.isPending}
              onClick={() => recalc.mutate(o.strategy)}
              className="flex items-center gap-3 rounded-xl border border-amber-200 px-3.5 py-3 text-left transition hover:border-amber-400 hover:shadow-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <o.icon className="size-[18px] shrink-0 text-amber-600" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">{o.title}</span>
                <span className="block truncate text-xs text-slate-500">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
