import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  projects,
  scenes,
  publishingRecords,
  apiCredentials,
  pipelineEvents,
  Project,
  Scene,
  PublishingRecord,
  ApiCredential,
  PipelineEvent,
} from "../drizzle/schema";
import { ENV } from "./_core/env";


// ============ SECRET ENCRYPTION HELPERS ============

const ENCRYPTION_PREFIX = "enc:v1:";

function credentialKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CREDENTIAL_ENCRYPTION_KEY or JWT_SECRET is required in production");
    }
    return createHash("sha256").update("dev-only-credential-key-change-me").digest();
  }
  return createHash("sha256").update(secret).digest();
}

function encryptCredential(value: string): string {
  if (value.startsWith(ENCRYPTION_PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptCredential(value: string): string {
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;
  const [, ivB64, tagB64, encryptedB64] = value.slice(ENCRYPTION_PREFIX.length).match(/^([^:]+):([^:]+):(.+)$/) ?? [];
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error("Invalid encrypted credential format");
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedB64, "base64")), decipher.final()]).toString("utf8");
}

function withDecryptedCredential<T extends { encryptedValue: string }>(credential: T): T {
  return { ...credential, encryptedValue: decryptCredential(credential.encryptedValue) };
}

function withMaskedCredential<T extends { encryptedValue: string }>(credential: T): T {
  return { ...credential, encryptedValue: credential.encryptedValue ? "••••••••" : "" };
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PROJECT QUERIES ============

export async function createProject(
  userId: number,
  title: string,
  description: string | undefined,
  initialPrompt: string,
  videoLength: number,
  genre: string
): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({
    userId,
    title,
    description,
    initialPrompt,
    videoLength,
    genre,
    status: "draft",
  });

  const projectId = result[0].insertId;
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId as number))
    .limit(1);

  return project[0]!;
}

export async function getProjectById(projectId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return result[0];
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function updateProjectStatus(
  projectId: number,
  status: string,
  currentStage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(projects)
    .set({
      status: status as any,
      currentStage,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

export async function updateProjectFinalVideo(
  projectId: number,
  finalVideoUrl: string,
  finalVideoKey: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(projects)
    .set({
      finalVideoUrl,
      finalVideoKey,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

// ============ SCENE QUERIES ============

export async function createScenes(
  projectId: number,
  sceneData: Array<{
    sceneNumber: number;
    description: string;
    duration: number;
    visualStyle?: string;
  }>
): Promise<Scene[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values = sceneData.map((data) => ({
    projectId,
    ...data,
    generationStatus: "pending" as const,
  }));

  await db.insert(scenes).values(values);

  return db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.sceneNumber);
}

export async function getProjectScenes(projectId: number): Promise<Scene[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.sceneNumber);
}

export async function getSceneById(sceneId: number): Promise<Scene | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1);

  return result[0];
}

export async function updateSceneFrames(
  sceneId: number,
  startFrameUrl: string,
  startFrameKey: string,
  endFrameUrl: string,
  endFrameKey: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scenes)
    .set({
      startFrameUrl,
      startFrameKey,
      endFrameUrl,
      endFrameKey,
      generationStatus: "frames_ready",
      updatedAt: new Date(),
    })
    .where(eq(scenes.id, sceneId));
}

export async function updateSceneVideoClip(
  sceneId: number,
  videoClipUrl: string,
  videoClipKey: string,
  higgsFieldRequestId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scenes)
    .set({
      videoClipUrl,
      videoClipKey,
      higgsFieldRequestId,
      generationStatus: "clip_ready",
      updatedAt: new Date(),
    })
    .where(eq(scenes.id, sceneId));
}

export async function updateSceneDescription(
  sceneId: number,
  description: string,
  visualStyle?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scenes)
    .set({
      description,
      visualStyle,
      updatedAt: new Date(),
    })
    .where(eq(scenes.id, sceneId));
}

