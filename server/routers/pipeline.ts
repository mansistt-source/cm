import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import {
  createProject, getProjectById, getUserProjects,
  updateProjectStatus, updateProjectFinalVideo,
  createScenes, getProjectScenes,
  updateSceneFrames, updateSceneVideoClip,
  getProjectPipelineEvents, logPipelineEvent,
  createPublishingRecord, getProjectPublishingRecords,
  saveApiCredential, getUserApiCredentials,
} from "../db.js";
import {
  generateStoryboard as generateHiggsfieldStoryboard,
  generateSceneFrames,
  generateVideoClip,
  generateCaption,
  type SceneInput,
} from "../services/higgsfield.js";
import { runDocumentaryJob } from "../services/documentary.js";
import { assembleMontage } from "../services/montage.js";
import { publishToInstagram, publishToYouTube, publishToTikTok, validateCredentials } from "../services/publishing.js";
import { deductCredits } from "../services/paypal.js";

const STYLES = ["cinematic", "anime", "realistic", "3d", "commercial", "luxury"] as const;
const LEGACY_GENRES = ["animated", "stylized", "documentary"] as const;
const VOICE_PROFILES = ["calm_authority", "dramatic_narrator", "curious_explorer", "intimate_witness"] as const;

type StyleId = (typeof STYLES)[number];

function normalizeStyle(value?: string | null): StyleId {
  if (value && (STYLES as readonly string[]).includes(value)) return value as StyleId;
  if (value === "animated") return "anime";
  if (value === "stylized") return "cinematic";
  if (value === "documentary") return "cinematic";
  return "cinematic";
}

function sceneToInput(scene: any): SceneInput {
  return {
    id: scene.id,
    scene_number: scene.sceneNumber,
    title: `Scene ${scene.sceneNumber}`,
    visual_description: scene.description,
    camera_movement: scene.visualStyle ?? "cinematic camera movement",
    lighting: scene.visualStyle ?? "cinematic lighting",
    duration: scene.duration,
    start_frame_note: scene.description,
    end_frame_note: scene.description,
    characters_in_scene: [],
    tools_in_scene: [],
  };
}

function storyboardSceneToDbScene(scene: SceneInput) {
  return {
    sceneNumber: scene.scene_number,
    description: scene.visual_description || scene.start_frame_note || scene.title,
    duration: scene.duration,
    visualStyle: [scene.camera_movement, scene.lighting].filter(Boolean).join(" | "),
  };
}

async function assertOwnedProject(projectId: number, userId: number) {
  const project = await getProjectById(projectId);
  if (!project || project.userId !== userId) throw new Error("Project not found");
  return project;
}

