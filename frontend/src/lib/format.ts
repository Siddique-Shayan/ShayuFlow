export const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Seconds planned on a plan entry: the day's part of a split video, or the whole video. */
export const plannedSec = (v: { durationSec: number; segment?: { startSec: number; endSec: number } }): number =>
  v.segment ? v.segment.endSec - v.segment.startSec : v.durationSec

/** Playback position as m:ss or h:mm:ss. */
export const formatClock = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export const formatDate = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '-'

/** YYYY-MM-DD in UTC, matching how the server stores study days. */
export const dayKey = (d: Date | string): string => new Date(d).toISOString().slice(0, 10)

export const daysLeft = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
