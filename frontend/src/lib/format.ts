export const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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
