import type { Request, Response } from "express";
import { planService } from "../services/plan.service.js";
import { summaryService } from "../services/summary.service.js";
import { AppError } from "../utils/AppError.js";

export const planController = {
  async today(req: Request, res: Response) {
    res.json({ videos: await planService.today(req.userId) });
  },

  async range(req: Request, res: Response) {
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError(400, "from and to must be valid dates (YYYY-MM-DD)");
    }
    res.json({ videos: await planService.range(req.userId, from, to) });
  },

  async backlog(req: Request, res: Response) {
    res.json(await planService.backlog(req.userId));
  },

  async recalculate(req: Request, res: Response) {
    res.json({ reports: await planService.recalculate(req.userId, req.body.strategy) });
  },

  async stats(req: Request, res: Response) {
    res.json(await planService.stats(req.userId));
  },

  async weeklySummary(req: Request, res: Response) {
    const offset = Number(req.query.offset ?? 0);
    if (!Number.isInteger(offset) || offset > 0 || offset < -52) {
      throw new AppError(400, "offset must be an integer between -52 and 0");
    }
    res.json(await summaryService.weekly(req.userId, offset));
  },
};
