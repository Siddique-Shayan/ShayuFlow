import { model, Schema, type InferSchemaType } from "mongoose";

// One AskMafia conversation per user per video. Keyed by YouTube id so it survives re-adding a playlist.
const videoChatSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    youtubeVideoId: { type: String, required: true },
    messages: {
      type: [
        new Schema(
          {
            role: { type: String, enum: ["user", "assistant"], required: true },
            content: { type: String, required: true }, // the question, or the answer's main text
            createdAt: { type: Date, default: Date.now },
            // Structured extras on assistant messages; absent on questions.
            details: {
              type: new Schema(
                {
                  covered: { type: Boolean, default: true },
                  points: { type: [String], default: [] },
                  moments: {
                    type: [new Schema({ sec: Number, label: String }, { _id: false })],
                    default: [],
                  },
                  followUps: { type: [String], default: [] },
                },
                { _id: false },
              ),
              default: undefined,
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);
videoChatSchema.index({ userId: 1, youtubeVideoId: 1 }, { unique: true });

export type VideoChatDoc = InferSchemaType<typeof videoChatSchema>;
export const VideoChat = model("VideoChat", videoChatSchema);
