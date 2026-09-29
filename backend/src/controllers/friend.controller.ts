import type { Request, Response } from "express";
import { friendService } from "../services/friend.service.js";

const id = (req: Request) => String(req.params.id);

export const friendController = {
  async list(req: Request, res: Response) {
    res.json(await friendService.list(req.userId));
  },

  async request(req: Request, res: Response) {
    res.status(201).json(await friendService.request(req.userId, req.body.email));
  },

  async accept(req: Request, res: Response) {
    await friendService.accept(req.userId, id(req));
    res.status(204).end();
  },

  async remove(req: Request, res: Response) {
    await friendService.remove(req.userId, id(req));
    res.status(204).end();
  },

  async detail(req: Request, res: Response) {
    res.json(await friendService.detail(req.userId, id(req)));
  },
};
