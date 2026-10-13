import { env } from "../config/env.js";
import { VideoSummary } from "../models/VideoSummary.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import { aiService, cleanSummary } from "./ai.service.js";
import { reserveQuota } from "./aiQuota.js";
import { transcriptService } from "./transcript.service.js";

/** Reserves one generation for the user today, or throws once the daily cap is reached. */
const reserveSummaryQuota = (userId: string) =>
  reserveQuota(
    userId,
    "count",
    env.aiDailyLimit,
    `Daily AI limit reached (${env.aiDailyLimit} new summaries). Try again tomorrow.`,
  );

export const videoSummaryService = {
  async get(userId: string, videoId: string) {
    const video = await videoRepository.findOwned(videoId, userId);
    if (!video) throw new AppError(404, "Video not found");
    const cached = await VideoSummary.findOne({ youtubeVideoId: video.youtubeVideoId });
    return cached ? cleanSummary({ summary: cached.summary, keyPoints: cached.keyPoints }) : null;
  },

  /** `transcript` lets a caller that already fetched the captions avoid a second request to YouTube. */
  async generate(userId: string, videoId: string, transcript?: string) {
    if (!aiService.enabled) throw new AppError(503, "AI summaries are not configured");
    const video = await videoRepository.findOwned(videoId, userId);
    if (!video) throw new AppError(404, "Video not found");

    const cached = await VideoSummary.findOne({ youtubeVideoId: video.youtubeVideoId });
    if (cached) return cleanSummary({ summary: cached.summary, keyPoints: cached.keyPoints });

    const release = await reserveSummaryQuota(userId);
    try {
      const text = transcript ?? (await transcriptService.fetch(video.youtubeVideoId));
      const result = await aiService.summarize(video.title, text);
      await VideoSummary.updateOne(
        { youtubeVideoId: video.youtubeVideoId },
        { $setOnInsert: { ...result, model: aiService.model } },
        { upsert: true },
      );
      return result;
    } catch (err) {
      await release(); // failed attempts do not count against the user's quota
      throw err;
    }
  },
};