export async function updateSceneGenerationStatus(
  sceneId: number,
  status: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scenes)
    .set({
      generationStatus: status as any,
      updatedAt: new Date(),
    })
    .where(eq(scenes.id, sceneId));
}

// ============ PUBLISHING QUERIES ============

export async function createPublishingRecord(
  projectId: number,
  platform: "instagram" | "youtube" | "tiktok"
): Promise<PublishingRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(publishingRecords).values({
    projectId,
    platform,
    status: "pending",
  });

  const recordId = result[0].insertId;
  const record = await db
    .select()
    .from(publishingRecords)
    .where(eq(publishingRecords.id, recordId as number))
    .limit(1);

  return record[0]!;
}

export async function updatePublishingRecord(
  recordId: number,
  status: "pending" | "publishing" | "published" | "failed",
  externalMediaId?: string,
  externalUrl?: string,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(publishingRecords)
    .set({
      status,
      externalMediaId,
      externalUrl,
      errorMessage,
      publishedAt: status === "published" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(publishingRecords.id, recordId));
}

export async function getProjectPublishingRecords(
  projectId: number
): Promise<PublishingRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(publishingRecords)
    .where(eq(publishingRecords.projectId, projectId))
    .orderBy(desc(publishingRecords.createdAt));
}

// ============ API CREDENTIALS QUERIES ============

export async function saveApiCredential(
  userId: number,
  service: string,
  credentialType: string,
  encryptedValue: string,
  expiresAt?: Date
): Promise<ApiCredential> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const storedValue = encryptCredential(encryptedValue);

  // Check if credential already exists
  const existing = await db
    .select()
    .from(apiCredentials)
    .where(
      and(
        eq(apiCredentials.userId, userId),
        eq(apiCredentials.service, service),
        eq(apiCredentials.credentialType, credentialType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(apiCredentials)
      .set({
        encryptedValue: storedValue,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(apiCredentials.id, existing[0].id));

    return withMaskedCredential({ ...existing[0], encryptedValue: storedValue });
  }

  // Create new
  const result = await db.insert(apiCredentials).values({
    userId,
    service,
    credentialType,
    encryptedValue: storedValue,
    expiresAt,
    isActive: true,
  });

  const credId = result[0].insertId;
  const cred = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.id, credId as number))
    .limit(1);

  return withMaskedCredential(cred[0]!);
}

export async function getApiCredential(
  userId: number,
  service: string,
  credentialType: string
): Promise<ApiCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(apiCredentials)
    .where(
      and(
        eq(apiCredentials.userId, userId),
        eq(apiCredentials.service, service),
        eq(apiCredentials.credentialType, credentialType),
        eq(apiCredentials.isActive, true)
      )
    )
    .limit(1);

  return result[0] ? withDecryptedCredential(result[0]) : undefined;
}

export async function getUserApiCredentials(userId: number): Promise<ApiCredential[]> {
  const db = await getDb();
  if (!db) return [];

  const credentials = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.userId, userId))
    .orderBy(desc(apiCredentials.createdAt));

  return credentials.map(withMaskedCredential);
}

// ============ PIPELINE EVENTS QUERIES ============

export async function logPipelineEvent(
  projectId: number,
  eventType: string,
  stage: string,
  message?: string,
  metadata?: Record<string, any>
): Promise<PipelineEvent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pipelineEvents).values({
    projectId,
    eventType,
    stage,
    message,
    metadata,
  });

  const eventId = result[0].insertId;
  const event = await db
    .select()
    .from(pipelineEvents)
    .where(eq(pipelineEvents.id, eventId as number))
    .limit(1);

  return event[0]!;
}

export async function getProjectPipelineEvents(
  projectId: number,
  limit: number = 100
): Promise<PipelineEvent[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pipelineEvents)
    .where(eq(pipelineEvents.projectId, projectId))
    .orderBy(desc(pipelineEvents.createdAt))
    .limit(limit);
}
