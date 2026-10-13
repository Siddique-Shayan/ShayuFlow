import { describe, expect, it } from "vitest";
import { parseChatAnswer } from "./ai.service.js";
import { formatTimestamp, toTimestamped } from "./transcript.service.js";

process.env.MONGO_URI ??= "mongodb://localhost/test";
process.env.JWT_SECRET ??= "test";
const { buildSystemPrompt, NOT_COVERED, parseTimestamp, toDetails } = await import("./askMafia.service.js");

describe("formatTimestamp", () => {
  it("formats minutes and hours", () => {
    expect(formatTimestamp(5)).toBe("0:05");
    expect(formatTimestamp(754.9)).toBe("12:34");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });
});

describe("toTimestamped", () => {
  it("prefixes each line with its start time", () => {
    expect(toTimestamped([{ startSec: 0, text: "hi" }, { startSec: 65, text: "there" }])).toBe("[0:00] hi\n[1:05] there");
  });
});

describe("parseTimestamp", () => {
  it("round-trips formatted times and rejects junk", () => {
    expect(parseTimestamp("12:34")).toBe(754);
    expect(parseTimestamp("1:02:05")).toBe(3725);
    expect(parseTimestamp("around 5 minutes")).toBeNull();
  });
});

describe("parseChatAnswer", () => {
  it("strips markdown and drops malformed entries", () => {
    const parsed = parseChatAnswer({
      covered: true,
      answer: "**Graphs** have nodes",
      points: ["- one", 3 as unknown as string, ""],
      moments: [{ time: "0:10", label: "intro" }, { time: 5 } as unknown as { time: string; label: string }],
      followUps: ["a", "b", "c", "d"],
    });
    expect(parsed.answer).toBe("Graphs have nodes");
    expect(parsed.points).toEqual(["one"]);
    expect(parsed.moments).toEqual([{ time: "0:10", label: "intro" }]);
    expect(parsed.followUps).toHaveLength(3);
  });
});

describe("toDetails", () => {
  const transcript = "[0:00] welcome\n[0:31] nodes\n[5:00] edges";

  it("keeps only timestamps inside real transcript lines", () => {
    const details = toDetails(
      {
        covered: true,
        answer: "x",
        points: ["p"],
        moments: [
          { time: "0:45", label: "nodes" },
          { time: "0:45", label: "duplicate" },
          { time: "3:00", label: "invented" },
          { time: "99:99", label: "junk" },
        ],
        followUps: [],
      },
      transcript,
    );
    expect(details.moments).toEqual([{ sec: 45, label: "nodes" }]);
  });

  it("drops points and moments when the question is not covered", () => {
    const details = toDetails(
      { covered: false, answer: NOT_COVERED, points: ["p"], moments: [{ time: "0:00", label: "x" }], followUps: ["q"] },
      transcript,
    );
    expect(details).toEqual({ covered: false, points: [], moments: [], followUps: ["q"] });
  });
});

describe("buildSystemPrompt", () => {
  it("grounds the model in the knowledge base with a refusal rule", () => {
    const prompt = buildSystemPrompt({
      title: "Intro to Graphs",
      summary: "Graphs have nodes.",
      keyPoints: ["Edges connect nodes"],
      transcript: "[0:00] welcome",
    });
    expect(prompt).toContain(NOT_COVERED);
    expect(prompt).toContain("<transcript>\n[0:00] welcome\n</transcript>");
    expect(prompt).toContain("- Edges connect nodes");
    expect(prompt.indexOf("ONLY")).toBeLessThan(prompt.indexOf("<summary>"));
  });
});

describe("transcript helpers", async () => {
  const { alignChunk, mergeLines } = await import("./transcript.service.js");

  it("merges short segments into ~30 second lines", () => {
    expect(
      mergeLines([
        { startSec: 0, text: "a" },
        { startSec: 10, text: " b " },
        { startSec: 31, text: "c" },
        { startSec: 40, text: "" },
      ]),
    ).toEqual([
      { startSec: 0, text: "a b" },
      { startSec: 31, text: "c" },
    ]);
  });

  it("shifts chunk-relative timestamps into place and leaves absolute ones alone", () => {
    expect(alignChunk([{ startSec: 5, text: "x" }], 1200, 2400)).toEqual([{ startSec: 1205, text: "x" }]);
    expect(alignChunk([{ startSec: 1205, text: "x" }], 1200, 2400)).toEqual([{ startSec: 1205, text: "x" }]);
    expect(alignChunk([{ startSec: 5, text: "x" }], 0, 1200)).toEqual([{ startSec: 5, text: "x" }]);
  });
});

describe("parseQuotaError", async () => {
  const { parseQuotaError } = await import("./ai.service.js");

  it("reads quota ids and the retry delay from a Gemini 429 body", () => {
    expect(
      parseQuotaError({
        error: {
          details: [
            { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] },
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "37s" },
          ],
        },
      }),
    ).toEqual({ quotaIds: ["GenerateRequestsPerDayPerProjectPerModel-FreeTier"], retryAfterSec: 37 });
    expect(parseQuotaError(null)).toEqual({ quotaIds: [], retryAfterSec: null });
  });
});

describe("fitToDuration", async () => {
  const { fitToDuration } = await import("./transcript.service.js");

  it("scales drifted timestamps back inside the video and leaves good ones alone", () => {
    const drifted = fitToDuration([{ startSec: 0, text: "a" }, { startSec: 3114, text: "b" }], 1884);
    expect(drifted[0].startSec).toBe(0);
    expect(drifted[1].startSec).toBeCloseTo(1879, 0);
    const fine = [{ startSec: 100, text: "a" }];
    expect(fitToDuration(fine, 1884)).toBe(fine);
    expect(fitToDuration(fine, 0)).toBe(fine);
  });
});
