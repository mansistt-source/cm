import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, longtext, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordSalt: varchar("passwordSalt", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Projects table: top-level video generation projects
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  initialPrompt: longtext("initialPrompt").notNull(),
  videoLength: int("videoLength").notNull(), // in seconds
  genre: varchar("genre", { length: 100 }).notNull(),
  status: mysqlEnum("status", [
    "draft",
    "generating_storyboard",
    "storyboard_ready",
    "generating_frames",
    "generating_clips",
    "generating_montage",
    "completed",
    "failed",
  ])
    .default("draft")
    .notNull(),
  currentStage: varchar("currentStage", { length: 100 }),
  finalVideoUrl: varchar("finalVideoUrl", { length: 512 }),
  finalVideoKey: varchar("finalVideoKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Scenes table: individual scene cards within a storyboard
export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneNumber: int("sceneNumber").notNull(),
  description: longtext("description").notNull(),
  duration: int("duration").notNull(), // in seconds
  visualStyle: varchar("visualStyle", { length: 255 }),
  startFrameUrl: varchar("startFrameUrl", { length: 512 }),
  startFrameKey: varchar("startFrameKey", { length: 255 }),
  endFrameUrl: varchar("endFrameUrl", { length: 512 }),
  endFrameKey: varchar("endFrameKey", { length: 255 }),
  videoClipUrl: varchar("videoClipUrl", { length: 512 }),
  videoClipKey: varchar("videoClipKey", { length: 255 }),
  generationStatus: mysqlEnum("generationStatus", [
    "pending",
    "generating_frames",
    "frames_ready",
    "generating_clip",
    "clip_ready",
    "failed",
  ])
    .default("pending")
    .notNull(),
  higgsFieldRequestId: varchar("higgsFieldRequestId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

// Publishing records: track social media publishing attempts
export const publishingRecords = mysqlTable("publishingRecords", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "youtube", "tiktok"]).notNull(),
  status: mysqlEnum("status", ["pending", "publishing", "published", "failed"])
    .default("pending")
    .notNull(),
  externalMediaId: varchar("externalMediaId", { length: 255 }),
  externalUrl: varchar("externalUrl", { length: 512 }),
  errorMessage: text("errorMessage"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishingRecord = typeof publishingRecords.$inferSelect;
export type InsertPublishingRecord = typeof publishingRecords.$inferInsert;

// API credentials: encrypted API keys and OAuth tokens
export const apiCredentials = mysqlTable("apiCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  service: varchar("service", { length: 100 }).notNull(), // higgsfield, instagram, youtube, tiktok
  credentialType: varchar("credentialType", { length: 100 }).notNull(), // api_key, oauth_token, oauth_refresh_token
  encryptedValue: longtext("encryptedValue").notNull(),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiCredential = typeof apiCredentials.$inferSelect;
export type InsertApiCredential = typeof apiCredentials.$inferInsert;

// Pipeline events: logs for debugging and real-time progress tracking
export const pipelineEvents = mysqlTable("pipelineEvents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  stage: varchar("stage", { length: 100 }).notNull(),
  message: text("message"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PipelineEvent = typeof pipelineEvents.$inferSelect;
export type InsertPipelineEvent = typeof pipelineEvents.$inferInsert;
// ── Subscriptions table ───────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id:                   int("id").autoincrement().primaryKey(),
  userId:               int("userId").notNull().unique(),
  planKey:              varchar("planKey", { length: 50 }).default("starter"),
  status:               mysqlEnum("status", ["active","cancelled","suspended","inactive"]).default("inactive").notNull(),
  paypalSubscriptionId: varchar("paypalSubscriptionId", { length: 255 }),
  creditsTotal:         int("creditsTotal").default(0),
  creditsUsed:          int("creditsUsed").default(0),
  renewsAt:             timestamp("renewsAt"),
  createdAt:            timestamp("createdAt").defaultNow().notNull(),
  updatedAt:            timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;


// ── Pay-as-you-go top-up orders ───────────────────────────────────
export const topupOrders = mysqlTable("topupOrders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paypalOrderId: varchar("paypalOrderId", { length: 255 }).notNull().unique(),
  paypalCaptureId: varchar("paypalCaptureId", { length: 255 }),
  amountUsd: varchar("amountUsd", { length: 32 }).notNull(),
  credits: int("credits").notNull(),
  status: mysqlEnum("status", ["pending", "captured", "cancelled", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TopupOrder = typeof topupOrders.$inferSelect;
export type InsertTopupOrder = typeof topupOrders.$inferInsert;
