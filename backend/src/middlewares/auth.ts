import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Missing bearer token");
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as jwt.JwtPayload;
    req.userId = String(payload.sub);
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  next();
};
