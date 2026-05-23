/**
 * مُحرك التسويق — Production Server
 * ────────────────────────────────────
 * Security first, scalable by design.
 */
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";

// Middleware
import {
  forceHttps,
  securityHeaders,
  cors,
  authRateLimit,
  pipelineRateLimit,
  generalRateLimit,
  sanitizeBody,
  requestLogger,
} from "../middleware/security.js";

// Services
import { captureTopupOrder, checkCredits, createTopupOrder, deductCredits, handlePayPalWebhook, verifyPayPalWebhookSignature } from "../services/paypal.js";
import { changePassword, register, login, verifyToken, getUserById, googleAuth } from "../services/auth.js";
import { createJob, updateJob, getJob, getUserJobs } from "../middleware/queue.js";
import { runPipeline } from "../services/higgsfield.js";
import { registerStorageProxy } from "./storageProxy.js";

const app = express();
const server = createServer(app);
const PROD = process.env.NODE_ENV === "production";

// ── 1. HTTPS Redirect ───────────────────────────────────────────────
app.use(forceHttps);

// ── 2. Logging ──────────────────────────────────────────────────────
app.use(requestLogger);

// ── 3. CORS ─────────────────────────────────────────────────────────
app.use(cors);

// ── 4. Security Headers ─────────────────────────────────────────────
app.use(securityHeaders);

// ── 5. PayPal Webhook (raw body BEFORE json parser) ─────────────────
app.post(
  "/api/paypal/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const event = JSON.parse(req.body.toString());
      const isValid = await verifyPayPalWebhookSignature(req.headers, event);
      if (!isValid) {
        console.warn("[WEBHOOK] Invalid PayPal signature");
        return res.status(400).json({ error: "Invalid webhook" });
      }

      await handlePayPalWebhook(event);
      res.json({ received: true });
    } catch (e: any) {
      console.error("[WEBHOOK] Error:", e.message);
      res.status(400).send(e.message);
    }
  }
);

// ── 6. Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(sanitizeBody);
app.use(generalRateLimit);

// ── 7. Health check ─────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── 8. Auth helpers ─────────────────────────────────────────────────
function setCookieToken(res: express.Response, token: string) {
  res.cookie("cm_auth", token, {
    httpOnly: true,
    secure: PROD,
    sameSite: PROD ? "strict" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
}

async function getAuthUser(req: express.Request) {
  const token = req.cookies?.cm_auth ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

// ── 9. Auth REST endpoints ──────────────────────────────────────────
app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try {
    const result = await register(req.body.email, req.body.password, req.body.name);
    setCookieToken(res, result.token);
    res.json({ user: result.user, token: result.token });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try {
    const result = await login(req.body.email, req.body.password);
    setCookieToken(res, result.token);
    res.json({ user: result.user, token: result.token });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/auth/google", authRateLimit, async (req, res) => {
  try {
    const result = await googleAuth(req.body.credential);
    setCookieToken(res, result.token);
    res.json({ user: result.user, token: result.token });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "غير مصرح" });
    res.json(user);
  } catch { res.status(401).json({ error: "غير مصرح" }); }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("cm_auth", { path: "/" });
  res.json({ success: true });
});

app.post("/api/auth/change-password", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "غير مصرح" });
    const result = await changePassword(user.id, req.body.currentPassword, req.body.newPassword);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── 10. PayPal top-up ───────────────────────────────────────────────
app.get("/api/paypal/status", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "غير مصرح" });
    res.json(await checkCredits(user.id));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/paypal/topup", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "غير مصرح" });
    const amount = parseFloat(req.body.amount);
    const appUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
    const order = await createTopupOrder(user.id, amount, appUrl);
    res.json(order);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get("/api/paypal/topup/capture", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.redirect("/auth?reason=paypal_login_required");
    const orderId = String(req.query.token ?? "");
    if (!orderId) throw new Error("Missing PayPal order token");
    const result = await captureTopupOrder(user.id, orderId);
    const status = result.alreadyCaptured ? "already_captured" : "success";
    return res.redirect(`/dashboard?tab=billing&topup_status=${status}&credits=${result.credits}`);
  } catch (e: any) {
    console.error("[PAYPAL TOPUP CAPTURE]", e.message);
    return res.redirect(`/dashboard?tab=billing&topup_status=failed&error=${encodeURIComponent(e.message)}`);
  }
});

