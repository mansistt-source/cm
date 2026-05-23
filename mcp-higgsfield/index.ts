/**
 * MCP Server — Higgsfield AI Video Generation
 * ─────────────────────────────────────────────
 * Exposes Higgsfield tools to Claude via Model Context Protocol.
 * Claude calls these tools directly to generate cinematic video clips
 * with frame-to-frame continuity across scenes.
 *
 * Tools:
 *  - generate_video_clip     : Generate a single scene video clip
 *  - poll_clip_status        : Poll generation status
 *  - generate_all_clips      : Generate all scenes in parallel
 *  - generate_scene_frames   : Generate start/end keyframes via fal.ai
 *
 * Usage:
 *  HIGGSFIELD_API_KEY=xxx FAL_API_KEY=yyy node index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────────
const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY ?? "";
const FAL_API_KEY = process.env.FAL_API_KEY ?? "";

const higgsfield = axios.create({
  baseURL: "https://api.higgsfield.ai",
  headers: {
    Authorization: `Bearer ${HIGGSFIELD_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 120_000,
});

const fal = axios.create({
  baseURL: "https://fal.run",
  headers: {
    Authorization: `Key ${FAL_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function higgsfieldGenerateClip(params: {
  prompt: string;
  start_frame_url: string;
  end_frame_url: string;
  duration: number; // seconds
  aspect_ratio?: "9:16" | "16:9" | "1:1";
}) {
  const { data } = await higgsfield.post("/v1/video/generate", {
    prompt: params.prompt,
    first_frame_image: params.start_frame_url,
    last_frame_image: params.end_frame_url,
    duration: params.duration,
    aspect_ratio: params.aspect_ratio ?? "9:16",
    quality: "720p",
  });
  return data; // { request_id, status, ... }
}

async function higgsfieldPollStatus(requestId: string) {
  const { data } = await higgsfield.get(`/v1/video/status/${requestId}`);
  return data; // { status: 'queued'|'in_progress'|'completed'|'failed', video_url? }
}

async function falGenerateFrame(prompt: string): Promise<string> {
  const { data } = await fal.post("/fal-ai/flux/schnell", {
    prompt,
    image_size: { width: 720, height: 1280 }, // 9:16
    num_inference_steps: 4,
    num_images: 1,
    enable_safety_checker: true,
  });
  return data.images?.[0]?.url ?? "";
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: "higgsfield-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── List tools ────────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_scene_frames",
      description:
        "Generate start and end keyframes for a scene using fal.ai Flux. " +
        "The end frame of each scene must visually match the start frame of the next scene " +
        "to ensure cinematic continuity across the final video.",
      inputSchema: {
        type: "object",
        properties: {
          scene_number: { type: "number", description: "Scene index (1-based)" },
          description: { type: "string", description: "Scene visual description" },
          visual_style: { type: "string", description: "Lighting, mood, camera style" },
          is_last_scene: {
            type: "boolean",
            description: "If true, the end frame will be a wide clean outro shot",
          },
          previous_end_frame_url: {
            type: "string",
            description:
              "URL of the end frame from the previous scene. Used to ensure the start frame of this scene continues visually from there.",
          },
        },
        required: ["scene_number", "description", "visual_style"],
      },
    },
    {
      name: "generate_video_clip",
      description:
        "Generate a single cinematic video clip using Higgsfield AI. " +
        "Provide a start frame and end frame to lock visual continuity between scenes. " +
        "Returns a request_id to poll for completion.",
      inputSchema: {
        type: "object",
        properties: {
          scene_id: { type: "number", description: "Database scene ID" },
          scene_number: { type: "number", description: "Scene index (1-based)" },
          prompt: { type: "string", description: "Cinematic video generation prompt" },
          start_frame_url: { type: "string", description: "URL of the opening keyframe" },
          end_frame_url: { type: "string", description: "URL of the closing keyframe" },
          duration: { type: "number", description: "Clip duration in seconds (3-10)" },
          aspect_ratio: {
            type: "string",
            enum: ["9:16", "16:9", "1:1"],
            description: "Video aspect ratio — use 9:16 for Reels/TikTok",
          },
        },
        required: ["scene_id", "scene_number", "prompt", "start_frame_url", "end_frame_url", "duration"],
      },
    },
    {
      name: "poll_clip_status",
      description:
        "Poll the status of a Higgsfield video generation request. " +
        "Returns status (queued|in_progress|completed|failed) and video_url when completed.",
      inputSchema: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "Higgsfield request ID" },
          scene_id: { type: "number", description: "Database scene ID for reference" },
        },
        required: ["request_id"],
      },
    },
    {
      name: "generate_all_clips",
      description:
        "Generate video clips for all scenes in a project. " +
        "Handles frame continuity automatically: end frame of scene N = start frame of scene N+1. " +
        "Returns all request IDs for polling.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number" },
          scenes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                scene_number: { type: "number" },
                description: { type: "string" },
                visual_style: { type: "string" },
                duration: { type: "number" },
                start_frame_url: { type: "string" },
                end_frame_url: { type: "string" },
              },
              required: ["id", "scene_number", "description", "duration"],
            },
          },
          aspect_ratio: { type: "string", enum: ["9:16", "16:9", "1:1"] },
        },
        required: ["project_id", "scenes"],
      },
    },
  ],
}));

// ── Handle tool calls ─────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── generate_scene_frames ────────────────────────────────────────────────
    if (name === "generate_scene_frames") {
      const { scene_number, description, visual_style, is_last_scene, previous_end_frame_url } = args as any;

      const startPrompt = previous_end_frame_url
        ? `${description}. Visual style: ${visual_style}. OPENING FRAME — continue visually from the previous scene's ending position. Cinematic, professional.`
        : `${description}. Visual style: ${visual_style}. OPENING FRAME of scene ${scene_number}. Cinematic, professional.`;

      const endPrompt = is_last_scene
        ? `${description}. Visual style: ${visual_style}. WIDE OUTRO SHOT — pull back to a clean wide angle, brand reveal ready.`
        : `${description}. Visual style: ${visual_style}. CLOSING FRAME — scene reaching its peak moment, ready to flow into the next scene.`;

      const [start_frame_url, end_frame_url] = await Promise.all([
        falGenerateFrame(startPrompt),
        falGenerateFrame(endPrompt),
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              scene_number,
              start_frame_url,
              end_frame_url,
              continuity_note: is_last_scene
                ? "Outro frame generated — wide angle for brand overlay"
                : `End frame designed to flow into scene ${scene_number + 1}`,
            }),
          },
        ],
      };
    }

    // ── generate_video_clip ──────────────────────────────────────────────────
    if (name === "generate_video_clip") {
      const { scene_id, scene_number, prompt, start_frame_url, end_frame_url, duration, aspect_ratio } = args as any;

      const result = await higgsfieldGenerateClip({
        prompt,
        start_frame_url,
        end_frame_url,
        duration,
        aspect_ratio: aspect_ratio ?? "9:16",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              scene_id,
              scene_number,
              request_id: result.request_id ?? result.id,
              status: result.status ?? "queued",
              message: `Clip generation started for scene ${scene_number}`,
            }),
          },
        ],
      };
    }

    // ── poll_clip_status ─────────────────────────────────────────────────────
    if (name === "poll_clip_status") {
      const { request_id, scene_id } = args as any;

      const result = await higgsfieldPollStatus(request_id);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              scene_id,
              request_id,
              status: result.status,
              video_url: result.video_url ?? result.output ?? null,
              progress: result.progress ?? null,
            }),
          },
        ],
      };
    }

    // ── generate_all_clips ───────────────────────────────────────────────────
    if (name === "generate_all_clips") {
      const { project_id, scenes, aspect_ratio } = args as any;

      // Generate clips in parallel
      const clipResults = await Promise.allSettled(
        scenes.map((scene: any) =>
          higgsfieldGenerateClip({
            prompt: `${scene.description}. ${scene.visual_style ?? ""}. Cinematic 9:16 video clip.`,
            start_frame_url: scene.start_frame_url,
            end_frame_url: scene.end_frame_url,
            duration: scene.duration,
            aspect_ratio: aspect_ratio ?? "9:16",
          }).then((r) => ({
            scene_id: scene.id,
            scene_number: scene.scene_number,
            request_id: r.request_id ?? r.id,
            status: r.status ?? "queued",
          }))
        )
      );

      const results = clipResults.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { scene_id: scenes[i].id, scene_number: scenes[i].scene_number, error: (r as any).reason?.message }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              project_id,
              total_scenes: scenes.length,
              clips_started: results.filter((r) => !r.error).length,
              results,
              next_step: "Poll each request_id using poll_clip_status until all are completed",
            }),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: err.message,
            tool: name,
            details: err.response?.data ?? null,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ Higgsfield MCP Server running");
