/**
 * Documentary Service
 * ───────────────────
 * Assembles the documentary final video from images + audio.
 * Uses FFmpeg for Ken Burns effect + audio sync.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { storagePut } from "../storage.js";
import { logPipelineEvent } from "../db.js";
import { runDocumentaryPipeline, type DocSegment } from "./higgsfield.js";

const execAsync = promisify(exec);

export interface AssembledDocumentary {
  finalVideoUrl: string;
  finalVideoKey: string;
  durationSeconds: number;
  segmentCount: number;
}

// Download image to local temp file
async function downloadToTemp(url: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const tmpPath = join(tmpdir(), filename);
  await writeFile(tmpPath, buffer);
  return tmpPath;
}

/**
 * Assemble documentary: images + Ken Burns + audio → final MP4
 *
 * Ken Burns: each image pans/zooms subtly for 5 seconds.
 * Audio: narration track synced to visuals.
 */
export async function assembleDocumentary(
  projectId: number,
  segments: DocSegment[],
  imageUrls: string[],
  audioUrl: string
): Promise<AssembledDocumentary> {
  await logPipelineEvent(projectId, "assembly_started", "assembly", `${segments.length} segments`);

  const tmpDir = tmpdir();
  const workDir = join(tmpDir, `doc-${projectId}-${Date.now()}`);
  await mkdir(workDir, { recursive: true });

  // Download all images
  await logPipelineEvent(projectId, "downloading_images", "assembly", "Downloading segment images");
  const imagePaths = await Promise.all(
    imageUrls.map((url, i) => downloadToTemp(url, `doc-${projectId}-img-${String(i).padStart(4, "0")}.jpg`))
  );

  // Download audio
  const audioPath = join(workDir, "narration.mp3");
  const audioRes = await fetch(audioUrl);
  await writeFile(audioPath, Buffer.from(await audioRes.arrayBuffer()));

  // Build FFmpeg filter for Ken Burns effect on each image
  // Each image = 5 seconds with subtle zoom/pan
  const segmentDuration = 5;
  const totalDuration = segments.length * segmentDuration;

  // Build input list for FFmpeg
  const inputArgs = imagePaths.map(p => `-loop 1 -t ${segmentDuration} -i "${p}"`).join(" ");

  // Ken Burns filter: alternate between zoom-in and pan-right
  const filterParts = imagePaths.map((_, i) => {
    const zoomEffect = i % 3 === 0
      ? `zoompan=z='min(zoom+0.0005,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${segmentDuration * 25}:fps=25:s=1920x1080`
      : i % 3 === 1
      ? `zoompan=z='1.05':x='min(iw-(iw/zoom/2),(iw-(iw/zoom/2))*${i/imagePaths.length}+iw/2-(iw/zoom/2))':y='ih/2-(ih/zoom/2)':d=${segmentDuration * 25}:fps=25:s=1920x1080`
      : `zoompan=z='max(1.05-0.0005*in,1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${segmentDuration * 25}:fps=25:s=1920x1080`;

    return `[${i}:v]${zoomEffect},setsar=1[v${i}]`;
  });

  const concatInputs = imagePaths.map((_, i) => `[v${i}]`).join("");
  const filterComplex = [
    ...filterParts,
    `${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[outv]`,
  ].join(";");

  const outputPath = join(workDir, "documentary.mp4");

  const ffmpegCmd = [
    "ffmpeg -y",
    inputArgs,
    `-i "${audioPath}"`,
    `-filter_complex "${filterComplex}"`,
    `-map "[outv]" -map ${imagePaths.length}:a`,
    `-c:v libx264 -preset fast -crf 22`,
    `-c:a aac -b:a 192k`,
    `-t ${totalDuration}`,
    `-r 25 -pix_fmt yuv420p`,
    `"${outputPath}"`,
  ].join(" ");

  await logPipelineEvent(projectId, "ffmpeg_started", "assembly", "Running FFmpeg Ken Burns assembly");

  await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 });

  // Upload to storage
  const { readFile } = await import("fs/promises");
  const videoBuffer = await readFile(outputPath);
  const finalVideoKey = `projects/${projectId}/documentary/final.mp4`;
  const stored = await storagePut(finalVideoKey, videoBuffer, "video/mp4");

  // Cleanup
  await Promise.allSettled([
    ...imagePaths.map(p => unlink(p)),
    unlink(audioPath),
    unlink(outputPath),
  ]);

  await logPipelineEvent(projectId, "assembly_done", "assembly", "Documentary assembled");

  return {
    finalVideoUrl: stored.url ?? finalVideoKey,
    finalVideoKey,
    durationSeconds: totalDuration,
    segmentCount: segments.length,
  };
}

/**
 * Full documentary job: script → images → voice → assemble
 */
export async function runDocumentaryJob(
  projectId: number,
  userId: number,
  topic: string,
  durationSeconds: number,
  voiceProfile: "calm_authority" | "dramatic_narrator" | "curious_explorer" | "intimate_witness" = "calm_authority"
): Promise<AssembledDocumentary> {

  // Pipeline: script + images + voice
  const { segments, imageUrls, audioUrl } = await runDocumentaryPipeline(
    projectId, topic, durationSeconds, voiceProfile
  );

  // Assembly: FFmpeg Ken Burns
  return assembleDocumentary(projectId, segments, imageUrls, audioUrl);
}
