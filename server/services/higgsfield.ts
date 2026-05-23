/**
 * Higgsfield Service — Claude + Higgsfield Only
 * No fal.ai, no OpenAI. All through Claude + Higgsfield.
 *
 * Models:
 *   Images : nano-banana-2
 *   Video  : kling-3
 *   Voice  : higgsfield-v1  (documentary)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logPipelineEvent } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS   = path.resolve(__dirname, "../../prompts");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const HF_KEY    = process.env.HIGGSFIELD_API_KEY ?? "";
const HF_BASE   = "https://api.higgsfield.ai";

// ── Helpers ───────────────────────────────────────────────────────

export async function loadPrompt(...parts: string[]): Promise<string> {
  return fs.readFile(path.join(PROMPTS, ...parts), "utf-8");
}

export async function loadStyle(styleId: string): Promise<string> {
  return loadPrompt("styles", `${styleId}.txt`);
}

async function hf(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${HF_BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Higgsfield ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function hfGet(endpoint: string) {
  const res = await fetch(`${HF_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${HF_KEY}` },
  });
  if (!res.ok) throw new Error(`Higgsfield GET ${endpoint}: ${res.status}`);
  return res.json();
}

async function pollVideo(requestId: string, max = 72, ms = 5000): Promise<string> {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, ms));
    const d = await hfGet(`/v1/video/status/${requestId}`);
    if (d.status === "completed") return d.video_url ?? d.output;
    if (d.status === "failed") throw new Error(`Video job failed: ${requestId}`);
  }
  throw new Error(`Video polling timeout: ${requestId}`);
}

async function pollImage(requestId: string, max = 30, ms = 3000): Promise<string> {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, ms));
    const d = await hfGet(`/v1/image/status/${requestId}`);
    if (d.status === "completed") return d.image_url;
    if (d.status === "failed") throw new Error(`Image job failed: ${requestId}`);
  }
  throw new Error(`Image polling timeout: ${requestId}`);
}

async function pollVoice(requestId: string, max = 30, ms = 3000): Promise<string> {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, ms));
    const d = await hfGet(`/v1/voice/status/${requestId}`);
    if (d.status === "completed") return d.audio_url;
    if (d.status === "failed") throw new Error(`Voice job failed: ${requestId}`);
  }
  throw new Error(`Voice polling timeout: ${requestId}`);
}

async function claudeJSON<T>(system: string, user: string, maxTokens = 8192): Promise<T> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: system + "\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no extra text.",
    messages: [{ role: "user", content: user }],
  });
  const text = response.content.find(c => c.type === "text")?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim()) as T;
}

// ── Types ─────────────────────────────────────────────────────────

export interface SceneInput {
  id: number;
  scene_number: number;
  title: string;
  visual_description: string;
  camera_movement: string;
  lighting: string;
  duration: number;
  start_frame_note: string;
  end_frame_note: string;
  characters_in_scene: string[];
  tools_in_scene: string[];
}

export interface ClipResult {
  sceneId: number;
  videoClipUrl: string;
  videoClipKey: string;
  higgsFieldRequestId: string;
}

export interface DocSegment {
  segment_number: number;
  timestamp_start: number;
  timestamp_end: number;
  narration_text: string;
  image_description: string;
  emotional_tone: string;
}

// ── PIPELINE: Storyboard ──────────────────────────────────────────

export async function generateStoryboard(
  projectId: number,
  styleId: string,
  clientPrompt: string,
  durationSeconds: number
): Promise<SceneInput[]> {
  await logPipelineEvent(projectId, "storyboard_started", "storyboard", styleId);
  const [style, prompt] = await Promise.all([loadStyle(styleId), loadPrompt("pipeline", "07_storyboard.txt")]);
  const result = await claudeJSON<{ scenes: SceneInput[] }>(
    prompt,
    `STYLE TEMPLATE:\n${style}\n\nDURATION: ${durationSeconds} seconds\n\nCLIENT PROMPT:\n${clientPrompt}`
  );
  await logPipelineEvent(projectId, "storyboard_done", "storyboard", `${result.scenes.length} scenes`);
  return result.scenes.map((s, i) => ({ ...s, id: i + 1 }));
}

// ── PIPELINE: Frames (Higgsfield image model) ─────────────────────

export async function generateSceneFrames(
  projectId: number,
  styleId: string,
  scene: SceneInput,
  nextSceneStartNote?: string
): Promise<{ startFrameUrl: string; endFrameUrl: string }> {
  await logPipelineEvent(projectId, "frames_started", "frame_generation", `Scene ${scene.scene_number}`);
  const [style, prompt] = await Promise.all([loadStyle(styleId), loadPrompt("pipeline", "08_image_generator.txt")]);

  const frames = await claudeJSON<{
    start_frame: { prompt: string; negative_prompt: string };
    end_frame: { prompt: string; negative_prompt: string };
  }>(prompt, `STYLE:\n${style}\n\nSCENE:\n${JSON.stringify(scene)}\n\nNEXT_SCENE_START: ${nextSceneStartNote ?? "last scene"}`);

  const [startRes, endRes] = await Promise.all([
    hf("/v1/image/generate", { prompt: frames.start_frame.prompt, negative_prompt: frames.start_frame.negative_prompt, model: "nano-banana-2", width: 1920, height: 1080 }),
    hf("/v1/image/generate", { prompt: frames.end_frame.prompt, negative_prompt: frames.end_frame.negative_prompt, model: "nano-banana-2", width: 1920, height: 1080 }),
  ]);

  const [startFrameUrl, endFrameUrl] = await Promise.all([
    startRes.image_url ?? pollImage(startRes.request_id),
    endRes.image_url ?? pollImage(endRes.request_id),
  ]);

  await logPipelineEvent(projectId, "frames_done", "frame_generation", `Scene ${scene.scene_number}`);
  return { startFrameUrl, endFrameUrl };
}

// ── PIPELINE: Video Clip ──────────────────────────────────────────

export async function generateVideoClip(
  projectId: number,
  styleId: string,
  scene: SceneInput,
  startFrameUrl: string,
  endFrameUrl: string
): Promise<ClipResult> {
  await logPipelineEvent(projectId, "clip_started", "clip_generation", `Scene ${scene.scene_number}`);
  const [style, prompt] = await Promise.all([loadStyle(styleId), loadPrompt("pipeline", "09_video_generator.txt")]);

  const { video_prompt } = await claudeJSON<{ video_prompt: string }>(
    prompt,
    `STYLE:\n${style}\n\nSCENE:\n${JSON.stringify(scene)}`
  );

  const result = await hf("/v1/video/generate", {
    prompt: video_prompt,
    first_frame_image: startFrameUrl,
    last_frame_image: endFrameUrl,
    duration: scene.duration,
    aspect_ratio: "16:9",
    quality: "720p",
    model: "kling-3",
  });

  const requestId = result.request_id ?? result.id;
  const videoClipUrl = await pollVideo(requestId);

  await logPipelineEvent(projectId, "clip_done", "clip_generation", `Scene ${scene.scene_number}`);
  return {
    sceneId: scene.id,
    videoClipUrl,
    videoClipKey: `projects/${projectId}/scenes/${scene.scene_number}/clip.mp4`,
    higgsFieldRequestId: requestId,
  };
}

// ── PIPELINE: Caption ─────────────────────────────────────────────

export async function generateCaption(
  projectId: number,
  styleId: string,
  clientPrompt: string,
  scenes: SceneInput[]
) {
  const prompt = await loadPrompt("pipeline", "10_caption.txt");
  const summary = scenes.map(s => `Scene ${s.scene_number}: ${s.title}`).join("\n");
  return claudeJSON<{
    caption: string; hashtags: string; story_sticker: string;
    youtube_title: string; youtube_description: string;
  }>(prompt, `CLIENT PROMPT: ${clientPrompt}\nSTYLE: ${styleId}\nSCENES:\n${summary}`);
}

// ── PIPELINE: Full (6 styles) ─────────────────────────────────────

export async function runFullPipeline(
  projectId: number,
  userId: number,
  styleId: string,
  clientPrompt: string,
  durationSeconds: number
): Promise<ClipResult[]> {
  await logPipelineEvent(projectId, "pipeline_started", "pipeline", `${styleId} ${durationSeconds}s`);

  const scenes = await generateStoryboard(projectId, styleId, clientPrompt, durationSeconds);

  // Frames sequentially (continuity)
  const frameResults: { startFrameUrl: string; endFrameUrl: string }[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const frames = await generateSceneFrames(
      projectId, styleId, scenes[i],
      i < scenes.length - 1 ? scenes[i + 1].start_frame_note : undefined
    );
    frameResults.push(frames);
  }

  // Clips in parallel
  const settled = await Promise.allSettled(
    scenes.map((scene, i) =>
      generateVideoClip(projectId, styleId, scene, frameResults[i].startFrameUrl, frameResults[i].endFrameUrl)
    )
  );

  const clips = settled.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<ClipResult>).value);
  await logPipelineEvent(projectId, "pipeline_done", "pipeline", `${clips.length}/${scenes.length} clips`);
  return clips;
}

// ── DOCUMENTARY PIPELINE ──────────────────────────────────────────

export interface DocumentaryResult {
  segments: DocSegment[];
  imageUrls: string[];
  audioUrl: string;
  finalVideoUrl?: string;
}

export async function runDocumentaryPipeline(
  projectId: number,
  topic: string,
  durationSeconds: number,
  voiceProfile: "calm_authority" | "dramatic_narrator" | "curious_explorer" | "intimate_witness" = "calm_authority"
): Promise<DocumentaryResult> {
  await logPipelineEvent(projectId, "doc_started", "documentary", `${topic} ${durationSeconds}s`);

  // Step 1: Script
  const [scriptPrompt, styleTemplate] = await Promise.all([
    loadPrompt("documentary", "11_script.txt"),
    loadPrompt("documentary", "14_style.txt"),
  ]);

  const { segments } = await claudeJSON<{ segments: DocSegment[] }>(
    scriptPrompt,
    `DOCUMENTARY STYLE:\n${styleTemplate}\n\nTOPIC: ${topic}\nDURATION: ${durationSeconds} seconds\nVOICE PROFILE: ${voiceProfile}`,
    16384
  );

  await logPipelineEvent(projectId, "doc_script_done", "documentary", `${segments.length} segments`);

  // Step 2: Image prompt for each segment
  const imageGenPrompt = await loadPrompt("documentary", "12_image_prompt.txt");

  const imagePrompts = await claudeJSON<Array<{
    segment_number: number;
    image_prompt: string;
    negative_prompt: string;
    ken_burns: { effect: string; intensity: string };
  }>>(
    imageGenPrompt,
    `DOCUMENTARY STYLE:\n${styleTemplate}\n\nSEGMENTS:\n${JSON.stringify(segments, null, 2)}`,
    16384
  );

  // Step 3: Generate all images via Higgsfield Nano Banana
  await logPipelineEvent(projectId, "doc_images_started", "documentary", `${imagePrompts.length} images`);

  const imageResults = await Promise.allSettled(
    imagePrompts.map(ip =>
      hf("/v1/image/generate", {
        prompt: ip.image_prompt,
        negative_prompt: ip.negative_prompt,
        model: "nano-banana-2",
        width: 1920,
        height: 1080,
      }).then(async res => res.image_url ?? await pollImage(res.request_id))
    )
  );

  const imageUrls = imageResults.map((r, i) =>
    r.status === "fulfilled" ? r.value : `https://placeholder.com/error/segment-${i + 1}`
  );

  await logPipelineEvent(projectId, "doc_images_done", "documentary", `${imageUrls.length} images ready`);

  // Step 4: Voice narration via Higgsfield
  const voicePrompt = await loadPrompt("documentary", "13_voice_direction.txt");
  const fullScript = segments.map(s => s.narration_text).join(" ");

  const voiceInstruction = await claudeJSON<{
    voice_profile: string;
    language: string;
    voice_segments: Array<{ text: string; pace_wpm: number }>;
  }>(voicePrompt, `SCRIPT:\n${fullScript}\nVOICE PROFILE: ${voiceProfile}`);

  const voiceResult = await hf("/v1/voice/generate", {
    text: fullScript,
    voice_profile: voiceInstruction.voice_profile,
    language: voiceInstruction.language,
    model: "higgsfield-v1",
    pace_wpm: voiceInstruction.voice_segments[0]?.pace_wpm ?? 150,
  });

  const audioUrl = voiceResult.audio_url ?? await pollVoice(voiceResult.request_id);

  await logPipelineEvent(projectId, "doc_voice_done", "documentary", "Voice narration ready");
  await logPipelineEvent(projectId, "doc_done", "documentary", "All assets ready for assembly");

  return { segments, imageUrls, audioUrl };
}

// ── Legacy exports (backward compat) ─────────────────────────────

export async function generateAllVideoClips(
  projectId: number,
  userId: number,
  scenes: SceneInput[]
): Promise<ClipResult[]> {
  return runFullPipeline(projectId, userId, "cinematic", "", 30);
}

// ── runPipeline alias for index.ts ───────────────────────────────
export async function runPipeline(input: {
  projectId: number;
  userId: number;
  clientPrompt: string;
  styleId?: string;
  videoType?: "film" | "documentary";
  durationSeconds?: number;
}) {
  const { videoType = "film", styleId = "cinematic", durationSeconds = 30, clientPrompt, userId, projectId } = input;
  if (videoType === "documentary") {
    return runDocumentaryPipeline(projectId, clientPrompt, durationSeconds);
  }
  return runFullPipeline(projectId, userId, styleId, clientPrompt, durationSeconds);
}
