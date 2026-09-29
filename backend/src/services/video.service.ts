import type { Types } from "mongoose";
import { Playlist } from "../models/Playlist.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import { replan } from "./plan.service.js";

const syncPlaylistStatus = async (playlistId: Types.ObjectId) => {
  const remaining = await videoRepository.countRemaining(playlistId);
  await Playlist.updateOne({ _id: playlistId }, { status: remaining === 0 ? "completed" : "active" });
};

export const videoService = {
  async setCompleted(userId: string, id: string, completed: boolean) {
    const video = await videoRepository.findOwned(id, userId);
    if (!video) throw new AppError(404, "Video not found");

    video.completed = completed;
    video.completedAt = completed ? new Date() : null;
    await video.save();
    await syncPlaylistStatus(video.playlistId);

    // Un-completing a video puts it back in the queue, so the plan must be rebuilt.
    if (!completed) await replan(userId);
    return video;
  },

  async update(userId: string, id: string, patch: { note?: string; skipped?: boolean }) {
    const video = await videoRepository.findOwned(id, userId);
    if (!video) throw new AppError(404, "Video not found");

    const skipChanged = patch.skipped !== undefined && patch.skipped !== video.skipped;
    if (patch.note !== undefined) video.note = patch.note;
    if (patch.skipped !== undefined) {
      video.skipped = patch.skipped;
      if (patch.skipped) video.scheduledDate = null;
    }
    await video.save();

    if (skipChanged) {
      await syncPlaylistStatus(video.playlistId);
      await replan(userId);
    }
    return video;
  },
};
