import type { HydratedDocument } from "mongoose";
import type { PlaylistDoc } from "../models/Playlist.js";
import { playlistRepository } from "../repositories/playlist.repository.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import { replan } from "./plan.service.js";
import { completionPercent } from "./planner.service.js";
import { parsePlaylistId, youtubeService } from "./youtube.service.js";

type VideoLike = { playlistId: unknown; durationSec: number; completed: boolean; skipped: boolean };

/** Progress ignores skipped videos, so skipping never drags the percentage down. */
export const withProgress = (playlist: HydratedDocument<PlaylistDoc>, videos: VideoLike[]) => {
  const mine = videos.filter((v) => String(v.playlistId) === String(playlist._id));
  const counted = mine.filter((v) => !v.skipped);
  const totalSec = counted.reduce((s, v) => s + v.durationSec, 0);
  const doneSec = counted.filter((v) => v.completed).reduce((s, v) => s + v.durationSec, 0);
  return {
    ...playlist.toObject(),
    totalDurationSec: totalSec,
    videoCount: counted.length,
    completedCount: counted.filter((v) => v.completed).length,
    skippedCount: mine.length - counted.length,
    completedPercent: completionPercent(doneSec, totalSec),
  };
};

export const playlistService = {
  async add(userId: string, input: { url: string; deadline: Date; priority?: number }) {
    const youtubePlaylistId = parsePlaylistId(input.url);
    if (!youtubePlaylistId) throw new AppError(400, "Could not find a playlist id in that URL");
    if (await playlistRepository.findByYoutubeId(userId, youtubePlaylistId)) {
      throw new AppError(409, "You already added this playlist");
    }

    const { playlist, videos } = await youtubeService.fetchPlaylist(youtubePlaylistId);
    if (videos.length === 0) throw new AppError(422, "This playlist has no playable videos");

    const created = await playlistRepository.create({
      userId,
      youtubePlaylistId,
      title: playlist.title,
      channel: playlist.channel,
      thumbnail: playlist.thumbnail,
      deadline: input.deadline,
      priority: input.priority ?? 3,
      totalDurationSec: videos.reduce((s, v) => s + v.durationSec, 0),
    });
    await videoRepository.insertMany(
      videos.map((v) => ({ ...v, playlistId: created._id, userId })),
    );

    const reports = await replan(userId);
    const fresh = await videoRepository.listByPlaylist(String(created._id), userId);
    return { playlist: withProgress(created, fresh), reports };
  },

  async list(userId: string) {
    const [playlists, videos] = await Promise.all([
      playlistRepository.listByUser(userId),
      videoRepository.listByUser(userId),
    ]);
    return playlists.map((p) => withProgress(p, videos));
  },

  async detail(userId: string, id: string) {
    const playlist = await playlistRepository.findOwned(id, userId);
    if (!playlist) throw new AppError(404, "Playlist not found");
    const videos = await videoRepository.listByPlaylist(id, userId);
    return { playlist: withProgress(playlist, videos), videos };
  },

  async update(userId: string, id: string, patch: { deadline?: Date; priority?: number }) {
    const playlist = await playlistRepository.findOwned(id, userId);
    if (!playlist) throw new AppError(404, "Playlist not found");
    if (patch.deadline) playlist.deadline = patch.deadline;
    if (patch.priority) playlist.priority = patch.priority;
    await playlist.save();
    return { playlist, reports: await replan(userId) };
  },

  /** Sets the watch order of a playlist. `videoIds` must list every video exactly once. */
  async reorder(userId: string, id: string, videoIds: string[]) {
    const playlist = await playlistRepository.findOwned(id, userId);
    if (!playlist) throw new AppError(404, "Playlist not found");

    const current = await videoRepository.listByPlaylist(id, userId);
    const known = new Set(current.map((v) => String(v._id)));
    if (videoIds.length !== known.size || new Set(videoIds).size !== known.size || !videoIds.every((v) => known.has(v))) {
      throw new AppError(400, "videoIds must contain every video of the playlist exactly once");
    }
    await videoRepository.setPositions(videoIds);
    await replan(userId);
    return this.detail(userId, id);
  },

  async remove(userId: string, id: string) {
    const deleted = await playlistRepository.deleteWithVideos(id, userId);
    if (!deleted) throw new AppError(404, "Playlist not found");
    await replan(userId);
  },
};
