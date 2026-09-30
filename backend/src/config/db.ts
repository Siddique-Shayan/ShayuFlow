import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

export const connectDb = async (): Promise<void> => {
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => logger.error("MongoDB error", err));
  await mongoose.connect(env.mongoUri);
  logger.info("MongoDB connected");
};