// ── 11. Pipeline Job endpoints ──────────────────────────────────────
app.post("/api/pipeline/start", pipelineRateLimit, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "غير مصرح" });

    // Credit check
    const { getDb } = await import("../db.js");
    const { subscriptions } = await import("../../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
    if (!sub || sub.status !== "active") return res.status(402).json({ error: "لا يوجد اشتراك فعّال", code: "NO_SUBSCRIPTION" });
    const creditsLeft = (sub.creditsTotal ?? 0) - (sub.creditsUsed ?? 0);
    if (creditsLeft <= 0) return res.status(402).json({ error: "نفد رصيد الكريديت", code: "NO_CREDITS" });

    const { type = "film", clientPrompt, styleId = "cinematic", durationSeconds = 30, ...input } = req.body;
    const pipelineStyleId = type === "marketing" ? "commercial" : styleId;
    if (!clientPrompt || typeof clientPrompt !== "string") {
      return res.status(400).json({ error: "clientPrompt is required" });
    }

    const { createProject } = await import("../db.js");
    const videoType = type === "documentary" ? "documentary" : "film";
    const project = await createProject(
      user.id,
      clientPrompt.slice(0, 80) || "Untitled project",
      videoType === "documentary" ? "Documentary generated from prompt" : "Film generated from prompt",
      clientPrompt,
      Number(durationSeconds),
      videoType === "documentary" ? "documentary" : pipelineStyleId
    );

    const job = createJob(user.id, type, { ...input, clientPrompt, styleId: pipelineStyleId, durationSeconds, projectId: project.id, userId: user.id });

    (async () => {
      try {
        updateJob(job.id, { status: "processing", progress: 5, progressMsg: "جاري التخطيط..." });
        const result = await runPipeline({
          projectId: project.id,
          userId: user.id,
          clientPrompt,
          styleId: pipelineStyleId,
          videoType,
          durationSeconds: Number(durationSeconds),
        });
        await deductCredits(user.id, Math.ceil(Number(durationSeconds) * 1.5));
        updateJob(job.id, { status: "done", progress: 100, progressMsg: "تم!", result: { projectId: project.id, output: result } });
      } catch (e: any) {
        updateJob(job.id, { status: "failed", error: e.message, progressMsg: "فشل" });
      }
    })();

    res.json({ jobId: job.id, projectId: project.id, status: "queued" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/pipeline/job/:id", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "غير مصرح" });
  const job = getJob(req.params.id);
  if (!job || job.userId !== user.id) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.get("/api/pipeline/jobs", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "غير مصرح" });
  res.json(getUserJobs(user.id));
});

// SSE for real-time job updates
app.get("/api/pipeline/job/:id/stream", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).end();
  const job = getJob(req.params.id);
  if (!job || job.userId !== user.id) return res.status(404).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const { onJobUpdate } = await import("../middleware/queue.js");
  const send = (j: any) => res.write(`data: ${JSON.stringify(j)}\n\n`);
  send(job);

  const cleanup = onJobUpdate(req.params.id, send);
  req.on("close", cleanup);
});

// ── 12. tRPC ────────────────────────────────────────────────────────
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
registerStorageProxy(app);

// ── 13. Frontend ────────────────────────────────────────────────────
if (PROD) {
  serveStatic(app);
} else {
  await setupVite(app, server);
}

// ── 14. Global error handler ─────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[SERVER ERROR]", err);
  res.status(500).json({ error: PROD ? "خطأ داخلي" : err.message });
});

// ── 15. Graceful shutdown ────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("[SHUTDOWN] Graceful shutdown...");
  server.close(() => {
    console.log("[SHUTDOWN] Done.");
    process.exit(0);
  });
});

// ── 16. Start ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "8080");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Running on 0.0.0.0:${PORT} (${process.env.NODE_ENV})`);
});
