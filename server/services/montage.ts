import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { storagePut } from "../storage";
import { logPipelineEvent } from "../db";
import { getProjectScenes } from "../db";

const execAsync = promisify(exec);

/**
 * Assemble video clips into a final montage using FFmpeg
 * Concatenates all scene clips in order with audio sync
 */
export async function assembleMontage(
  projectId: number,
  videoClipUrls: string[]
): Promise<{
  finalVideoUrl: string;
  finalVideoKey: string;
}> {
  let fileListPath: string | null = null;
  let outputPath: string | null = null;

  try {
    if (videoClipUrls.length === 0) {
      throw new Error("No video clips provided for montage assembly");
    }

    await logPipelineEvent(projectId, "montage_assembly_started", "montage_assembly", `Starting montage assembly with ${videoClipUrls.length} clips`);

    // Create a temporary file list for FFmpeg concat demuxer
    const tmpDir = tmpdir();
    fileListPath = join(tmpDir, `filelist-${projectId}-${Date.now()}.txt`);
    outputPath = join(tmpDir, `montage-${projectId}-${Date.now()}.mp4`);

    // Build file list for FFmpeg concat demuxer
    const fileListContent = videoClipUrls
      .map((url) => `file '${url}'`)
      .join("\n");

    await writeFile(fileListPath, fileListContent);

    // Run FFmpeg concat command
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}" -y`;

    console.log(`[Montage] Running FFmpeg: ${ffmpegCommand}`);

    const { stdout, stderr } = await execAsync(ffmpegCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large videos
      timeout: 300000, // 5 minute timeout
    });

    console.log("[Montage] FFmpeg output:", stdout);
    if (stderr) {
      console.log("[Montage] FFmpeg stderr:", stderr);
    }

    // Read the output file
    const fs = await import("fs/promises");
    const videoBuffer = await fs.readFile(outputPath);

    // Upload to cloud storage
    const finalVideoKey = `projects/${projectId}/final-video.mp4`;
    const storageResult = await storagePut(finalVideoKey, videoBuffer, "video/mp4");

    await logPipelineEvent(projectId, "montage_assembled", "montage_assembly", "Montage assembly completed successfully", {
      clipCount: videoClipUrls.length,
      finalVideoUrl: storageResult.url,
      finalVideoKey: storageResult.key,
    });

    return {
      finalVideoUrl: storageResult.url,
      finalVideoKey: storageResult.key,
    };
  } catch (error) {
    console.error("[Montage] Assembly failed:", error);
    await logPipelineEvent(
      projectId,
      "error_occurred",
      "montage_assembly",
      `Montage assembly failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  } finally {
    // Clean up temporary files
    if (fileListPath) {
      try {
        await unlink(fileListPath);
      } catch (err) {
        console.warn("[Montage] Failed to clean up file list:", err);
      }
    }
    if (outputPath) {
      try {
        await unlink(outputPath);
      } catch (err) {
        console.warn("[Montage] Failed to clean up output file:", err);
      }
    }
  }
}

/**
 * Alternative: Assemble montage using concat filter (for different codecs)
 * More flexible but slower due to re-encoding
 */
export async function assembleMontageWithFilter(
  projectId: number,
  videoClipUrls: string[]
): Promise<{
  finalVideoUrl: string;
  finalVideoKey: string;
}> {
  let outputPath: string | null = null;

  try {
    if (videoClipUrls.length === 0) {
      throw new Error("No video clips provided for montage assembly");
    }

    await logPipelineEvent(projectId, "montage_assembly_started", "montage_assembly", `Starting montage assembly with concat filter (${videoClipUrls.length} clips)`);

    const tmpDir = tmpdir();
    outputPath = join(tmpDir, `montage-${projectId}-${Date.now()}.mp4`);

    // Build FFmpeg concat filter
    const inputFlags = videoClipUrls.map((url) => `-i "${url}"`).join(" ");

    const filterComplex = videoClipUrls
      .map((_, i) => `[${i}:v][${i}:a]`)
      .join("")
      .concat(`concat=n=${videoClipUrls.length}:v=1:a=1[outv][outa]`);

    const ffmpegCommand = `ffmpeg ${inputFlags} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -crf 23 -c:a aac -b:a 192k "${outputPath}" -y`;

    console.log(`[Montage] Running FFmpeg with concat filter: ${ffmpegCommand}`);

    const { stdout, stderr } = await execAsync(ffmpegCommand, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000, // 10 minute timeout for re-encoding
    });

    console.log("[Montage] FFmpeg output:", stdout);
    if (stderr) {
      console.log("[Montage] FFmpeg stderr:", stderr);
    }

    // Read the output file
    const fs = await import("fs/promises");
    const videoBuffer = await fs.readFile(outputPath);

    // Upload to cloud storage
    const finalVideoKey = `projects/${projectId}/final-video.mp4`;
    const storageResult = await storagePut(finalVideoKey, videoBuffer, "video/mp4");

    await logPipelineEvent(projectId, "montage_assembled", "montage_assembly", "Montage assembly completed successfully (with re-encoding)", {
      clipCount: videoClipUrls.length,
      finalVideoUrl: storageResult.url,
      finalVideoKey: storageResult.key,
    });

    return {
      finalVideoUrl: storageResult.url,
      finalVideoKey: storageResult.key,
    };
  } catch (error) {
    console.error("[Montage] Assembly with filter failed:", error);
    await logPipelineEvent(
      projectId,
      "error_occurred",
      "montage_assembly",
      `Montage assembly failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  } finally {
    // Clean up temporary files
    if (outputPath) {
      try {
        await unlink(outputPath);
      } catch (err) {
        console.warn("[Montage] Failed to clean up output file:", err);
      }
    }
  }
}
