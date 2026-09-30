import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  } else if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: "Invalid id" });
  } else if (err?.code === 11000) {
    res.status(409).json({ message: "Already exists" });
  } else {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ message: "Internal server error" });
  }
};
