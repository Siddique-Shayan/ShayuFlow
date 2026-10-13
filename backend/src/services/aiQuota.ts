import { AiUsage } from "../models/AiUsage.js";
import { AppError } from "../utils/AppError.js";

const today = () => new Date().toISOString().slice(0, 10);

/** How many uses of `field` the user has left today. */
export const remainingQuota = async (userId: string, field: "count" | "chatCount", limit: number) => {
  const usage = await AiUsage.findOne({ userId, day: today() }, { [field]: 1 }).lean();
  return Math.max(0, limit - Number(usage?.[field] ?? 0));
};

/**
 * Reserves one use of `field` for the user today, or throws once `limit` is reached.
 * Returns a function that gives the use back, for attempts that fail.
 */
export const reserveQuota = async (
  userId: string,
  field: "count" | "chatCount",
  limit: number,
  limitMessage: string,
) => {
  const day = today();
  await AiUsage.updateOne({ userId, day }, { $setOnInsert: { count: 0, chatCount: 0 } }, { upsert: true }).catch(
    (err) => {
      if (err?.code !== 11000) throw err; // lost a race with a parallel first request
    },
  );
  // Documents created before chatCount existed have no such field; treat it as zero.
  const reserved = await AiUsage.findOneAndUpdate(
    { userId, day, $or: [{ [field]: { $lt: limit } }, { [field]: { $exists: false } }] },
    { $inc: { [field]: 1 } },
  );
  if (!reserved) throw new AppError(429, limitMessage);
  return () => AiUsage.updateOne({ userId, day }, { $inc: { [field]: -1 } });
};
