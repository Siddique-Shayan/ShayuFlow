import { model, Schema } from "mongoose";

// One document per user per UTC day, counting AI generations (cache misses only) and chat questions.
const aiUsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0 },
  chatCount: { type: Number, default: 0 },
  // Documents expire on their own a few days after the day they track.
  createdAt: { type: Date, default: Date.now, expires: 3 * 86_400 },
});
aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

export const AiUsage = model("AiUsage", aiUsageSchema);
