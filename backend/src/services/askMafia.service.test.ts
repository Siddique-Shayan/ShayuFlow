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