export const pipelineRouter = router({
  // ── Create project ────────────────────────────────────────────
  createProject: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      initialPrompt: z.string().min(5),
      videoLength: z.number().int().min(5).max(3600),
      style: z.enum(STYLES).optional(),
      genre: z.union([z.enum(STYLES), z.enum(LEGACY_GENRES)]).optional(),
      isDocumentary: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const style = normalizeStyle(input.style ?? input.genre);
      const genre = input.isDocumentary || input.genre === "documentary" ? "documentary" : style;
      const project = await createProject(
        ctx.user.id,
        input.title,
        input.description ?? "",
        input.initialPrompt,
        input.videoLength,
        genre
      );
      await logPipelineEvent(project.id, "project_created", "initialization", "Project created");
      return project;
    }),

  // ── Storyboard only ───────────────────────────────────────────
  generateStoryboard: protectedProcedure
    .input(z.object({ projectId: z.number().int(), styleId: z.enum(STYLES).optional() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const existingScenes = await getProjectScenes(input.projectId);
      if (existingScenes.length > 0) return existingScenes;

      const styleId = normalizeStyle(input.styleId ?? project.genre);
      await updateProjectStatus(input.projectId, "generating_storyboard", "storyboard_generation");
      const storyboard = await generateHiggsfieldStoryboard(input.projectId, styleId, project.initialPrompt, project.videoLength);
      const scenes = await createScenes(input.projectId, storyboard.map(storyboardSceneToDbScene));
      await updateProjectStatus(input.projectId, "storyboard_ready", "storyboard_ready");
      return scenes;
    }),

  // ── Generate frames for stored storyboard ──────────────────────
  generateFrames: protectedProcedure
    .input(z.object({ projectId: z.number().int(), styleId: z.enum(STYLES).optional() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      let scenes = await getProjectScenes(input.projectId);
      if (scenes.length === 0) {
        const styleId = normalizeStyle(input.styleId ?? project.genre);
        const storyboard = await generateHiggsfieldStoryboard(input.projectId, styleId, project.initialPrompt, project.videoLength);
        scenes = await createScenes(input.projectId, storyboard.map(storyboardSceneToDbScene));
      }

      const styleId = normalizeStyle(input.styleId ?? project.genre);
      await updateProjectStatus(input.projectId, "generating_frames", "frame_generation");

      const updated = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene.startFrameUrl && scene.endFrameUrl) {
          updated.push(scene);
          continue;
        }
        const frames = await generateSceneFrames(
          input.projectId,
          styleId,
          sceneToInput(scene),
          scenes[i + 1]?.description
        );
        await updateSceneFrames(
          scene.id,
          frames.startFrameUrl,
          `projects/${input.projectId}/scenes/${scene.sceneNumber}/start.png`,
          frames.endFrameUrl,
          `projects/${input.projectId}/scenes/${scene.sceneNumber}/end.png`
        );
      }

      await updateProjectStatus(input.projectId, "storyboard_ready", "frames_ready");
      return getProjectScenes(input.projectId);
    }),

  // ── Generate clips from ready frames ───────────────────────────
  generateClips: protectedProcedure
    .input(z.object({ projectId: z.number().int(), styleId: z.enum(STYLES).optional() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const scenes = await getProjectScenes(input.projectId);
      if (scenes.length === 0) throw new Error("No storyboard scenes found");

      const missingFrames = scenes.find(scene => !scene.startFrameUrl || !scene.endFrameUrl);
      if (missingFrames) throw new Error("Generate frames before clips");

      const styleId = normalizeStyle(input.styleId ?? project.genre);
      await updateProjectStatus(input.projectId, "generating_clips", "clip_generation");

      for (const scene of scenes) {
        if (scene.videoClipUrl) continue;
        const clip = await generateVideoClip(
          input.projectId,
          styleId,
          sceneToInput(scene),
          scene.startFrameUrl!,
          scene.endFrameUrl!
        );
        await updateSceneVideoClip(scene.id, clip.videoClipUrl, clip.videoClipKey, clip.higgsFieldRequestId);
      }

      await updateProjectStatus(input.projectId, "generating_montage", "clips_ready");
      return getProjectScenes(input.projectId);
    }),

  // ── Assemble montage from stored clips ─────────────────────────
  assembleMontage: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const scenes = await getProjectScenes(input.projectId);
      const videoClipUrls = scenes.map(scene => scene.videoClipUrl).filter((url): url is string => Boolean(url));
      if (videoClipUrls.length === 0) throw new Error("No video clips ready for montage");
      if (videoClipUrls.length !== scenes.length) throw new Error("Some scenes are missing video clips");

      await updateProjectStatus(input.projectId, "generating_montage", "montage_assembly");
      const montage = await assembleMontage(input.projectId, videoClipUrls);
      await updateProjectFinalVideo(input.projectId, montage.finalVideoUrl, montage.finalVideoKey);
      await deductCredits(ctx.user.id, Math.ceil(project.videoLength * 1.5));
      return montage;
    }),

  // ── Run full stored project pipeline ───────────────────────────
  runPipeline: protectedProcedure
    .input(z.object({
      projectId: z.number().int(),
      styleId: z.enum(STYLES).optional(),
      clientPrompt: z.string().min(5).optional(),
      durationSeconds: z.number().int().min(5).max(3600).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const styleId = normalizeStyle(input.styleId ?? project.genre);

      let scenes = await getProjectScenes(input.projectId);
      if (scenes.length === 0) {
        await updateProjectStatus(input.projectId, "generating_storyboard", "storyboard_generation");
        const storyboard = await generateHiggsfieldStoryboard(
          input.projectId,
          styleId,
          input.clientPrompt ?? project.initialPrompt,
          input.durationSeconds ?? project.videoLength
        );
        scenes = await createScenes(input.projectId, storyboard.map(storyboardSceneToDbScene));
      }

      await updateProjectStatus(input.projectId, "generating_frames", "frame_generation");
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene.startFrameUrl || !scene.endFrameUrl) {
          const frames = await generateSceneFrames(input.projectId, styleId, sceneToInput(scene), scenes[i + 1]?.description);
          await updateSceneFrames(
            scene.id,
            frames.startFrameUrl,
            `projects/${input.projectId}/scenes/${scene.sceneNumber}/start.png`,
            frames.endFrameUrl,
            `projects/${input.projectId}/scenes/${scene.sceneNumber}/end.png`
          );
        }
      }

      scenes = await getProjectScenes(input.projectId);
      await updateProjectStatus(input.projectId, "generating_clips", "clip_generation");
      for (const scene of scenes) {
        if (!scene.videoClipUrl) {
          if (!scene.startFrameUrl || !scene.endFrameUrl) throw new Error("Scene frames are missing");
          const clip = await generateVideoClip(input.projectId, styleId, sceneToInput(scene), scene.startFrameUrl, scene.endFrameUrl);
          await updateSceneVideoClip(scene.id, clip.videoClipUrl, clip.videoClipKey, clip.higgsFieldRequestId);
        }
      }

      scenes = await getProjectScenes(input.projectId);
      const videoClipUrls = scenes.map(scene => scene.videoClipUrl).filter((url): url is string => Boolean(url));
      const montage = await assembleMontage(input.projectId, videoClipUrls);
      await updateProjectFinalVideo(input.projectId, montage.finalVideoUrl, montage.finalVideoKey);
      await deductCredits(ctx.user.id, Math.ceil((input.durationSeconds ?? project.videoLength) * 1.5));

      const caption = await generateCaption(
        input.projectId,
        styleId,
        input.clientPrompt ?? project.initialPrompt,
        scenes.map(sceneToInput)
      );

      return { scenes, montage, caption };
    }),

  // ── Run documentary pipeline ──────────────────────────────────
  runDocumentary: protectedProcedure
    .input(z.object({
      projectId: z.number().int(),
      topic: z.string().min(5),
      durationSeconds: z.number().int().min(30).max(3600),
      voiceProfile: z.enum(VOICE_PROFILES).optional().default("calm_authority"),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      await updateProjectStatus(input.projectId, "generating_storyboard", "documentary");
      const result = await runDocumentaryJob(input.projectId, ctx.user.id, input.topic, input.durationSeconds, input.voiceProfile);
      await updateProjectFinalVideo(input.projectId, result.finalVideoUrl, result.finalVideoKey);
      await deductCredits(ctx.user.id, Math.ceil(input.durationSeconds * 1.5));
      return { project, ...result };
    }),

  // ── Get project ───────────────────────────────────────────────
  getProject: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const scenes = await getProjectScenes(input.projectId);
      return { project, scenes };
    }),

  getProjectLibrary: protectedProcedure.query(async ({ ctx }) => getUserProjects(ctx.user.id)),

  getPipelineEvents: protectedProcedure
    .input(z.object({ projectId: z.number().int(), limit: z.number().int().optional() }))
    .query(async ({ input, ctx }) => {
      await assertOwnedProject(input.projectId, ctx.user.id);
      return getProjectPipelineEvents(input.projectId, input.limit);
    }),

  getProjectStatus: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      const scenes = await getProjectScenes(input.projectId);
      const events = await getProjectPipelineEvents(input.projectId, 10);
      return {
        project,
        scenes,
        events,
        progress: {
          totalScenes: scenes.length,
          framesReady: scenes.filter(s => s.startFrameUrl && s.endFrameUrl).length,
          clipsReady: scenes.filter(s => s.videoClipUrl).length,
        },
      };
    }),

  // ── Publishing ────────────────────────────────────────────────
  publishToInstagram: protectedProcedure
    .input(z.object({ projectId: z.number().int(), caption: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      if (!project.finalVideoUrl) throw new Error("No final video");
      const record = await createPublishingRecord(input.projectId, "instagram");
      return publishToInstagram(input.projectId, ctx.user.id, project.finalVideoUrl, input.caption, record.id);
    }),

  publishToYouTube: protectedProcedure
    .input(z.object({ projectId: z.number().int(), title: z.string(), description: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      if (!project.finalVideoUrl) throw new Error("No final video");
      const record = await createPublishingRecord(input.projectId, "youtube");
      return publishToYouTube(input.projectId, ctx.user.id, project.finalVideoUrl, input.title, input.description, record.id);
    }),

  publishToTikTok: protectedProcedure
    .input(z.object({ projectId: z.number().int(), caption: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertOwnedProject(input.projectId, ctx.user.id);
      if (!project.finalVideoUrl) throw new Error("No final video");
      const record = await createPublishingRecord(input.projectId, "tiktok");
      return publishToTikTok(input.projectId, ctx.user.id, project.finalVideoUrl, input.caption, record.id);
    }),

  getPublishingRecords: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      await assertOwnedProject(input.projectId, ctx.user.id);
      return getProjectPublishingRecords(input.projectId);
    }),

  saveApiCredential: protectedProcedure
    .input(z.object({ service: z.string(), credentialType: z.string(), value: z.string() }))
    .mutation(async ({ input, ctx }) => saveApiCredential(ctx.user.id, input.service, input.credentialType, input.value)),

  getApiCredentials: protectedProcedure.query(async ({ ctx }) => getUserApiCredentials(ctx.user.id)),

  validateCredentials: protectedProcedure
    .input(z.object({ platform: z.enum(["instagram", "youtube", "tiktok"]) }))
    .query(async ({ input, ctx }) => validateCredentials(ctx.user.id, input.platform)),
});
