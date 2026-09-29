import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { FiCheck, FiChevronDown, FiUserPlus, FiUsers, FiX, FiZap } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { ProgressBar } from '../components/ProgressBar'
import { Avatar, EmptyState, ListSkeleton, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatDuration } from '../lib/format'
import { useRefreshAll } from '../lib/queries'
import type { FriendDetail, FriendsResponse } from '../lib/types'

function FriendCard({ friend }: { friend: FriendsResponse['friends'][number] }) {
  const refresh = useRefreshAll()
  const [open, setOpen] = useState(false)
  const { user, progress } = friend

  const detail = useQuery({
    queryKey: ['friends', friend.friendshipId],
    queryFn: async () => (await api.get<FriendDetail>(`/friends/${friend.friendshipId}`)).data,
    enabled: open,
  })
  const remove = useMutation({
    mutationFn: () => api.delete(`/friends/${friend.friendshipId}`),
    onSuccess: async () => {
      await refresh()
      toast.success(`${user.name} removed`)
    },
  })

  const studiedToday = progress.studiedTodayMinutes > 0

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`size-1.5 rounded-full ${studiedToday ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {studiedToday ? `${formatDuration(progress.studiedTodayMinutes * 60)} today` : 'Not yet today'}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          <FiZap className="size-3.5" /> {progress.streak}
        </span>
      </div>

      <div>
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-slate-500">
            {progress.videosCompleted}/{progress.videosTotal} videos · {progress.hoursWatched}h
          </span>
          <span className="font-medium text-slate-700">{progress.overallPercent}%</span>
        </div>
        <ProgressBar percent={progress.overallPercent} />
      </div>

      {user.bio && <p className="text-sm text-slate-500">{user.bio}</p>}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <button className="btn-ghost btn-sm !px-2" onClick={() => setOpen(!open)} aria-expanded={open}>
          Playlists <FiChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        <button
          className="btn-danger btn-sm"
          disabled={remove.isPending}
          onClick={() => window.confirm(`Remove ${user.name}?`) && remove.mutate()}
        >
          Remove
        </button>
      </div>

      {open && (
        <div className="animate-fade-up space-y-4">
          {detail.isLoading && <ListSkeleton rows={2} />}
          {detail.data?.playlists.length === 0 && <p className="text-sm text-slate-500">No playlists yet.</p>}
          {detail.data?.playlists.map((p) => (
            <div key={p._id} className="space-y-1.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-700">{p.title}</span>
                <span className="shrink-0 text-xs text-slate-500">{p.completedPercent}%</span>
              </div>
              <ProgressBar percent={p.completedPercent} tone={p.status === 'completed' ? 'emerald' : 'indigo'} />
              <p className="text-xs text-slate-400">
                {p.completedCount}/{p.videoCount} videos · due {formatDate(p.deadline)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Friends() {
  const refresh = useRefreshAll()
  const [email, setEmail] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await api.get<FriendsResponse>('/friends')).data,
  })

  const invite = useMutation({
    mutationFn: async () => (await api.post<{ status: 'pending' | 'accepted' }>('/friends/requests', { email })).data,
    onSuccess: async (res) => {
      setEmail('')
      await refresh()
      toast.success(res.status === 'accepted' ? 'You are now study buddies' : 'Invite sent')
    },
  })
  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/friends/${id}/accept`),
    onSuccess: async () => {
      await refresh()
      toast.success('Request accepted')
    },
  })
  const decline = useMutation({
    mutationFn: (id: string) => api.delete(`/friends/${id}`),
    onSuccess: refresh,
  })

  const onInvite = (e: FormEvent) => {
    e.preventDefault()
    invite.mutate()
  }

  const nobody = data && data.friends.length === 0 && data.incoming.length === 0 && data.outgoing.length === 0

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title="Buddies" subtitle="Friends see each other's progress." />

      <form onSubmit={onInvite} className="card">
        <label className="label" htmlFor="invite">Invite by email</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="invite"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
          />
          <button className="btn-primary shrink-0" disabled={invite.isPending}>
            <FiUserPlus className="size-4" /> {invite.isPending ? 'Sending…' : 'Invite'}
          </button>
        </div>
      </form>

      {data && data.incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Requests</h2>
          {data.incoming.map((r) => (
            <div key={r.friendshipId} className="card flex items-center gap-3 !p-3.5">
              <Avatar name={r.user.name} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{r.user.name}</p>
              <button className="btn-primary btn-sm" disabled={accept.isPending} onClick={() => accept.mutate(r.friendshipId)}>
                <FiCheck className="size-4" /> Accept
              </button>
              <button
                className="btn-ghost btn-sm !px-2"
                aria-label="Decline"
                disabled={decline.isPending}
                onClick={() => decline.mutate(r.friendshipId)}
              >
                <FiX className="size-4" />
              </button>
            </div>
          ))}
        </section>
      )}

      {isLoading && <ListSkeleton />}

      {data && data.friends.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {data.friends.map((f) => (
            <FriendCard key={f.friendshipId} friend={f} />
          ))}
        </section>
      )}

      {data && data.outgoing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Pending</h2>
          {data.outgoing.map((r) => (
            <div key={r.friendshipId} className="card flex items-center gap-3 !p-3.5">
              <Avatar name={r.user.name} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{r.user.name}</p>
              <button className="btn-ghost btn-sm" disabled={decline.isPending} onClick={() => decline.mutate(r.friendshipId)}>
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}

      {nobody && <EmptyState icon={FiUsers} title="No buddies yet" text="Invite a friend to keep each other going." />}
    </div>
  )
}
