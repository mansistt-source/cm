/**
 * server/services/auth.ts
 * ────────────────────────
 * Email/password auth, verified Google One Tap auth, and JWT session helpers.
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createRemoteJWKSet, SignJWT, jwtVerify } from "jose";
import { getDb } from "../db.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return new TextEncoder().encode("dev-only-content-machine-secret-change-me-32-chars");
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID is required for Google login");
  return clientId;
}

// ── Password hashing ──────────────────────────────────────────────

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt = generateSalt()): { hash: string; salt: string } {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return { hash: `scrypt$${derived}`, salt };
}

function legacySha256(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex");
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!storedHash || !salt) return false;

  const expected = storedHash.startsWith("scrypt$")
    ? storedHash.slice("scrypt$".length)
    : storedHash;

  const actual = storedHash.startsWith("scrypt$")
    ? scryptSync(password, salt, 64).toString("hex")
    : legacySha256(password, salt);

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

// ── JWT ───────────────────────────────────────────────────────────

export async function signToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { userId: payload.userId as number, email: payload.email as string };
  } catch {
    return null;
  }
}

// ── Register ──────────────────────────────────────────────────────

export async function register(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) throw new Error("Email already registered");

  const { hash, salt } = hashPassword(password);

  await db.insert(users).values({
    email,
    name,
    passwordHash: hash,
    passwordSalt: salt,
    openId: `email_${email}`,
    loginMethod: "email",
  });

  const newUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = newUser[0];
  const token = await signToken(user.id, email);

  return { token, user: { id: user.id, email, name } };
}

// ── Login ─────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (found.length === 0) throw new Error("Email or password incorrect");

  const user = found[0];
  if (!user.passwordHash || !user.passwordSalt) throw new Error("Email or password incorrect");

  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    throw new Error("Email or password incorrect");
  }

  // Upgrade legacy SHA-256 hashes to scrypt after a successful login.
  if (!user.passwordHash.startsWith("scrypt$")) {
    const upgraded = hashPassword(password);
    await db.update(users).set({ passwordHash: upgraded.hash, passwordSalt: upgraded.salt }).where(eq(users.id, user.id));
  }

  const token = await signToken(user.id, email);
  return { token, user: { id: user.id, email, name: user.name } };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) throw new Error("كلمة السر الجديدة قصيرة");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!found.length) throw new Error("مستخدم غير موجود");

  const user = found[0];
  if (!user.passwordHash || !user.passwordSalt || !verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
    throw new Error("كلمة السر الحالية غلط");
  }

  const next = hashPassword(newPassword);
  await db.update(users).set({ passwordHash: next.hash, passwordSalt: next.salt }).where(eq(users.id, userId));
  return { success: true };
}

// ── Get current user ──────────────────────────────────────────────

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return found[0] ?? null;
}

// ── Google OAuth / One Tap ────────────────────────────────────────

export async function googleAuth(credential: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: getGoogleClientId(),
  });

  const email = typeof payload.email === "string" ? payload.email : "";
  const name = typeof payload.name === "string" ? payload.name : email;
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";

  if (!email || !sub) throw new Error("Invalid Google credential payload");
  if (!emailVerified) throw new Error("Google email is not verified");

  let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

  if (!user) {
    await db.insert(users).values({
      email,
      name,
      openId: `google_${sub}`,
      loginMethod: "google",
    });
    user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  } else if (user.openId !== `google_${sub}` || user.loginMethod !== "google") {
    await db.update(users).set({ openId: user.openId ?? `google_${sub}`, loginMethod: user.loginMethod ?? "google" }).where(eq(users.id, user.id));
  }

  const token = await signToken(user.id, email);
  return { token, user: { id: user.id, email, name: user.name ?? name } };
}
