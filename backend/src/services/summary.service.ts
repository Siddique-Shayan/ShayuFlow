import { playlistRepository } from "../repositories/playlist.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import { computePlan, planService } from "./plan.service.js";
import { effectiveMinutes, startOfDay } from "./planner.service.js";

const DAY_MS = 86_400_000;

type PaceStatus = "ahead" | "on_track" | "behind";

export const summaryService = {
  /** Summary of a Monday-Sunday week. `offset` 0 is this week, -1 is last week, and so on. */
  async weekly(userId: string, offset: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "User not found");

    const today = startOfDay(new Date());
    const sinceMonday = (today.getUTCDay() + 6) % 7;
    const weekStart = new Date(today.getTime() + (offset * 7 - sinceMonday) * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const isCurrent = offset === 0;

    const completed = await videoRepository.listCompletedBetween(userId, weekStart, weekEnd);
    const goals = effectiveMinutes(user.weekdayMinutes);

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart.getTime() + i * DAY_MS);
      const done = completed.filter((v) => startOfDay(v.completedAt!).getTime() === date.getTime());
      return {
        date,
        goalMinutes: goals[date.getUTCDay()],
        studiedMinutes: Math.round(done.reduce((s, v) => s + v.durationSec, 0) / 60),
        videos: done.length,
      };
    });

    const studiedMinutes = days.reduce((s, d) => s + d.studiedMinutes, 0);
    const goalMinutes = days.reduce((s, d) => s + d.goalMinutes, 0);
    const goalToDate = days
      .filter((d) => !isCurrent || d.date <= today)
      .reduce((s, d) => s + d.goalMinutes, 0);
    const best = days.reduce((a, b) => (b.studiedMinutes > a.studiedMinutes ? b : a));

    let backlogCount = 0;
    let atRisk: { playlistId: string; title: string; requiredMinutesPerDay: number | null }[] = [];
    if (isCurrent) {
      backlogCount = (await planService.backlog(userId)).count;
      const [{ reports }, playlists] = await Promise.all([
        computePlan(userId),
        playlistRepository.listActiveByUser(userId),
      ]);
      atRisk = reports
        .filter((r) => r.atRisk)
        .map((r) => ({
          playlistId: r.playlistId,
          title: playlists.find((p) => String(p._id) === r.playlistId)?.title ?? "A playlist",
          requiredMinutesPerDay: r.requiredMinutesPerDay,
        }));
    }

    let status: PaceStatus = "on_track";
    if (isCurrent && backlogCount > 0) status = "behind";
    else if (goalToDate > 0 && studiedMinutes < goalToDate * 0.9) status = "behind";
    else if (goalToDate > 0 && studiedMinutes >= goalToDate * 1.15) status = "ahead";

    return {
      weekStart,
      weekEnd: new Date(weekEnd.getTime() - DAY_MS),
      days,
      studiedMinutes,
      goalMinutes,
      goalToDateMinutes: goalToDate,
      videosCompleted: completed.length,
      bestDay: best.studiedMinutes > 0 ? best.date : null,
      streak: (await planService.stats(userId)).streak,
      backlogCount,
      atRisk,
      status: isCurrent ? status : null,
      suggestion: suggest({ isCurrent, status, backlogCount, atRisk, studiedMinutes, goalToDate }),
    };
  },
};

function suggest(s: {
  isCurrent: boolean;
  status: PaceStatus;
  backlogCount: number;
  atRisk: { title: string; requiredMinutesPerDay: number | null }[];
  studiedMinutes: number;
  goalToDate: number;
}): string {
  if (!s.isCurrent) {
    return s.studiedMinutes > 0
      ? `You studied ${s.studiedMinutes} minutes that week.`
      : "No study time was logged that week.";
  }
  const risky = s.atRisk[0];
  if (risky) {
    return risky.requiredMinutesPerDay
      ? `"${risky.title}" will miss its deadline at your current pace. About ${risky.requiredMinutesPerDay} min a day would fix it, or move the date.`
      : `"${risky.title}" cannot be finished by its deadline. Consider a later date.`;
  }
  if (s.backlogCount > 0) {
    return `${s.backlogCount} video${s.backlogCount === 1 ? " has" : "s have"} slipped behind. Pick a catch-up option on the Today page.`;
  }
  if (s.status === "ahead") return "You're ahead of plan. Keep the rhythm, or consider tightening a deadline.";
  if (s.status === "behind") {
    return `You've studied ${s.studiedMinutes} of ${s.goalToDate} planned minutes so far. A daily goal you can hit beats a long one you miss.`;
  }
  return "You're right on track. Keep it up!";
}
