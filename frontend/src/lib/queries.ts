import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

/** Completing a video or changing the plan affects every screen, so refresh them all. */
export function useRefreshAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['plan', 'playlists', 'playlist', 'stats', 'backlog', 'me', 'summary', 'friends'].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

export function useToggleVideo() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch(`/videos/${id}/complete`, { completed }),
    onSuccess: refresh,
  })
}

export function useUpdateVideo() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { note?: string; skipped?: boolean } }) =>
      api.patch(`/videos/${id}`, patch),
    onSuccess: refresh,
  })
}
