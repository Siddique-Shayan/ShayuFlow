import type { Request, Response } from "express";
import { userRepository } from "../repositories/user.repository.js";
import { authService } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";

export const authController = {
  async register(req: Request, res: Response) {
    res.status(201).json(await authService.register(req.body));
  },

  async login(req: Request, res: Response) {
    res.json(await authService.login(req.body));
  },

  async me(req: Request, res: Response) {
    const user = await userRepository.findById(req.userId);
    if (!user) throw new AppError(404, "User not found");
    res.json({ user });
  },

  async updateMe(req: Request, res: Response) {
    const user = await userRepository.update(req.userId, req.body);
    if (!user) throw new AppError(404, "User not found");
    res.json({ user });
  },
};
