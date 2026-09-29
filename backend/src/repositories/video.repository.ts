import type { Types } from "mongoose";
import { Video } from "../models/Video.js";

export const videoRepository = {
  insertMany: (docs: Record<string, unknown>[]) => Video.insertMany(docs),
  findOwned: (id: string, userId: string) => Video.findOne({ _id: id, userId }),
  listByPlaylist: (playlistId: string, userId: string) =>
    Video.find({ playlistId, userId }).sort({ position: 1 }),
  listByUser: (userId: string) => Video.find({ userId }),
  /** Videos that still need to be scheduled: not done and not skipped. */
  listIncomplete: (userId: string) => Video.find({ userId, completed: false, skipped: { $ne: true } }),
  countRemaining: (playlistId: Types.ObjectId | string) =>
    Video.countDocuments({ playlistId, completed: false, skipped: { $ne: true } }),
  listScheduledBetween: (userId: string, from: Date, to: Date) =>
    Video.find({
      userId,
      completed: false,
      skipped: { $ne: true },
      scheduledDate: { $gte: from, $lte: to },
    }).sort({ scheduledDate: 1, position: 1 }),
  listBacklog: (userId: string, before: Date) =>
    Video.find({
      userId,
      completed: false,
      skipped: { $ne: true },
      scheduledDate: { $lt: before },
    }).sort({ scheduledDate: 1 }),
  listCompletedBetween: (userId: string, from: Date, to: Date) =>
    Video.find({ userId, completed: true, completedAt: { $gte: from, $lt: to } }),
  setSchedule: (updates: { id: string; date: Date }[]) =>
    updates.length
      ? Video.bulkWrite(
          updates.map((u) => ({
            updateOne: { filter: { _id: u.id }, update: { $set: { scheduledDate: u.date } } },
          })),
        )
      : Promise.resolve(null),
  setPositions: (orderedIds: string[]) =>
    Video.bulkWrite(
      orderedIds.map((id, position) => ({
        updateOne: { filter: { _id: id }, update: { $set: { position } } },
      })),
    ),
};
