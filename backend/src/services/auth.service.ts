import bcrypt from "bcryptjs";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

// Verifies Google ID tokens against Google's public keys (cached by the library). No client secret involved.
const googleClient = new OAuth2Client();

const verifyGoogleToken = async (credential: string): Promise<TokenPayload> => {
  let payload: TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn("Rejected Google ID token", err instanceof Error ? err.message : err);
  }
  if (!payload?.sub || !payload.email) throw new AppError(401, "Google sign-in failed. Try again.");
  if (!payload.email_verified) throw new AppError(401, "Your Google account's email is not verified.");
  return payload;
};

/** Finds the user for a Google account, linking it to an existing account with the same verified email. */
const findOrCreateGoogleUser = async (g: TokenPayload) => {
  const byGoogle = await userRepository.findByGoogleId(g.sub);
  if (byGoogle) return byGoogle;

  const email = g.email!;
  const byEmail = await userRepository.findByEmail(email);
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== g.sub) {
      throw new AppError(409, "This email is linked to a different Google account.");
    }
    // Google has verified the address, so it is safe to link it to the password account that uses it.
    byEmail.googleId = g.sub;
    if (!byEmail.avatarUrl && g.picture) byEmail.avatarUrl = g.picture;
    return byEmail.save();
  }

  try {
    return await userRepository.create({
      name: (g.name ?? email.split("@")[0]).slice(0, 80),
      email,
      googleId: g.sub,
      avatarUrl: g.picture ?? "",
    });
  } catch (err) {
    // A parallel sign-in with the same account created it first.
    if ((err as { code?: number })?.code === 11000) {
      const existing = await userRepository.findByGoogleId(g.sub);
      if (existing) return existing;
    }
    throw err;
  }
};

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    if (await userRepository.findByEmailWithPassword(input.email)) {
      throw new AppError(409, "Email already registered");
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return { token: signToken(user.id), user: await userRepository.findById(user.id) };
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmailWithPassword(input.email);
    if (user && !user.passwordHash) {
      throw new AppError(401, "This account uses Google sign-in. Use “Continue with Google”.");
    }
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash!))) {
      throw new AppError(401, "Invalid email or password");
    }
    return { token: signToken(user.id), user: await userRepository.findById(user.id) };
  },

  /** Signs in or signs up with a Google ID token from Google Identity Services. */
  async google(credential: string) {
    if (!env.googleClientId) throw new AppError(503, "Google sign-in is not configured");
    const user = await findOrCreateGoogleUser(await verifyGoogleToken(credential));
    return { token: signToken(user.id), user: await userRepository.findById(user.id) };
  },
};
