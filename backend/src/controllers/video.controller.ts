import type { Request, Response } from "express";
import { videoService } from "../services/video.service.js";

export const videoController = {
  async setCompleted(req: Request, res: Response) {
    res.json({
      video: await videoService.setCompleted(req.userId, String(req.params.id), req.body.completed),
    });
  },

  async update(req: Request, res: Response) {
    res.json({ video: await videoService.update(req.userId, String(req.params.id), req.body) });
  },
};
