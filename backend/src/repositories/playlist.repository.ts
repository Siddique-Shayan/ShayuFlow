import { Playlist } from "../models/Playlist.js";
import { Video } from "../models/Video.js";

export const playlistRepository = {
  listByUser: (userId: string) => Playlist.find({ userId }).sort({ deadline: 1 }),
  listActiveByUser: (userId: string) => Playlist.find({ userId, status: "active" }),
  findOwned: (id: string, userId: string) => Playlist.findOne({ _id: id, userId }),
  findByYoutubeId: (userId: string, youtubePlaylistId: string) =>
    Playlist.findOne({ userId, youtubePlaylistId }),
  create: (data: Record<string, unknown>) => Playlist.create(data),
  deleteWithVideos: async (id: string, userId: string) => {
    const deleted = await Playlist.findOneAndDelete({ _id: id, userId });
    if (deleted) await Video.deleteMany({ playlistId: id });
    return deleted;
  },
};
