import { model, Schema, type InferSchemaType } from "mongoose";

// Shared cache keyed by YouTube video id: a video is summarised once for all users.
const videoSummarySchema = new Schema(
  {
    youtubeVideoId: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    keyPoints: { type: [String], default: [] },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

export type VideoSummaryDoc = InferSchemaType<typeof videoSummarySchema>;
export const VideoSummary = model("VideoSummary", videoSummarySchema);
