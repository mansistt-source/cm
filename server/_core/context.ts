import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyToken, getUserById } from "../services/auth.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    // Cookie first (httpOnly), then Authorization header (API clients)
    const token =
      opts.req.cookies?.cm_auth ??
      opts.req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const payload = await verifyToken(token);
      if (payload) user = await getUserById(payload.userId);
    }
  } catch { user = null; }
  return { req: opts.req, res: opts.res, user };
}
