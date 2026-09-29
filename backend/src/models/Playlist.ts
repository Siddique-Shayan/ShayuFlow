import { model, Schema, type InferSchemaType } from "mongoose";

const playlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    youtubePlaylistId: { type: String, required: true },
    title: { type: String, required: true },
    channel: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    deadline: { type: Date, required: true },
    priority: { type: Number, default: 3, min: 1, max: 5 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    totalDurationSec: { type: Number, default: 0 },
  },
  { timestamps: true },
);
playlistSchema.index({ userId: 1, youtubePlaylistId: 1 }, { unique: true });

export type PlaylistDoc = InferSchemaType<typeof playlistSchema>;
export const Playlist = model("Playlist", playlistSchema);
