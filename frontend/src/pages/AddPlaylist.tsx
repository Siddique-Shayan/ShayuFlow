import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { PrioritySelect } from '../components/PrioritySelect'
import { PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { useRefreshAll } from '../lib/queries'
import type { Playlist, PlaylistReport } from '../lib/types'

export default function AddPlaylist() {
  const navigate = useNavigate()
  const refresh = useRefreshAll()
  const [url, setUrl] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState(3)
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))

  const add = useMutation({
    mutationFn: async () =>
      (await api.post<{ playlist: Playlist; reports: PlaylistReport[] }>('/playlists', { url, deadline, priority })).data,
    onSuccess: async (data) => {
      await refresh()
      toast.success('Playlist added')
      const report = data.reports.find((r) => r.playlistId === data.playlist._id)
      if (!report?.atRisk) navigate(`/playlists/${data.playlist._id}`)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate()
  }

  const report = add.data?.reports.find((r) => r.playlistId === add.data?.playlist._id)

  return (
    <div className="animate-fade-up mx-auto max-w-xl space-y-5">
      <Link to="/playlists" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <FiArrowLeft className="size-4" /> Playlists
      </Link>
      <PageHeader title="Add playlist" subtitle="Paste a link and choose when you want to finish." />

      <form onSubmit={onSubmit} className="card space-y-5">
        <div>
          <label className="label" htmlFor="url">Playlist URL</label>
          <input
            id="url"
            className="input"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=…"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="deadline">Finish by</label>
            <input id="deadline" className="input" type="date" required min={tomorrow} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <span className="label">Priority</span>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={add.isPending}>
          {add.isPending ? 'Fetching videos…' : 'Create plan'}
        </button>
      </form>

      {report?.atRisk && add.data && (
        <div className="animate-fade-up flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <FiAlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-amber-900">
            <p className="font-semibold">That deadline is tight</p>
            <p className="mt-1 text-amber-800/80">
              At your current pace you'd finish around {formatDate(report.finishDate)}.
              {report.requiredMinutesPerDay
                ? ` About ${report.requiredMinutesPerDay} min a day would make it.`
                : ' Consider a later date.'}
            </p>
            <Link to={`/playlists/${add.data.playlist._id}`} className="btn-outline btn-sm mt-3">
              View playlist
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
