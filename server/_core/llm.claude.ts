/**
 * LLM Core — Claude API (Anthropic)
 * ─────────────────────────────────
 * Replaces the original Manus/Gemini integration with Claude.
 * Used for storyboard generation, scene descriptions, and caption writing.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type InvokeParams = {
  messages: Array<{ role: Role; content: string }>;
  maxTokens?: number;
  response_format?: { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown>; strict?: boolean } };
  responseFormat?: { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown>; strict?: boolean } };
};

export type InvokeResult = {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

/**
 * Invoke Claude — compatible with existing OpenAI-style call signatures
 * Automatically strips system messages and passes them as Claude's system param
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { messages, maxTokens, response_format, responseFormat } = params;

  // Separate system message from conversation
  const systemMsg = messages.find((m) => m.role === "system");
  const conversationMsgs = messages.filter((m) => m.role !== "system") as Message[];

  // Build system prompt — inject JSON instruction if schema response required
  const format = response_format ?? responseFormat;
  let systemPrompt = systemMsg?.content ?? "You are a helpful AI assistant.";

  if (format?.type === "json_schema") {
    systemPrompt +=
      "\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this schema: " +
      JSON.stringify(format.json_schema.schema) +
      "\nDo NOT include markdown code blocks, backticks, or any text outside the JSON.";
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens ?? 4096,
    system: systemPrompt,
    messages: conversationMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textContent = response.content.find((c) => c.type === "text");
  const text = textContent?.type === "text" ? textContent.text : "";

  return {
    choices: [
      {
        message: { role: "assistant", content: text },
        finish_reason: response.stop_reason ?? null,
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
    },
  };
}
