export type BacklogPreference = 'ask' | 'spread' | 'increase' | 'extend'
export type BacklogStrategy = Exclude<BacklogPreference, 'ask'>
export type ScheduleMode = 'deadline' | 'interleave' | 'weighted'

export interface User {
  _id: string
  name: string
  email: string
  bio: string
  avatarUrl: string
  weekdayMinutes: number[] // index 0 = Sunday
  scheduleMode: ScheduleMode
  timezone: string
  backlogPreference: BacklogPreference
}

export interface Playlist {
  _id: string
  youtubePlaylistId: string
  title: string
  channel: string
  thumbnail: string
  deadline: string
  priority: number
  status: 'active' | 'completed'
  totalDurationSec: number
  videoCount: number
  completedCount: number
  skippedCount: number
  completedPercent: number
}

export interface Video {
  _id: string
  playlistId: string
  youtubeVideoId: string
  title: string
  thumbnail: string
  durationSec: number
  position: number
  completed: boolean
  skipped: boolean
  note: string
  scheduledDate: string | null
  /** Set on plan entries: the part of the video planned for that day (a long video spans several days). */
  segment?: { date: string; startSec: number; endSec: number }
}

export interface AiSummary {
  summary: string
  keyPoints: string[]
}

/** Structured parts of an AskMafia answer. Moments are verified transcript timestamps. */
export interface AnswerDetails {
  covered: boolean
  points: string[]
  moments: { sec: number; label: string }[]
  followUps: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  details?: AnswerDetails
}

/** AskMafia state for one video: knowledge-base status, the user's conversation and today's quota. */
export interface VideoChat {
  ready: boolean
  messages: ChatMessage[]
  remaining: number
  dailyLimit: number
}

export interface PlaylistReport {
  playlistId: string
  finishDate: string | null
  atRisk: boolean
  requiredMinutesPerDay: number | null
}

export interface Stats {
  overallPercent: number
  videosCompleted: number
  videosTotal: number
  hoursWatched: number
  streak: number
}

export interface WeeklySummary {
  weekStart: string
  weekEnd: string
  days: { date: string; goalMinutes: number; studiedMinutes: number; videos: number }[]
  studiedMinutes: number
  goalMinutes: number
  goalToDateMinutes: number
  videosCompleted: number
  bestDay: string | null
  streak: number
  backlogCount: number
  atRisk: { playlistId: string; title: string; requiredMinutesPerDay: number | null }[]
  status: 'ahead' | 'on_track' | 'behind' | null
  suggestion: string
}

export interface FriendProfile {
  _id: string
  name: string
  avatarUrl: string
  bio: string
}

export interface FriendProgress extends Stats {
  studiedTodayMinutes: number
}

export interface FriendsResponse {
  friends: { friendshipId: string; user: FriendProfile; progress: FriendProgress }[]
  incoming: { friendshipId: string; user: FriendProfile }[]
  outgoing: { friendshipId: string; user: FriendProfile }[]
}

export interface FriendDetail {
  user: FriendProfile
  progress: FriendProgress
  playlists: Pick<
    Playlist,
    '_id' | 'title' | 'channel' | 'thumbnail' | 'deadline' | 'status' | 'videoCount' | 'completedCount' | 'completedPercent'
  >[]
}
