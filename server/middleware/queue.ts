/**
 * Job Queue System
 * ─────────────────
 * In-memory queue now → swap for Bull+Redis when scaling.
 * Each pipeline job runs async, client polls for status.
 */
import { EventEmitter } from "events";

export type JobStatus = "queued" | "processing" | "done" | "failed";

export interface Job {
  id: string;
  userId: number;
  type: "film" | "documentary" | "marketing";
  input: Record<string, any>;
  status: JobStatus;
  progress: number;           // 0-100
  progressMsg: string;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobs = new Map<string, Job>();
const emitter = new EventEmitter();
emitter.setMaxListeners(200);

function generateId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createJob(userId: number, type: Job["type"], input: Record<string, any>): Job {
  const id = generateId();
  const job: Job = {
    id, userId, type, input,
    status: "queued",
    progress: 0,
    progressMsg: "في قائمة الانتظار...",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, updates, { updatedAt: new Date() });
  emitter.emit(`job:${id}`, job);
  return job;
}

export function getJob(id: string): Job | null {
  return jobs.get(id) ?? null;
}

export function getUserJobs(userId: number): Job[] {
  return [...jobs.values()]
    .filter(j => j.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);
}

export function onJobUpdate(id: string, cb: (job: Job) => void): () => void {
  emitter.on(`job:${id}`, cb);
  return () => emitter.off(`job:${id}`, cb);
}

// Auto-cleanup jobs older than 24h
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt.getTime() < cutoff) jobs.delete(id);
  }
}, 60 * 60 * 1000);
