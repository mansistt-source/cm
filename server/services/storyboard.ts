import { invokeLLM } from "../_core/llm";
import { logPipelineEvent } from "../db";

export interface StoryboardScene {
  sceneNumber: number;
  description: string;
  duration: number;
  visualStyle: string;
}

export interface Storyboard {
  scenes: StoryboardScene[];
  totalDuration: number;
}

/**
 * Generate a storyboard from a user prompt using LLM
 * Breaks down the video idea into individual scenes with descriptions, durations, and visual styles
 */
export async function generateStoryboard(
  projectId: number,
  userPrompt: string,
  videoLength: number,
  genre: string
): Promise<Storyboard> {
  try {
    // Calculate approximate duration per scene (assuming 3-5 scenes for most videos)
    const estimatedSceneCount = Math.max(3, Math.ceil(videoLength / 5));
    const durationPerScene = Math.floor(videoLength / estimatedSceneCount);

    const systemPrompt = `You are an expert video director and storyboard creator. Your task is to break down a video concept into a detailed storyboard with individual scenes.

For each scene, provide:
- A clear, descriptive prompt for video generation
- Visual style notes (lighting, mood, cinematography style, etc.)
- Duration in seconds

The storyboard should tell a cohesive story that matches the user's vision. Each scene should flow naturally into the next.

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Scene description for video generation",
      "duration": 5,
      "visualStyle": "Visual style notes"
    }
  ],
  "totalDuration": 30
}`;

    const userMessage = `Create a detailed storyboard for a ${genre} video with the following concept:

"${userPrompt}"

The video should be approximately ${videoLength} seconds long. Break it down into ${estimatedSceneCount} scenes, each lasting about ${durationPerScene} seconds.

Ensure each scene has:
1. A vivid description suitable for AI video generation
2. Specific visual style notes (e.g., "cinematic, warm golden hour lighting, slow camera pan")
3. Appropriate duration

Make the storyboard compelling and visually diverse.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "storyboard",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sceneNumber: { type: "integer" },
                    description: { type: "string" },
                    duration: { type: "integer" },
                    visualStyle: { type: "string" },
                  },
                  required: ["sceneNumber", "description", "duration", "visualStyle"],
                  additionalProperties: false,
                },
              },
              totalDuration: { type: "integer" },
            },
            required: ["scenes", "totalDuration"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response content from LLM");
    }

    const contentStr = typeof content === 'string' ? content : '';
    const storyboard: Storyboard = JSON.parse(contentStr);

    // Log successful generation
    await logPipelineEvent(projectId, "storyboard_generated", "storyboard_generation", "Storyboard generated successfully", {
      sceneCount: storyboard.scenes.length,
      totalDuration: storyboard.totalDuration,
    });

    return storyboard;
  } catch (error) {
    console.error("[Storyboard] Generation failed:", error);
    await logPipelineEvent(projectId, "error_occurred", "storyboard_generation", `Storyboard generation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Regenerate a specific scene's description using LLM
 * Useful when user wants to modify or improve a scene
 */
export async function regenerateSceneDescription(
  projectId: number,
  sceneNumber: number,
  originalDescription: string,
  genre: string,
  feedback: string
): Promise<{ description: string; visualStyle: string }> {
  try {
    const systemPrompt = `You are an expert video director. Your task is to improve a scene description based on user feedback.

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "description": "Improved scene description for video generation",
  "visualStyle": "Updated visual style notes"
}`;

    const userMessage = `Please improve scene ${sceneNumber} of a ${genre} video.

Original description: "${originalDescription}"

User feedback: "${feedback}"

Create an improved description that incorporates the feedback while maintaining the ${genre} style. Ensure the description is vivid and suitable for AI video generation.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_improvement",
          strict: true,
          schema: {
            type: "object",
            properties: {
              description: { type: "string" },
              visualStyle: { type: "string" },
            },
            required: ["description", "visualStyle"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response content from LLM");
    }

    const contentStr = typeof content === 'string' ? content : '';
    const result = JSON.parse(contentStr);

    await logPipelineEvent(projectId, "scene_regenerated", "storyboard_editing", `Scene ${sceneNumber} regenerated based on user feedback`);

    return result;
  } catch (error) {
    console.error("[Storyboard] Scene regeneration failed:", error);
    throw error;
  }
}
