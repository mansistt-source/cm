/**
 * server/services/paypal.ts
 * ──────────────────────────
 * PayPal subscriptions + verified PAYG top-up checkout.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { subscriptions, topupOrders } from "../../drizzle/schema.js";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export const PLANS: Record<string, { name: string; price: number; credits: number; planId: string }> = {
  starter: { name: "Starter", price: 150, credits: 1500, planId: process.env.PAYPAL_PLAN_STARTER ?? "" },
  growth:  { name: "Growth",  price: 300, credits: 3300, planId: process.env.PAYPAL_PLAN_GROWTH  ?? "" },
  pro:     { name: "Pro",     price: 800, credits: 9600, planId: process.env.PAYPAL_PLAN_PRO     ?? "" },
  agency:  { name: "Agency",  price: 1500, credits: 19500, planId: process.env.PAYPAL_PLAN_AGENCY ?? "" },
};

export function calculateTopupCredits(amountUsd: number): number {
  // Current UI rate: $0.0792 per credit. Keep backend as the source of truth.
  return Math.floor(amountUsd / 0.0792);
}

// ── Auth token ────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("PayPal credentials are not configured");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal auth failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

// ── Create subscription link ──────────────────────────────────────

export async function createSubscriptionLink(planKey: string, userId: number, appUrl: string): Promise<string> {
  const plan = PLANS[planKey];
  if (!plan) throw new Error("Invalid plan");
  if (!plan.planId) throw new Error(`PayPal plan id is missing for ${planKey}`);

  const token = await getToken();

  const res = await fetch(`${BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: plan.planId,
      custom_id: String(userId),
      application_context: {
        brand_name: "ContentMachine",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${appUrl}/dashboard?tab=billing&subscription_status=success`,
        cancel_url: `${appUrl}/dashboard?tab=billing&subscription_status=cancelled`,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal subscription failed: ${res.status} ${JSON.stringify(data)}`);

  const approvalLink = data.links?.find((l: any) => l.rel === "approve")?.href;
  if (!approvalLink) throw new Error("Could not create PayPal subscription");
  return approvalLink;
}

// ── PAYG checkout order ───────────────────────────────────────────

export async function createTopupOrder(userId: number, amountUsd: number, appUrl: string): Promise<{ url: string; orderId: string; credits: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isFinite(amountUsd) || amountUsd < 5 || amountUsd > 5000) {
    throw new Error("المبلغ بين $5 و$5,000");
  }

  const credits = calculateTopupCredits(amountUsd);
  if (credits <= 0) throw new Error("Top-up amount is too small");

  const token = await getToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: String(userId),
          description: `${credits} credits — ContentMachine`,
          amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "ContentMachine",
        user_action: "PAY_NOW",
        return_url: `${appUrl}/api/paypal/topup/capture`,
        cancel_url: `${appUrl}/dashboard?tab=billing&topup_status=cancelled`,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`PayPal order failed: ${res.status} ${JSON.stringify(data)}`);

  await db.insert(topupOrders).values({
    userId,
    paypalOrderId: data.id,
    amountUsd: amountUsd.toFixed(2),
    credits,
    status: "pending",
  });

  const url = data.links?.find((l: any) => l.rel === "approve")?.href;
  if (!url) throw new Error("Could not create PayPal approval link");

  return { url, orderId: data.id, credits };
}

export async function captureTopupOrder(userId: number, orderId: string): Promise<{ credits: number; alreadyCaptured: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(topupOrders)
    .where(and(eq(topupOrders.paypalOrderId, orderId), eq(topupOrders.userId, userId)))
    .limit(1);

  if (!order) throw new Error("Top-up order not found");
  if (order.status === "captured") return { credits: order.credits, alreadyCaptured: true };
  if (order.status !== "pending") throw new Error(`Top-up order is ${order.status}`);

  const token = await getToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();

  if (!res.ok) {
    await db.update(topupOrders).set({ status: "failed", updatedAt: new Date() }).where(eq(topupOrders.id, order.id));
    throw new Error(`PayPal capture failed: ${res.status} ${JSON.stringify(data)}`);
  }

  if (data.status !== "COMPLETED") {
    await db.update(topupOrders).set({ status: "failed", updatedAt: new Date() }).where(eq(topupOrders.id, order.id));
    throw new Error(`PayPal capture not completed: ${data.status}`);
  }

  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  await addCredits(userId, order.credits);
  await db.update(topupOrders).set({
    status: "captured",
    paypalCaptureId: captureId,
    updatedAt: new Date(),
  }).where(eq(topupOrders.id, order.id));

  return { credits: order.credits, alreadyCaptured: false };
}

// ── Webhook signature verification ────────────────────────────────

export async function verifyPayPalWebhookSignature(headers: Record<string, any>, event: any): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  const header = (name: string) => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const token = await getToken();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: header("paypal-auth-algo"),
      cert_url: header("paypal-cert-url"),
      transmission_id: header("paypal-transmission-id"),
      transmission_sig: header("paypal-transmission-sig"),
      transmission_time: header("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  const data = await res.json();
  return res.ok && data.verification_status === "SUCCESS";
}

// ── Handle PayPal subscription webhook ────────────────────────────

export async function handlePayPalWebhook(event: any) {
  const db = await getDb();
  if (!db) return;

  const type = event.event_type;
  const resource = event.resource;

  switch (type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const userId = parseInt(resource.custom_id ?? "0", 10);
      if (!userId) throw new Error("Missing PayPal subscription custom_id");
      const planId = resource.plan_id;
      const planKey = Object.keys(PLANS).find(k => PLANS[k].planId === planId) ?? "starter";
      const plan = PLANS[planKey];

      const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
      const values = {
        planKey,
        status: "active" as const,
        paypalSubscriptionId: resource.id,
        creditsTotal: plan.credits,
        creditsUsed: 0,
        renewsAt: new Date(resource.billing_info?.next_billing_time ?? Date.now()),
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db.update(subscriptions).set(values).where(eq(subscriptions.userId, userId));
      } else {
        await db.insert(subscriptions).values({ userId, ...values });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.RENEWED": {
      const userId = parseInt(resource.custom_id ?? "0", 10);
      if (!userId) throw new Error("Missing PayPal subscription custom_id");
      const planId = resource.plan_id;
      const planKey = Object.keys(PLANS).find(k => PLANS[k].planId === planId) ?? "starter";
      const plan = PLANS[planKey];

      await db.update(subscriptions).set({
        planKey,
        status: "active",
        creditsUsed: 0,
        creditsTotal: plan.credits,
        renewsAt: new Date(resource.billing_info?.next_billing_time ?? Date.now()),
        updatedAt: new Date(),
      }).where(eq(subscriptions.userId, userId));
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      const userId = parseInt(resource.custom_id ?? "0", 10);
      if (!userId) throw new Error("Missing PayPal subscription custom_id");
      await db.update(subscriptions).set({ status: "cancelled", updatedAt: new Date() }).where(eq(subscriptions.userId, userId));
      break;
    }
  }
}

// ── Credits ───────────────────────────────────────────────────────

export async function checkCredits(userId: number): Promise<{ allowed: boolean; creditsLeft: number; plan: string }> {
  const db = await getDb();
  if (!db) return { allowed: false, creditsLeft: 0, plan: "none" };

  const found = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (!found.length || found[0].status !== "active") {
    return { allowed: false, creditsLeft: 0, plan: "none" };
  }

  const sub = found[0];
  const creditsLeft = (sub.creditsTotal ?? 0) - (sub.creditsUsed ?? 0);
  return { allowed: creditsLeft > 0, creditsLeft, plan: sub.planKey ?? "starter" };
}

export async function addCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const found = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (found.length > 0) {
    const sub = found[0];
    await db.update(subscriptions).set({
      status: "active",
      planKey: sub.planKey ?? "payg",
      creditsTotal: (sub.creditsTotal ?? 0) + amount,
      updatedAt: new Date(),
    }).where(eq(subscriptions.userId, userId));
    return;
  }

  await db.insert(subscriptions).values({
    userId,
    planKey: "payg",
    status: "active",
    creditsTotal: amount,
    creditsUsed: 0,
  });
}

export async function deductCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) return;

  const found = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (!found.length) return;

  const sub = found[0];
  await db.update(subscriptions).set({
    creditsUsed: (sub.creditsUsed ?? 0) + amount,
    updatedAt: new Date(),
  }).where(eq(subscriptions.userId, userId));
}
