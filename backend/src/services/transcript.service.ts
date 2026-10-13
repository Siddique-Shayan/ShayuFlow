import { fetchTranscript, YoutubeTranscriptTooManyRequestError } from "youtube-transcript";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

// Keeps a single request well inside the free-tier token limits.
const MAX_CHARS = 150_000;
// Captions are merged into lines of about this many seconds for the timestamped transcript.
export const LINE_SECONDS = 30;

export interface TranscriptLine {
  startSec: number;
  text: string;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The library reports offsets in milliseconds for srv3 captions and in seconds for classic ones.
 * Offsets past the end of the video (or any whole-number-only track when the duration is unknown) are milliseconds.
 */
const offsetsInMs = (offsets: number[], durationSec: number) => {
  const max = Math.max(0, ...offsets);
  if (durationSec > 0) return max > durationSec + 60;
  return offsets.every(Number.isInteger) && max > 10_000;
};

export const formatTimestamp = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const load = async (youtubeVideoId: string) => {
  try {
    return await fetchTranscript(youtubeVideoId);
  } catch (err) {
    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      throw new AppError(503, "YouTube is rate limiting transcript requests. Try again later.");
    }
    logger.warn(`No transcript for ${youtubeVideoId}`, err instanceof Error ? err.message : err);
    throw new AppError(422, "This video has no captions available to summarise.");
  }
};

export const transcriptService = {
  /** Captions merged into ~30 second lines with their start time, capped at the same size as `fetch`. */
  async lines(youtubeVideoId: string, durationSec = 0): Promise<TranscriptLine[]> {
    const parts = await load(youtubeVideoId);
    const scale = offsetsInMs(parts.map((p) => p.offset), durationSec) ? 1000 : 1;

    const lines: TranscriptLine[] = [];
    let chars = 0;
    for (const part of parts) {
      const text = clean(part.text);
      if (!text) continue;
      if (chars + text.length > MAX_CHARS) break;
      chars += text.length + 1;
      const startSec = part.offset / scale;
      const last = lines.at(-1);
      if (last && startSec - last.startSec < LINE_SECONDS) last.text += ` ${text}`;
      else lines.push({ startSec, text });
    }
    if (!lines.length) throw new AppError(422, "This video has no captions available to summarise.");
    return lines;
  },

  async fetch(youtubeVideoId: string): Promise<string> {
    return toPlainText(await this.lines(youtubeVideoId));
  },
};

export const toPlainText = (lines: TranscriptLine[]) => lines.map((l) => l.text).join(" ");

export const toTimestamped = (lines: TranscriptLine[]) =>
  lines.map((l) => `[${formatTimestamp(l.startSec)}] ${l.text}`).join("\n");
