import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

await connectDb();
app.listen(env.port, () => {
  logger.info(`API listening on http://localhost:${env.port} (${process.env.NODE_ENV ?? "development"})`);
});
