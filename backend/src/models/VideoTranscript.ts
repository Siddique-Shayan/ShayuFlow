import { model, Schema, type InferSchemaType } from "mongoose";

// Transcript cache keyed by YouTube video id, shared by every user, so a video is fetched or transcribed once.
const videoTranscriptSchema = new Schema(
  {
    youtubeVideoId: { type: String, required: true, unique: true },
    // "captions": YouTube's captions. "gemini": transcribed by the model when captions are blocked or missing.
    source: { type: String, enum: ["captions", "gemini"], required: true },
    lines: {
      type: [new Schema({ startSec: { type: Number, required: true }, text: { type: String, required: true } }, { _id: false })],
      default: [],
    },
  },
  { timestamps: true },
);

export type VideoTranscriptDoc = InferSchemaType<typeof videoTranscriptSchema>;
export const VideoTranscript = model("VideoTranscript", videoTranscriptSchema);
