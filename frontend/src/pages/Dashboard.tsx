import { useQuery } from '@tanstack/react-query'
import { FiBookOpen, FiCheckCircle, FiClock, FiPlus, FiSun, FiZap } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { BacklogBanner } from '../components/BacklogBanner'
import { ProgressRing } from '../components/ProgressRing'
import { EmptyState, IconBadge, ListSkeleton, PageHeader } from '../components/ui'
import { VideoRow } from '../components/VideoRow'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import type { Playlist, Stats, Video } from '../lib/types'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<Stats>('/stats')).data,
  })
  const today = useQuery({
    queryKey: ['plan', 'today'],
    queryFn: async () => (await api.get<{ videos: Video[] }>('/plan/today')).data.videos,
  })
  const playlists = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => (await api.get<{ playlists: Playlist[] }>('/playlists')).data.playlists,
  })

  const titleOf = (id: string) => playlists.data?.find((p) => p._id === id)?.title
  const videos = today.data ?? []
  const todaySec = videos.reduce((s, v) => s + v.durationSec, 0)
  const hasPlaylists = (playlists.data?.length ?? 0) > 0
  const s = stats.data

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Here's your plan for today." />

      <BacklogBanner />

      <section className="card flex items-center gap-5 sm:gap-8">
        <ProgressRing percent={s?.overallPercent ?? 0} />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium text-slate-500">Overall progress</p>
          {[
            { icon: FiZap, tone: 'amber', label: 'Day streak', value: s?.streak ?? 0 },
            { icon: FiCheckCircle, tone: 'emerald', label: 'Videos done', value: `${s?.videosCompleted ?? 0} / ${s?.videosTotal ?? 0}` },
            { icon: FiClock, tone: 'indigo', label: 'Hours watched', value: s?.hoursWatched ?? 0 },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <IconBadge icon={row.icon} tone={row.tone as 'amber' | 'emerald' | 'indigo'} className="!size-8" />
              <span className="flex-1 truncate text-sm text-slate-500">{row.label}</span>
              <span className="text-sm font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Today's videos</h2>
          {videos.length > 0 && (
            <span className="text-xs text-slate-500">
              {videos.length} · {formatDuration(todaySec)}
            </span>
          )}
        </div>

        {today.isLoading ? (
          <ListSkeleton />
        ) : videos.length > 0 ? (
          <ul className="-mx-2 divide-y divide-slate-100">
            {videos.map((v) => (
              <VideoRow key={v._id} video={v} meta={titleOf(v.playlistId)} />
            ))}
          </ul>
        ) : hasPlaylists ? (
          <div className="flex flex-col items-center py-8 text-center">
            <IconBadge icon={FiSun} tone="amber" className="!size-11" />
            <p className="mt-3 text-sm font-medium text-slate-900">Nothing scheduled today</p>
            <p className="text-sm text-slate-500">Enjoy the break.</p>
          </div>
        ) : (
          <EmptyState
            icon={FiBookOpen}
            title="No playlists yet"
            text="Add a playlist to get your learning plan."
            action={
              <Link to="/playlists/new" className="btn-primary">
                <FiPlus className="size-4" /> Add playlist
              </Link>
            }
          />
        )}
      </section>
    </div>
  )
}
