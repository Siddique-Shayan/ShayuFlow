import { User } from "../models/User.js";

export const userRepository = {
  findById: (id: string) => User.findById(id),
  findByEmailWithPassword: (email: string) =>
    User.findOne({ email: email.toLowerCase() }).select("+passwordHash"),
  findByGoogleId: (googleId: string) => User.findOne({ googleId }),
  findByEmail: (email: string) => User.findOne({ email: email.toLowerCase() }).select("+googleId"),
  create: (data: { name: string; email: string; passwordHash?: string; googleId?: string; avatarUrl?: string }) =>
    User.create(data),
  update: (id: string, data: Record<string, unknown>) =>
    User.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
};
