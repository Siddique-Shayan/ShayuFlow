import type { Request, Response } from "express";
import { aiService } from "../services/ai.service.js";
import { askMafiaService } from "../services/askMafia.service.js";
import { videoService } from "../services/video.service.js";
import { videoSummaryService } from "../services/videoSummary.service.js";

export const videoController = {
  async get(req: Request, res: Response) {
    res.json(await videoService.get(req.userId, String(req.params.id)));
  },

  async setCompleted(req: Request, res: Response) {
    res.json({
      video: await videoService.setCompleted(req.userId, String(req.params.id), req.body.completed),
    });
  },

  async update(req: Request, res: Response) {
    res.json({ video: await videoService.update(req.userId, String(req.params.id), req.body) });
  },

  aiStatus(_req: Request, res: Response) {
    res.json({ enabled: aiService.enabled });
  },

  async getSummary(req: Request, res: Response) {
    res.json({ summary: await videoSummaryService.get(req.userId, String(req.params.id)) });
  },

  async generateSummary(req: Request, res: Response) {
    res.json({ summary: await videoSummaryService.generate(req.userId, String(req.params.id)) });
  },

  async getChat(req: Request, res: Response) {
    res.json(await askMafiaService.get(req.userId, String(req.params.id)));
  },

  async buildKnowledge(req: Request, res: Response) {
    res.json(await askMafiaService.build(req.userId, String(req.params.id)));
  },

  async ask(req: Request, res: Response) {
    res.json(await askMafiaService.ask(req.userId, String(req.params.id), req.body.question));
  },

  async clearChat(req: Request, res: Response) {
    await askMafiaService.clear(req.userId, String(req.params.id));
    res.status(204).end();
  },
};
