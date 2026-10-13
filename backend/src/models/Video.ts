import { model, Schema, type InferSchemaType } from "mongoose";

const videoSchema = new Schema(
  {
    playlistId: { type: Schema.Types.ObjectId, ref: "Playlist", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    youtubeVideoId: { type: String, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String, default: "" },
    durationSec: { type: Number, required: true, min: 0 },
    position: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    skipped: { type: Boolean, default: false },
    note: { type: String, default: "", maxlength: 5000 },
    scheduledDate: { type: Date, default: null }, // first study day
    // Every day the video is watched; a long video is split across days to fill each budget.
    segments: {
      type: [
        new Schema(
          {
            date: { type: Date, required: true },
            startSec: { type: Number, required: true },
            endSec: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);
videoSchema.index({ userId: 1, scheduledDate: 1 });
videoSchema.index({ userId: 1, "segments.date": 1 });
videoSchema.index({ playlistId: 1, position: 1 });

export type VideoDoc = InferSchemaType<typeof videoSchema>;
export const Video = model("Video", videoSchema);
