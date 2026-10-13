import { fetchTranscript, YoutubeTranscriptTooManyRequestError } from "youtube-transcript";
import { VideoTranscript } from "../models/VideoTranscript.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { aiService } from "./ai.service.js";

// Keeps a single request well inside the free-tier token limits.
const MAX_CHARS = 150_000;
// Captions are merged into lines of about this many seconds for the timestamped transcript.
export const LINE_SECONDS = 30;
// Gemini transcribes long videos in chunks of this length, a few at a time, to stay within token limits.
const CHUNK_SECONDS = 10 * 60;
const SINGLE_CALL_MAX_SECONDS = 12 * 60;
const PARALLEL_CHUNKS = 4;

export interface TranscriptLine {
  startSec: number;
  text: string;
}

const NO_CAPTIONS = "This video has no captions available to summarise.";

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

/** Merges short segments into ~30 second lines, capped at MAX_CHARS. */
export const mergeLines = (parts: TranscriptLine[]): TranscriptLine[] => {
  const lines: TranscriptLine[] = [];
  let chars = 0;
  for (const part of parts) {
    const text = clean(part.text);
    if (!text) continue;
    if (chars + text.length > MAX_CHARS) break;
    chars += text.length + 1;
    const last = lines.at(-1);
    if (last && part.startSec - last.startSec < LINE_SECONDS) last.text += ` ${text}`;
    else lines.push({ startSec: part.startSec, text });
  }
  return lines;
};

/** YouTube's own captions. Fails on cloud servers, where YouTube blocks these requests. */
const fromCaptions = async (youtubeVideoId: string, durationSec: number): Promise<TranscriptLine[]> => {
  const parts = await fetchTranscript(youtubeVideoId);
  const scale = offsetsInMs(parts.map((p) => p.offset), durationSec) ? 1000 : 1;
  return mergeLines(parts.map((p) => ({ startSec: p.offset / scale, text: p.text })));
};

/** If the model answered relative to the chunk instead of the whole video, shift it into place. */
export const alignChunk = (lines: TranscriptLine[], startSec: number, endSec: number): TranscriptLine[] => {
  if (!startSec || !lines.length) return lines;
  const relative = lines.every((l) => l.startSec <= endSec - startSec + 5) && lines[0].startSec < startSec - 30;
  return relative ? lines.map((l) => ({ ...l, startSec: l.startSec + startSec })) : lines;
};

/** Gemini transcription from the YouTube URL, chunked for long videos. */
const fromGemini = async (youtubeVideoId: string, durationSec: number): Promise<TranscriptLine[]> => {
  if (!durationSec || durationSec <= SINGLE_CALL_MAX_SECONDS) {
    return mergeLines(await aiService.transcribeYoutube(youtubeVideoId));
  }

  const ranges: { startSec: number; endSec: number }[] = [];
  for (let start = 0; start < durationSec; start += CHUNK_SECONDS) {
    ranges.push({ startSec: start, endSec: Math.min(durationSec, start + CHUNK_SECONDS) });
  }
  const chunks: TranscriptLine[][] = new Array(ranges.length);
  for (let i = 0; i < ranges.length; i += PARALLEL_CHUNKS) {
    await Promise.all(
      ranges.slice(i, i + PARALLEL_CHUNKS).map(async (r, j) => {
        chunks[i + j] = alignChunk(await aiService.transcribeYoutube(youtubeVideoId, r), r.startSec, r.endSec);
      }),
    );
  }
  return mergeLines(chunks.flat().sort((a, b) => a.startSec - b.startSec));
};

export const transcriptService = {
  /**
   * Timestamped transcript lines for a video: cached copy, else YouTube captions, else Gemini transcription.
   * The result is cached for every user.
   */
  async lines(youtubeVideoId: string, durationSec = 0): Promise<TranscriptLine[]> {
    const cached = await VideoTranscript.findOne({ youtubeVideoId }).lean();
    if (cached?.lines.length) return cached.lines;

    let lines: TranscriptLine[] = [];
    let source: "captions" | "gemini" = "captions";
    try {
      lines = await fromCaptions(youtubeVideoId, durationSec);
    } catch (err) {
      const reason = err instanceof YoutubeTranscriptTooManyRequestError ? "rate limited" : err instanceof Error ? err.message : err;
      logger.warn(`No YouTube captions for ${youtubeVideoId}`, reason);
    }

    if (!lines.length) {
      if (!aiService.enabled) throw new AppError(422, NO_CAPTIONS);
      logger.info(`Transcribing ${youtubeVideoId} with Gemini (${durationSec}s)`);
      source = "gemini";
      lines = await fromGemini(youtubeVideoId, durationSec);
      if (!lines.length) throw new AppError(422, "No speech was found in this video to summarise.");
    }

    await VideoTranscript.updateOne({ youtubeVideoId }, { $setOnInsert: { source, lines } }, { upsert: true });
    return lines;
  },

  async fetch(youtubeVideoId: string, durationSec = 0): Promise<string> {
    return toPlainText(await this.lines(youtubeVideoId, durationSec));
  },
};

export const toPlainText = (lines: TranscriptLine[]) => lines.map((l) => l.text).join(" ");

export const toTimestamped = (lines: TranscriptLine[]) =>
  lines.map((l) => `[${formatTimestamp(l.startSec)}] ${l.text}`).join("\n");
