import { Friendship } from "../models/Friendship.js";
import { User } from "../models/User.js";
import { videoRepository } from "../repositories/video.repository.js";
import { AppError } from "../utils/AppError.js";
import { planService } from "./plan.service.js";
import { playlistService } from "./playlist.service.js";
import { startOfDay } from "./planner.service.js";

const DAY_MS = 86_400_000;

const publicProfile = (u: { _id: unknown; name: string; avatarUrl: string; bio: string }) => ({
  _id: String(u._id),
  name: u.name,
  avatarUrl: u.avatarUrl,
  bio: u.bio,
});

/** What a buddy can see: overall progress, streak and today's study time. */
const progressOf = async (userId: string) => {
  const today = startOfDay(new Date());
  const [stats, doneToday] = await Promise.all([
    planService.stats(userId),
    videoRepository.listCompletedBetween(userId, today, new Date(today.getTime() + DAY_MS)),
  ]);
  return {
    ...stats,
    studiedTodayMinutes: Math.round(doneToday.reduce((s, v) => s + v.durationSec, 0) / 60),
  };
};

const findAccepted = async (userId: string, friendshipId: string) => {
  const f = await Friendship.findOne({
    _id: friendshipId,
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  });
  if (!f) throw new AppError(404, "Friend not found");
  return f;
};

const otherSide = (f: { requester: unknown; recipient: unknown }, userId: string) =>
  String(f.requester) === userId ? String(f.recipient) : String(f.requester);

export const friendService = {
  async list(userId: string) {
    const rows = await Friendship.find({ $or: [{ requester: userId }, { recipient: userId }] }).sort({
      updatedAt: -1,
    });
    const ids = rows.map((r) => otherSide(r, userId));
    const users = await User.find({ _id: { $in: ids } }).select("name avatarUrl bio");
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const shape = (r: (typeof rows)[number]) => ({
      friendshipId: String(r._id),
      user: publicProfile(byId.get(otherSide(r, userId))!),
    });
    const valid = rows.filter((r) => byId.has(otherSide(r, userId)));

    const friends = await Promise.all(
      valid
        .filter((r) => r.status === "accepted")
        .map(async (r) => ({ ...shape(r), progress: await progressOf(otherSide(r, userId)) })),
    );
    return {
      friends,
      incoming: valid.filter((r) => r.status === "pending" && String(r.recipient) === userId).map(shape),
      outgoing: valid.filter((r) => r.status === "pending" && String(r.requester) === userId).map(shape),
    };
  },

  async request(userId: string, email: string) {
    const target = await User.findOne({ email: email.toLowerCase() });
    if (!target) throw new AppError(404, "No account with that email");
    if (String(target._id) === userId) throw new AppError(400, "You can't add yourself");

    const existing = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: target._id },
        { requester: target._id, recipient: userId },
      ],
    });
    if (existing) {
      // They already asked us, so asking back just accepts.
      if (existing.status === "pending" && String(existing.recipient) === userId) {
        existing.status = "accepted";
        await existing.save();
        return { friendshipId: String(existing._id), status: "accepted" as const };
      }
      throw new AppError(409, existing.status === "accepted" ? "Already friends" : "Request already sent");
    }
    const created = await Friendship.create({ requester: userId, recipient: target._id });
    return { friendshipId: String(created._id), status: "pending" as const };
  },

  async accept(userId: string, friendshipId: string) {
    const f = await Friendship.findOne({ _id: friendshipId, recipient: userId, status: "pending" });
    if (!f) throw new AppError(404, "Request not found");
    f.status = "accepted";
    await f.save();
  },

  /** Declines a request, cancels one you sent, or removes a friend. */
  async remove(userId: string, friendshipId: string) {
    const f = await Friendship.findOneAndDelete({
      _id: friendshipId,
      $or: [{ requester: userId }, { recipient: userId }],
    });
    if (!f) throw new AppError(404, "Friend not found");
  },

  async detail(userId: string, friendshipId: string) {
    const f = await findAccepted(userId, friendshipId);
    const friendId = otherSide(f, userId);
    const user = await User.findById(friendId).select("name avatarUrl bio");
    if (!user) throw new AppError(404, "Friend not found");

    const playlists = await playlistService.list(friendId);
    return {
      user: publicProfile(user),
      progress: await progressOf(friendId),
      playlists: playlists.map((p) => ({
        _id: String(p._id),
        title: p.title,
        channel: p.channel,
        thumbnail: p.thumbnail,
        deadline: p.deadline,
        status: p.status,
        videoCount: p.videoCount,
        completedCount: p.completedCount,
        completedPercent: p.completedPercent,
      })),
    };
  },
};
