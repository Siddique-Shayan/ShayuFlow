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

  it("gives an over-budget video its own day", () => {
    const r = plan({ playlists: [{ id: "A", deadline: far, priority: 3 }], videos: vids("A", 2, 90) });
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("A1"))).toBe("2026-09-29");
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
    expect(iso(r.assignments.get("B0"))).toBe("2026-09-29");
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
    // A uses 20 of its 30-minute slice, B takes one video (30), the leftover 10 fits nothing
    expect(iso(r.assignments.get("A0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("B0"))).toBe("2026-09-28");
    expect(iso(r.assignments.get("B1"))).toBe("2026-09-29");
  });
});

describe("completionPercent", () => {
  it("handles zero totals and rounds", () => {
    expect(completionPercent(0, 0)).toBe(0);
    expect(completionPercent(1, 3)).toBe(33.3);
  });
});
