export type ScheduleMode = "deadline" | "interleave" | "weighted";

export interface PlanPlaylist {
  id: string;
  deadline: Date;
  priority: number; // 1-5, only used by the weighted mode
}

export interface PlanVideo {
  id: string;
  playlistId: string;
  durationSec: number;
  position: number;
}

export interface PlanInput {
  playlists: PlanPlaylist[];
  videos: PlanVideo[]; // incomplete, non-skipped videos only
  weekdayMinutes: number[]; // index 0 = Sunday ... 6 = Saturday, 0 = day off
  mode: ScheduleMode;
  startDate: Date;
}

export interface PlaylistReport {
  playlistId: string;
  finishDate: Date | null;
  atRisk: boolean;
  requiredMinutesPerDay: number | null; // set only when atRisk
}

export interface PlanResult {
  assignments: Map<string, Date>; // videoId -> study day (UTC midnight)
  reports: PlaylistReport[];
}

interface Queue {
  playlistId: string;
  priority: number;
  videos: PlanVideo[];
  next: number;
  credit: number; // weighted mode: seconds earned but not yet spent
}

const DAY_MS = 86_400_000;
const MAX_DAILY_MINUTES = 1440;
const MAX_DAYS = 3650;

export const startOfDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY_MS);

/** A plan with every day off is impossible, so fall back to one hour a day. */
export const effectiveMinutes = (minutes: number[]): number[] =>
  minutes.length === 7 && minutes.some((m) => m > 0) ? minutes : Array(7).fill(60);

const hasNext = (q: Queue): boolean => q.next < q.videos.length;

/** Picks the videos for one study day. A day always gets at least one video, however long. */
const fillDay = (queues: Queue[], budget: number, mode: ScheduleMode): PlanVideo[] => {
  const picked: PlanVideo[] = [];
  let used = 0;
  const fits = (v: PlanVideo) => picked.length === 0 || used + v.durationSec <= budget;
  const take = (q: Queue) => {
    const v = q.videos[q.next++];
    picked.push(v);
    used += v.durationSec;
  };

  if (mode === "deadline") {
    for (const q of queues) {
      while (hasNext(q)) {
        if (!fits(q.videos[q.next])) return picked;
        take(q);
      }
    }
  } else if (mode === "interleave") {
    for (;;) {
      let took = false;
      for (const q of queues) {
        if (!hasNext(q)) continue;
        if (!fits(q.videos[q.next])) return picked;
        take(q);
        took = true;
      }
      if (!took) return picked;
    }
  } else {
    const active = queues.filter(hasNext);
    const totalWeight = active.reduce((s, q) => s + q.priority, 0);
    // Phase 1: every playlist earns a slice of the day proportional to its priority.
    // Unused slice carries over, so a video longer than one day's slice is not starved.
    for (const q of active) {
      q.credit += (budget * q.priority) / totalWeight;
      while (hasNext(q)) {
        const v = q.videos[q.next];
        if (q.credit < v.durationSec || used + v.durationSec > budget) break;
        q.credit -= v.durationSec;
        take(q);
      }
    }
    // Phase 2: hand any leftover time to the earliest deadlines.
    for (const q of active) {
      while (hasNext(q) && used + q.videos[q.next].durationSec <= budget) {
        q.credit = Math.max(0, q.credit - q.videos[q.next].durationSec);
        take(q);
      }
    }
    if (picked.length === 0) take(active[0]);
  }
  return picked;
};

const schedule = (
  playlists: PlanPlaylist[],
  videos: PlanVideo[],
  minutes: number[],
  mode: ScheduleMode,
  start: Date,
): Map<string, Date> => {
  const queues: Queue[] = [...playlists]
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .map((p) => ({
      playlistId: p.id,
      priority: p.priority,
      videos: videos.filter((v) => v.playlistId === p.id).sort((a, b) => a.position - b.position),
      next: 0,
      credit: 0,
    }));

  const assignments = new Map<string, Date>();
  let day = start;
  for (let i = 0; i < MAX_DAYS && queues.some(hasNext); i++, day = addDays(day, 1)) {
    const dayMinutes = minutes[day.getUTCDay()];
    if (dayMinutes <= 0) continue;
    for (const v of fillDay(queues, dayMinutes * 60, mode)) assignments.set(v.id, day);
  }
  return assignments;
};

/** Last study day per playlist. A playlist that never finished maps to a far-future date. */
const finishDates = (
  videos: PlanVideo[],
  assignments: Map<string, Date>,
  start: Date,
): Map<string, Date> => {
  const never = addDays(start, MAX_DAYS);
  const finish = new Map<string, Date>();
  for (const v of videos) {
    const d = assignments.get(v.id) ?? never;
    const cur = finish.get(v.playlistId);
    if (!cur || d > cur) finish.set(v.playlistId, d);
  }
  return finish;
};

const meetsDeadline = (deadline: Date, finish: Date | undefined): boolean =>
  !finish || finish <= startOfDay(deadline);

export const buildPlan = (input: PlanInput): PlanResult => {
  const start = startOfDay(input.startDate);
  const minutes = effectiveMinutes(input.weekdayMinutes);
  const run = (mins: number[]) => schedule(input.playlists, input.videos, mins, input.mode, start);

  const assignments = run(minutes);
  const finish = finishDates(input.videos, assignments, start);

  const reports = [...input.playlists]
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .map<PlaylistReport>((p) => {
      const finishDate = finish.get(p.id) ?? null;
      const atRisk = !meetsDeadline(p.deadline, finishDate ?? undefined);
      let required: number | null = null;

      if (atRisk) {
        // Smallest uniform daily budget (on the days you study) that meets this deadline.
        const meets = (m: number) => {
          const uniform = minutes.map((x) => (x > 0 ? m : 0));
          const f = finishDates(input.videos, run(uniform), start);
          return meetsDeadline(p.deadline, f.get(p.id));
        };
        if (meets(MAX_DAILY_MINUTES)) {
          let lo = 1;
          let hi = MAX_DAILY_MINUTES;
          while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (meets(mid)) hi = mid;
            else lo = mid + 1;
          }
          required = lo;
        }
      }
      return { playlistId: p.id, finishDate, atRisk, requiredMinutesPerDay: required };
    });

  return { assignments, reports };
};

/** Percentage (0-100, one decimal) of duration completed. */
export const completionPercent = (completedSec: number, totalSec: number): number =>
  totalSec <= 0 ? 0 : Math.round((completedSec / totalSec) * 1000) / 10;
