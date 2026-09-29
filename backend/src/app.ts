import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

// The production image copies the built frontend into ./public. In development it is empty.
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const indexHtml = path.join(publicDir, "index.html");
const servesFrontend = fs.existsSync(indexHtml);

// Rate limiting is handled by nginx in front of this service.
export const app = express();

// NGINX sits in front of this service, so trust its X-Forwarded-* headers for the client IP.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Video thumbnails come from several YouTube image hosts.
        "img-src": ["'self'", "data:", "https:"],
        // Would break plain-HTTP access, e.g. testing by IP before HTTPS is set up.
        "upgrade-insecure-requests": null,
      },
    },
  }),
);
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/v1", routes);

if (servesFrontend) {
  app.use(
    express.static(publicDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite fingerprints everything in /assets, so those files can be cached forever.
        const fingerprinted = filePath.includes(`${path.sep}assets${path.sep}`);
        res.setHeader("Cache-Control", fingerprinted ? "public, max-age=31536000, immutable" : "no-cache");
      },
    }),
  );
  // Client-side routes (/today, /playlists/123, ...) all get the app shell.
  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
}

app.use(notFound);
app.use(errorHandler);
