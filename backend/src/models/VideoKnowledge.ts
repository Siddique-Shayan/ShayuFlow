import { model, Schema, type InferSchemaType } from "mongoose";

// AskMafia's knowledge base for one video, shared by every user like VideoSummary.
// The detailed summary is copied in so the knowledge base is self-contained.
const videoKnowledgeSchema = new Schema(
  {
    youtubeVideoId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    keyPoints: { type: [String], default: [] },
    transcript: { type: String, required: true }, // "[mm:ss] text" lines
  },
  { timestamps: true },
);

export type VideoKnowledgeDoc = InferSchemaType<typeof videoKnowledgeSchema>;
export const VideoKnowledge = model("VideoKnowledge", videoKnowledgeSchema);
