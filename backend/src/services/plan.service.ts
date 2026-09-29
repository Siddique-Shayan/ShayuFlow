import { Playlist } from "../models/Playlist.js";
import { playlistRepository } from "../repositories/playlist.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import {
  buildPlan,
  completionPercent,
  effectiveMinutes,
  startOfDay,
  type PlanResult,
  type PlaylistReport,
} from "./planner.service.js";

export type BacklogStrategy = "spread" | "increase" | "extend";

const DAY_MS = 86_400_000;

/** Builds the schedule for every incomplete video of the user, starting today, without saving. */
export const computePlan = async (userId: string): Promise<PlanResult> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, "User not found");

  const [playlists, videos] = await Promise.all([
    playlistRepository.listActiveByUser(userId),
    videoRepository.listIncomplete(userId),
  ]);

  return buildPlan({
    playlists: playlists.map((p) => ({
      id: String(p._id),
      deadline: p.deadline,
      priority: p.priority,
    })),
    videos: videos.map((v) => ({
      id: String(v._id),
      playlistId: String(v.playlistId),
      durationSec: v.durationSec,
      position: v.position,
    })),
    weekdayMinutes: user.weekdayMinutes,
    mode: user.scheduleMode,
    startDate: new Date(),
  });
};

/** Rebuilds and saves the schedule. */
export const replan = async (userId: string): Promise<PlaylistReport[]> => {
  const { assignments, reports } = await computePlan(userId);
  await videoRepository.setSchedule([...assignments].map(([id, date]) => ({ id, date })));
  return reports;
};

export const planService = {
  replan,

  today: (userId: string) => {
    const today = startOfDay(new Date());
    return videoRepository.listScheduledBetween(userId, today, today);
  },

  range: (userId: string, from: Date, to: Date) =>
    videoRepository.listScheduledBetween(userId, startOfDay(from), startOfDay(to)),

  async backlog(userId: string) {
    const videos = await videoRepository.listBacklog(userId, startOfDay(new Date()));
    const totalSec = videos.reduce((sum, v) => sum + v.durationSec, 0);
    return { count: videos.length, totalSec, videos };
  },

  async recalculate(userId: string, strategy: BacklogStrategy) {
    let reports = await replan(userId);

    if (strategy === "increase") {
      const needed = Math.max(0, ...reports.map((r) => r.requiredMinutesPerDay ?? 0));
      if (needed > 0) {
        const user = await userRepository.findById(userId);
        const current = effectiveMinutes(user?.weekdayMinutes ?? []);
        // Only raise the days the user already studies on.
        await userRepository.update(userId, {
          weekdayMinutes: current.map((m) => (m > 0 ? Math.max(m, needed) : 0)),
        });
        reports = await replan(userId);
      }
    } else if (strategy === "extend") {
      const late = reports.filter((r) => r.atRisk && r.finishDate);
      await Promise.all(
        late.map((r) =>
          Playlist.updateOne({ _id: r.playlistId, userId }, { deadline: r.finishDate }),
        ),
      );
      if (late.length) reports = await replan(userId);
    }
    return reports;
  },

  async stats(userId: string) {
    const videos = (await videoRepository.listByUser(userId)).filter((v) => !v.skipped);
    const total = videos.reduce((s, v) => s + v.durationSec, 0);
    const done = videos.filter((v) => v.completed);
    const doneSec = done.reduce((s, v) => s + v.durationSec, 0);

    const days = new Set(
      done.filter((v) => v.completedAt).map((v) => startOfDay(v.completedAt!).getTime()),
    );
    // Streak counts back from today, or from yesterday if today has no completions yet.
    let cursor = startOfDay(new Date()).getTime();
    if (!days.has(cursor)) cursor -= DAY_MS;
    let streak = 0;
    while (days.has(cursor)) {
      streak++;
      cursor -= DAY_MS;
    }

    return {
      overallPercent: completionPercent(doneSec, total),
      videosCompleted: done.length,
      videosTotal: videos.length,
      hoursWatched: Math.round((doneSec / 3600) * 10) / 10,
      streak,
    };
  },
};
