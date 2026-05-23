/**
 * Security Middleware Stack
 * ─────────────────────────
 * Helmet, CORS, HTTPS redirect, rate limiting, credit guard
 */
import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import slowDown from "express-slow-down";

const PROD = process.env.NODE_ENV === "production";
const APP_ORIGIN = process.env.APP_URL ?? "https://content-machine-production-d5dc.up.railway.app";

// ── Force HTTPS ────────────────────────────────────────────────────
export function forceHttps(req: Request, res: Response, next: NextFunction) {
  if (!PROD) return next();
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  if (proto !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

// ── Security Headers (manual, no helmet dep needed) ───────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (PROD) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://api.higgsfield.ai https://mcp.higgsfield.ai https://api-m.paypal.com https://api-m.sandbox.paypal.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  next();
}

// ── CORS ───────────────────────────────────────────────────────────
export function cors(req: Request, res: Response, next: NextFunction) {
  const allowed = [APP_ORIGIN, "http://localhost:3000", "http://localhost:5173"];
  const origin = req.headers.origin ?? "";
  if (allowed.includes(origin) || !PROD) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// ── Rate limiters ──────────────────────────────────────────────────
const limiterStore = new Map<string, { count: number; reset: number }>();

function simpleLimit(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = limiterStore.get(key);
    if (!entry || entry.reset < now) {
      limiterStore.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "كثير من الطلبات — انتظر قليلاً",
        retryAfter,
      });
    }
    next();
  };
}

// Login: 10 attempts per 15 min
export const authRateLimit = simpleLimit(15 * 60 * 1000, 10);

// Pipeline: 20 requests per hour
export const pipelineRateLimit = simpleLimit(60 * 60 * 1000, 20);

// General API: 200 requests per min
export const generalRateLimit = simpleLimit(60 * 1000, 200);

// ── Credit Guard ───────────────────────────────────────────────────
export async function creditGuard(
  req: Request & { userId?: number },
  res: Response,
  next: NextFunction
) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "غير مصرح" });

  try {
    const { getDb } = await import("../db.js");
    const { subscriptions } = await import("../../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "خطأ في قاعدة البيانات" });

    const found = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    if (!found.length || found[0].status !== "active") {
      return res.status(402).json({ error: "لا يوجد اشتراك فعّال", code: "NO_SUBSCRIPTION" });
    }

    const sub = found[0];
    const left = (sub.creditsTotal ?? 0) - (sub.creditsUsed ?? 0);
    if (left <= 0) {
      return res.status(402).json({ error: "نفد رصيد الكريديت", code: "NO_CREDITS", creditsLeft: 0 });
    }

    (req as any).creditsLeft = left;
    next();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// ── Input sanitizer ────────────────────────────────────────────────
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    function clean(obj: any): any {
      if (typeof obj === "string") {
        return obj.replace(/<script[^>]*>.*?<\/script>/gi, "").replace(/javascript:/gi, "").trim();
      }
      if (Array.isArray(obj)) return obj.map(clean);
      if (obj && typeof obj === "object") {
        const out: any = {};
        for (const k of Object.keys(obj)) out[k] = clean(obj[k]);
        return out;
      }
      return obj;
    }
    req.body = clean(req.body);
  }
  next();
}

// ── Request logger ─────────────────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    if (level !== "INFO" || process.env.LOG_REQUESTS === "true") {
      console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
}
