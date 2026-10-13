import "dotenv/config";

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  // Optional: "Continue with Google" is hidden when unset. Public value; no client secret is needed.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  // Optional: AI summaries are hidden when no key is set. A free key comes from Google AI Studio.
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Flash-Lite: fast, reads YouTube URLs, and has a free-tier quota separate from Flash.
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 20),
  aiChatDailyLimit: Number(process.env.AI_CHAT_DAILY_LIMIT ?? 50),
};
