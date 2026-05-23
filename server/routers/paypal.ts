/**
 * server/routers/paypal.ts
 * ─────────────────────────
 * PayPal subscription checkout + webhook handler.
 * Add to server/routers.ts: paypalRouter
 * Add raw webhook route to server/_core/index.ts
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { createSubscriptionLink, checkCredits, PLANS } from "../services/paypal.js";

export const paypalRouter = router({

  // Get available plans
  getPlans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      key,
      name: plan.name,
      price: plan.price,
      credits: plan.credits,
    }));
  }),

  // Create PayPal subscription link
  subscribe: protectedProcedure
    .input(z.object({ plan: z.enum(["starter", "growth", "pro", "agency"]) }))
    .mutation(async ({ input, ctx }) => {
      const appUrl = process.env.APP_URL ?? "https://content-machine-production-d5dc.up.railway.app";
      const url = await createSubscriptionLink(input.plan, ctx.user.id, appUrl);
      return { url };
    }),

  // Get current subscription status
  status: protectedProcedure.query(async ({ ctx }) => {
    return checkCredits(ctx.user.id);
  }),
});

// ── Add this to server/_core/index.ts ────────────────────────────
//
// import express from "express";
// import { handlePayPalWebhook } from "../services/paypal.js";
//
// app.post("/api/paypal/webhook",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     try {
//       await handlePayPalWebhook(JSON.parse(req.body.toString()));
//       res.json({ received: true });
//     } catch (e: any) {
//       res.status(400).send(e.message);
//     }
//   }
// );
