import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { AiSummary, ChatMessage, Video, VideoChat } from './types'

/** Completing a video or changing the plan affects every screen, so refresh them all. */
export function useRefreshAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['plan', 'playlists', 'playlist', 'video', 'stats', 'backlog', 'me', 'summary', 'friends'].map((key) =>
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

export function useVideo(id: string | undefined) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () =>
      (await api.get<{ video: Video; playlist: { _id: string; title: string } | null }>(`/videos/${id}`)).data,
    enabled: !!id,
  })
}

/** Whether the server has an AI key configured; the summary UI is hidden otherwise. */
export function useAiEnabled() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => (await api.get<{ enabled: boolean }>('/ai/status')).data.enabled,
    staleTime: Infinity,
  })
}

/** The cached summary for a video, or null when none has been generated yet. */
export function useVideoSummary(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['video-summary', id],
    queryFn: async () => (await api.get<{ summary: AiSummary | null }>(`/videos/${id}/summary`)).data.summary,
    enabled,
  })
}

export function useGenerateSummary(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<{ summary: AiSummary }>(`/videos/${id}/summary`)).data.summary,
    onSuccess: (summary) => qc.setQueryData(['video-summary', id], summary),
  })
}

/** AskMafia knowledge-base status and saved conversation for a video. */
export function useVideoChat(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['video-chat', id],
    queryFn: async () => (await api.get<VideoChat>(`/videos/${id}/chat`)).data,
    enabled,
  })
}

/** Saves the video's summary and transcript as AskMafia's knowledge base (generating the summary if needed). */
export function useBuildKnowledge(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/videos/${id}/knowledge`),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['video-chat', id] }),
        qc.invalidateQueries({ queryKey: ['video-summary', id] }),
      ]),
  })
}

export function useAskMafia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (question: string) =>
      (await api.post<{ messages: ChatMessage[]; remaining: number }>(`/videos/${id}/chat`, { question })).data,
    onSuccess: ({ messages, remaining }) =>
      qc.setQueryData<VideoChat>(['video-chat', id], (old) =>
        old ? { ...old, messages: [...old.messages, ...messages], remaining } : old,
      ),
  })
}

export function useClearChat(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/videos/${id}/chat`),
    onSuccess: () => qc.setQueryData<VideoChat>(['video-chat', id], (old) => (old ? { ...old, messages: [] } : old)),
  })
}

/** Public sign-in settings: the Google client id, or null when Google sign-in is off. */
export function useGoogleClientId() {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => (await api.get<{ googleClientId: string | null }>('/auth/config')).data.googleClientId,
    staleTime: Infinity,
  })
}
