import { useQuery } from '@tanstack/react-query'
import { FiBookOpen, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { EmptyState, PageHeader, Skeleton } from '../components/ui'
import { api } from '../lib/api'
import { daysLeft, formatDate, formatDuration } from '../lib/format'
import type { Playlist } from '../lib/types'

const deadlineChip = (p: Playlist) => {
  const left = daysLeft(p.deadline)
  if (p.status === 'completed') return { text: 'Completed', cls: 'bg-emerald-50 text-emerald-600' }
  if (left < 0) return { text: 'Overdue', cls: 'bg-red-50 text-red-600' }
  if (left <= 7) return { text: `${left}d left`, cls: 'bg-amber-50 text-amber-700' }
  return { text: formatDate(p.deadline), cls: 'bg-slate-100 text-slate-600' }
}

export default function Playlists() {
  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<{ playlists: Playlist[] }>('/playlists')).data.playlists,
  })

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Playlists"
        actions={
          <Link to="/playlists/new" className="btn-primary">
            <FiPlus className="size-4" />
            <span className="hidden sm:inline">Add playlist</span>
            <span className="sm:hidden">Add</span>
          </Link>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}

      {data?.length === 0 && (
        <EmptyState icon={FiBookOpen} title="No playlists yet" text="Paste a YouTube playlist link to build your first plan." />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((p) => {
          const chip = deadlineChip(p)
          return (
            <Link
              key={p._id}
              to={`/playlists/${p._id}`}
              className="card group overflow-hidden !p-0 transition hover:-translate-y-0.5 hover:shadow-md sm:!p-0"
            >
              <div className="relative aspect-video bg-slate-100">
                {p.thumbnail && <img src={p.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${chip.cls}`}>
                  {chip.text}
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-indigo-600">{p.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{p.channel}</p>
                </div>
                <ProgressBar percent={p.completedPercent} tone={p.status === 'completed' ? 'emerald' : 'indigo'} />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {p.completedCount}/{p.videoCount} videos · {formatDuration(p.totalDurationSec)}
                  </span>
                  <span className="font-medium text-slate-700">{p.completedPercent}%</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
