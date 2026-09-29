import type { Request, Response } from "express";
import { playlistService } from "../services/playlist.service.js";

const id = (req: Request) => String(req.params.id);

export const playlistController = {
  async add(req: Request, res: Response) {
    res.status(201).json(await playlistService.add(req.userId, req.body));
  },

  async list(req: Request, res: Response) {
    res.json({ playlists: await playlistService.list(req.userId) });
  },

  async detail(req: Request, res: Response) {
    res.json(await playlistService.detail(req.userId, id(req)));
  },

  async update(req: Request, res: Response) {
    res.json(await playlistService.update(req.userId, id(req), req.body));
  },

  async reorder(req: Request, res: Response) {
    res.json(await playlistService.reorder(req.userId, id(req), req.body.videoIds));
  },

  async remove(req: Request, res: Response) {
    await playlistService.remove(req.userId, id(req));
    res.status(204).end();
  },
};
