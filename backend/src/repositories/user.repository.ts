import { User } from "../models/User.js";

export const userRepository = {
  findById: (id: string) => User.findById(id),
  findByEmailWithPassword: (email: string) =>
    User.findOne({ email: email.toLowerCase() }).select("+passwordHash"),
  create: (data: { name: string; email: string; passwordHash: string }) => User.create(data),
  update: (id: string, data: Record<string, unknown>) =>
    User.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
};
