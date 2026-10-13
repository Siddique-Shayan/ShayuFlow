import { describe, expect, it } from "vitest";
import {
  buildPlan,
  completionPercent,
  type PlanInput,
  type PlanVideo,
  type ScheduleMode,
} from "./planner.service.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date | undefined) => x?.toISOString().slice(0, 10);
const vids = (playlistId: string, n: number, minutes: number): PlanVideo[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${playlistId}${i}`,
    playlistId,
    durationSec: minutes * 60,
    position: i,
  }));
const week = (m: number) => Array<number>(7).fill(m);

// 2026-09-28 is a Monday
const start = d("2026-09-28");

const plan = (over: Partial<PlanInput> & Pick<PlanInput, "playlists" | "videos">) =>
  buildPlan({ weekdayMinutes: week(60), mode: "deadline", startDate: start, ...over });

const far = d("2026-12-01");

describe("deadline mode", () => {
  it("packs videos into the daily budget", () => {
    const r = plan({ playlists: [{ id: "A", deadline: far, priority: 3 }], videos: vids("A", 4, 30) });
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("A2"))).toBe("2026-09-29");
    expect(r.reports[0].atRisk).toBe(false);
  });

  it("splits a video that does not fit in the time left and carries the rest over", () => {
    // 60 min/day: 28 + 45 min videos -> day 1 is 28 min + the first 32 min of the 45
    const r = plan({
      playlists: [{ id: "A", deadline: far, priority: 3 }],
      videos: [
        { id: "A0", playlistId: "A", durationSec: 28 * 60, position: 0 },
        { id: "A1", playlistId: "A", durationSec: 45 * 60, position: 1 },
      ],
    });
    expect(r.segments.get("A0")).toEqual([{ date: start, startSec: 0, endSec: 1680 }]);
    expect(r.segments.get("A1")).toEqual([
      { date: start, startSec: 0, endSec: 1920 },
      { date: d("2026-09-29"), startSec: 1920, endSec: 2700 },
    ]);
  });

  it("spreads a long video over several days, filling each day's budget", () => {
    const r = plan({ playlists: [{ id: "A", deadline: far, priority: 3 }], videos: vids("A", 1, 150) });
    expect(r.segments.get("A0")?.map((s) => [iso(s.date), s.endSec - s.startSec])).toEqual([
      ["2026-09-28", 3600],
      ["2026-09-29", 3600],
      ["2026-09-30", 1800],
    ]);
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
  });

  it("never leaves a tail or a part shorter than ten minutes", () => {
    // 62 min video on a 60 min day: shrink today's part so the tail is 10 min, not 2
    const r = plan({ playlists: [{ id: "A", deadline: far, priority: 3 }], videos: vids("A", 1, 62) });
    expect(r.segments.get("A0")?.map((s) => s.endSec - s.startSec)).toEqual([3120, 600]);
    // 5 min left in the day is not worth starting a 60 min video
    const r2 = plan({
      playlists: [{ id: "A", deadline: far, priority: 3 }],
      videos: [
        { id: "A0", playlistId: "A", durationSec: 55 * 60, position: 0 },
        { id: "A1", playlistId: "A", durationSec: 60 * 60, position: 1 },
      ],
    });
    expect(iso(r2.segments.get("A1")?.[0].date)).toBe("2026-09-29");
  });

  it("finishes a playlist on the day its last part is watched", () => {
    const r = plan({ playlists: [{ id: "A", deadline: d("2026-09-28"), priority: 3 }], videos: vids("A", 1, 90) });
    expect(iso(r.reports[0].finishDate ?? undefined)).toBe("2026-09-29");
    expect(r.reports[0].atRisk).toBe(true);
  });

  it("skips days with 0 minutes", () => {
    const minutes = week(60);
    minutes[2] = 0; // Tuesday
    const r = plan({
      playlists: [{ id: "A", deadline: far, priority: 3 }],
      videos: vids("A", 3, 60),
      weekdayMinutes: minutes,
    });
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-30");
  });

  it("uses a different budget for each weekday", () => {
    const minutes = week(30);
    minutes[2] = 120; // Tuesday
    const r = plan({
      playlists: [{ id: "A", deadline: far, priority: 3 }],
      videos: vids("A", 6, 30),
      weekdayMinutes: minutes,
    });
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28"); // Mon: 1 video
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-29"); // Tue: 4 videos
    expect(iso(r.assignments.get("A4"))).toBe("2026-09-29");
    expect(iso(r.assignments.get("A5"))).toBe("2026-09-30");
  });

  it("falls back to one hour a day when every day is off", () => {
    const r = plan({
      playlists: [{ id: "A", deadline: far, priority: 3 }],
      videos: vids("A", 2, 60),
      weekdayMinutes: week(0),
    });
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-29");
  });

  it("prioritises the earlier deadline across playlists", () => {
    const r = plan({
      playlists: [
        { id: "late", deadline: far, priority: 3 },
        { id: "soon", deadline: d("2026-10-05"), priority: 3 },
      ],
      videos: [...vids("late", 2, 60), ...vids("soon", 2, 60)],
    });
    expect(iso(r.assignments.get("soon0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("late0"))).toBe("2026-09-30");
  });

  it("flags at-risk playlists and suggests minutes per day", () => {
    const r = plan({
      playlists: [{ id: "A", deadline: d("2026-09-29"), priority: 3 }],
      videos: vids("A", 4, 60),
    });
    expect(r.reports[0].atRisk).toBe(true);
    expect(r.reports[0].requiredMinutesPerDay).toBe(120);
  });
});

describe("interleave mode", () => {
  it("mixes playlists within the same day", () => {
    const r = plan({
      mode: "interleave",
      playlists: [
        { id: "A", deadline: far, priority: 3 },
        { id: "B", deadline: d("2027-01-01"), priority: 3 },
      ],
      videos: [...vids("A", 4, 30), ...vids("B", 4, 30)],
    });
    // 60 min/day = one video from each playlist every day
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("B0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-29");
    expect(iso(r.assignments.get("B1"))).toBe("2026-09-29");
  });
});

describe("weighted mode", () => {
  const run = (mode: ScheduleMode, pa: number, pb: number) =>
    plan({
      mode,
      weekdayMinutes: week(120),
      playlists: [
        { id: "A", deadline: far, priority: pa },
        { id: "B", deadline: d("2027-01-01"), priority: pb },
      ],
      videos: [...vids("A", 6, 30), ...vids("B", 6, 30)],
    });

  it("splits a day in proportion to priority", () => {
    const r = run("weighted", 3, 1); // 120 min: A gets 90 (3 videos), B gets 30 (1 video)
    const day1 = [...r.assignments].filter(([, day]) => iso(day) === "2026-09-28").map(([id]) => id);
    expect(day1.filter((id) => id.startsWith("A"))).toHaveLength(3);
    expect(day1.filter((id) => id.startsWith("B"))).toHaveLength(1);
  });

  it("does not starve a low-priority playlist whose videos exceed its daily slice", () => {
    const r = run("weighted", 5, 1); // B earns 20 min a day but its videos are 30 min
    // B0 is watched in a 20 min part today and its last 10 min tomorrow
    expect(r.segments.get("B0")?.map((s) => s.endSec - s.startSec)).toEqual([1200, 600]);
    expect(iso(r.assignments.get("B1"))).not.toBe(undefined);
  });

  it("gives leftover time to the earliest deadline", () => {
    const r = plan({
      mode: "weighted",
      weekdayMinutes: week(60),
      playlists: [
        { id: "A", deadline: far, priority: 1 },
        { id: "B", deadline: d("2027-01-01"), priority: 1 },
      ],
      videos: [...vids("A", 1, 20), ...vids("B", 4, 30)],
    });
    // A uses 20 of its 30-minute slice, B takes one video (30), the leftover 10 starts B1
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("B0"))).toBe("2026-09-28");
    expect(r.segments.get("B1")?.[0]).toEqual({ date: start, startSec: 0, endSec: 600 });
  });
});

describe("completionPercent", () => {
  it("handles zero totals and rounds", () => {
    expect(completionPercent(0, 0)).toBe(0);
    expect(completionPercent(1, 3)).toBe(33.3);
  });
});
