import { useMutation, useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { PrioritySelect } from '../components/PrioritySelect'
import { ProgressBar } from '../components/ProgressBar'
import { ListSkeleton, Skeleton } from '../components/ui'
import { VideoRow } from '../components/VideoRow'
import { api } from '../lib/api'
import { dayKey, formatDate, formatDuration } from '../lib/format'
import { useRefreshAll } from '../lib/queries'
import type { Playlist, Video } from '../lib/types'

export default function PlaylistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const refresh = useRefreshAll()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => (await api.get<{ playlist: Playlist; videos: Video[] }>(`/playlists/${id}`)).data,
  })

  const patch = useMutation({
    mutationFn: (body: { deadline?: string; priority?: number }) => api.patch(`/playlists/${id}`, body),
    onSuccess: async () => {
      await refresh()
      toast.success('Plan updated')
    },
  })
  const reorder = useMutation({
    mutationFn: (videoIds: string[]) => api.put(`/playlists/${id}/order`, { videoIds }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/playlists/${id}`),
    onSuccess: async () => {
      await refresh()
      toast.success('Playlist removed')
      navigate('/playlists')
    },
  })

  const back = (
    <Link to="/playlists" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
      <FiArrowLeft className="size-4" /> Playlists
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        {back}
        <Skeleton className="h-64" />
        <ListSkeleton rows={4} />
      </div>
    )
  }
  if (isError || !data) return <div className="space-y-5">{back}<p className="text-sm text-slate-500">Playlist not found.</p></div>

  const { playlist: p, videos } = data
  const remainingSec = videos.filter((v) => !v.completed && !v.skipped).reduce((s, v) => s + v.durationSec, 0)

  const move = (index: number, direction: -1 | 1) => {
    const ids = videos.map((v) => v._id)
    const target = index + direction
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <div className="animate-fade-up space-y-5">
      {back}

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {p.thumbnail && <img src={p.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-48" />}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-snug tracking-tight text-slate-900">{p.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{p.channel}</p>
            <p className="mt-2 text-sm text-slate-500">
              {p.completedCount}/{p.videoCount} videos · {formatDuration(remainingSec)} left
              {p.skippedCount > 0 && ` · ${p.skippedCount} skipped`}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium text-slate-700">{p.completedPercent}%</span>
          </div>
          <ProgressBar percent={p.completedPercent} tone={p.status === 'completed' ? 'emerald' : 'indigo'} />
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
          <div>
            <label className="label" htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              className="input !w-auto"
              defaultValue={dayKey(p.deadline)}
              onChange={(e) => e.target.value && patch.mutate({ deadline: e.target.value })}
            />
          </div>
          <div>
            <span className="label">Priority</span>
            <PrioritySelect value={p.priority} disabled={patch.isPending} onChange={(priority) => patch.mutate({ priority })} />
          </div>
          <button
            className="btn-danger ml-auto"
            disabled={remove.isPending}
            onClick={() => window.confirm('Remove this playlist and its progress?') && remove.mutate()}
          >
            <FiTrash2 className="size-4" /> Remove
          </button>
        </div>
      </section>

      <section className="card">
        <ul className="-mx-2 divide-y divide-slate-100">
          {videos.map((v, i) => (
            <VideoRow
              key={v._id}
              video={v}
              meta={v.completed ? 'Completed' : v.scheduledDate ? `Planned ${formatDate(v.scheduledDate)}` : undefined}
              manage={{
                canUp: i > 0,
                canDown: i < videos.length - 1,
                busy: reorder.isPending,
                onMove: (dir) => move(i, dir),
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
