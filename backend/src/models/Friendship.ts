import { model, Schema, type InferSchemaType } from "mongoose";

const friendshipSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "accepted"], default: "pending" },
  },
  { timestamps: true },
);
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export type FriendshipDoc = InferSchemaType<typeof friendshipSchema>;
export const Friendship = model("Friendship", friendshipSchema);
