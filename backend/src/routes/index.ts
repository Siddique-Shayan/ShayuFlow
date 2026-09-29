import { Router } from "express";
import { z } from "zod";
import { authController } from "../controllers/auth.controller.js";
import { friendController } from "../controllers/friend.controller.js";
import { planController } from "../controllers/plan.controller.js";
import { playlistController } from "../controllers/playlist.controller.js";
import { videoController } from "../controllers/video.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const priority = z.number().int().min(1).max(5);

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    bio: z.string().max(500),
    avatarUrl: z.string().max(500),
    weekdayMinutes: z.array(z.number().int().min(0).max(1440)).length(7),
    scheduleMode: z.enum(["deadline", "interleave", "weighted"]),
    timezone: z.string().max(64),
    backlogPreference: z.enum(["ask", "spread", "increase", "extend"]),
  })
  .partial()
  .strict();
const addPlaylistSchema = z.object({
  url: z.string().min(1),
  deadline: z.coerce.date(),
  priority: priority.optional(),
});
const updatePlaylistSchema = z
  .object({ deadline: z.coerce.date(), priority })
  .partial()
  .strict()
  .refine((v) => v.deadline || v.priority, "Provide a deadline or a priority");
const reorderSchema = z.object({ videoIds: z.array(z.string()).min(1) });
const completeSchema = z.object({ completed: z.boolean().default(true) });
const videoPatchSchema = z
  .object({ note: z.string().max(5000), skipped: z.boolean() })
  .partial()
  .strict();
const recalcSchema = z.object({ strategy: z.enum(["spread", "increase", "extend"]) });
const friendRequestSchema = z.object({ email: z.email() });

const router = Router();

router.post("/auth/register", validate(registerSchema), authController.register);
router.post("/auth/login", validate(loginSchema), authController.login);

router.use(requireAuth);

router.get("/users/me", authController.me);
router.patch("/users/me", validate(profileSchema), authController.updateMe);

router.post("/playlists", validate(addPlaylistSchema), playlistController.add);
router.get("/playlists", playlistController.list);
router.get("/playlists/:id", playlistController.detail);
router.patch("/playlists/:id", validate(updatePlaylistSchema), playlistController.update);
router.put("/playlists/:id/order", validate(reorderSchema), playlistController.reorder);
router.delete("/playlists/:id", playlistController.remove);

router.patch("/videos/:id/complete", validate(completeSchema), videoController.setCompleted);
router.patch("/videos/:id", validate(videoPatchSchema), videoController.update);

router.get("/plan/today", planController.today);
router.get("/plan/backlog", planController.backlog);
router.get("/plan", planController.range);
router.post("/plan/recalculate", validate(recalcSchema), planController.recalculate);

router.get("/stats", planController.stats);
router.get("/summary/weekly", planController.weeklySummary);

router.get("/friends", friendController.list);
router.post("/friends/requests", validate(friendRequestSchema), friendController.request);
router.post("/friends/:id/accept", friendController.accept);
router.get("/friends/:id", friendController.detail);
router.delete("/friends/:id", friendController.remove);

export default router;
