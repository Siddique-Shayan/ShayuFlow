import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import { useRefreshAll } from '../lib/queries'
import type { BacklogPreference, ScheduleMode, User } from '../lib/types'

// weekdayMinutes is indexed from Sunday, but people read a week starting on Monday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MODES: { value: ScheduleMode; title: string; hint: string }[] = [
  { value: 'deadline', title: 'Deadline first', hint: 'Finish the earliest deadline first' },
  { value: 'interleave', title: 'Interleave', hint: 'Mix playlists every day' },
  { value: 'weighted', title: 'Weighted', hint: 'Split each day by priority' },
]

const PREFS: { value: BacklogPreference; label: string }[] = [
  { value: 'ask', label: 'Ask me each time' },
  { value: 'spread', label: 'Spread over remaining days' },
  { value: 'increase', label: 'Increase daily minutes' },
  { value: 'extend', label: 'Extend the deadline' },
]

export default function Settings() {
  const { user } = useAuth()
  if (!user) return null
  return <SettingsForm key={user._id} user={user} />
}

function SettingsForm({ user }: { user: User }) {
  const refresh = useRefreshAll()
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    weekdayMinutes: user.weekdayMinutes,
    scheduleMode: user.scheduleMode,
    backlogPreference: user.backlogPreference,
  })

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/users/me', form)
      // Study time and schedule mode change the schedule, so rebuild it.
      await api.post('/plan/recalculate', { strategy: 'spread' })
    },
    onSuccess: async () => {
      await refresh()
      toast.success('Settings saved')
    },
  })

  const setDay = (day: number, minutes: number) =>
    setForm({ ...form, weekdayMinutes: form.weekdayMinutes.map((m, i) => (i === day ? minutes : m)) })

  const weeklyMinutes = form.weekdayMinutes.reduce((s, m) => s + m, 0)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" subtitle={user.email} />

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="bio">About</label>
          <textarea
            id="bio"
            className="input min-h-20"
            maxLength={500}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Visible to your study buddies"
          />
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Study time</h2>
          <span className="text-xs text-slate-500">{formatDuration(weeklyMinutes * 60)} / week</span>
        </div>
        <div className="space-y-1">
          {WEEK_ORDER.map((day) => {
            const minutes = form.weekdayMinutes[day]
            return (
              <div key={day} className="flex items-center gap-3 py-1.5">
                <span className="w-10 shrink-0 text-sm text-slate-600 sm:w-24">
                  <span className="sm:hidden">{DAY_NAMES[day].slice(0, 3)}</span>
                  <span className="hidden sm:inline">{DAY_NAMES[day]}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={480}
                  step={15}
                  value={minutes}
                  aria-label={`${DAY_NAMES[day]} minutes`}
                  onChange={(e) => setDay(day, Number(e.target.value))}
                  className="h-6 min-w-0 flex-1 accent-indigo-600"
                />
                <span className={`w-14 shrink-0 text-right text-sm ${minutes === 0 ? 'text-slate-400' : 'font-medium text-slate-800'}`}>
                  {minutes === 0 ? 'Off' : formatDuration(minutes * 60)}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Scheduling</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => {
              const active = form.scheduleMode === m.value
              return (
                <label
                  key={m.value}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    active ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={active}
                    onChange={() => setForm({ ...form, scheduleMode: m.value })}
                  />
                  <span className="block text-sm font-medium text-slate-900">{m.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{m.hint}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="backlog">When I fall behind</label>
          <select
            id="backlog"
            className="input"
            value={form.backlogPreference}
            onChange={(e) => setForm({ ...form, backlogPreference: e.target.value as BacklogPreference })}
          >
            {PREFS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <button className="btn-primary w-full sm:w-auto" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
