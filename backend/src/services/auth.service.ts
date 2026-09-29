import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";

const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    if (await userRepository.findByEmailWithPassword(input.email)) {
      throw new AppError(409, "Email already registered");
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return { token: signToken(user.id), user: await userRepository.findById(user.id) };
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmailWithPassword(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, "Invalid email or password");
    }
    return { token: signToken(user.id), user: await userRepository.findById(user.id) };
  },
};
