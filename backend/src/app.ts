import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

// Rate limiting is handled by nginx in front of this service.
export const app = express();

// NGINX sits in front of this service, so trust its X-Forwarded-* headers for the client IP.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);
