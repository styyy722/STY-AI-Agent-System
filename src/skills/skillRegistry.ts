import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import type { ConversationMessage } from "../tools/sessionMemory.js";

export interface ClaudeRequest {
  systemPrompt: string;
  userInput: string;
  usePremiumModel?: boolean;
  maxTokens?: number;
  history?: ConversationMessage[];
}

export interface ClaudeResponse {
  text: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const defaultModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const premiumModel = process.env.ANTHROPIC_MODEL_PREMIUM || "claude-opus-4-7";
  const model = request.usePremiumModel ? premiumModel : defaultModel;

  const agentStyle = process.env.AGENT_STYLE || "professional";
  const outputFormat = process.env.OUTPUT_FORMAT || "markdown";
  const enrichedSystemPrompt = `${request.systemPrompt}\n\nResponse style: ${agentStyle}.\nOutput format: ${outputFormat}.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      text: "Claude API key is missing. Please create a .env file and add ANTHROPIC_API_KEY=your_api_key_here."
    };
  }

  // Build message list: prior history + current user message
  const messages: Anthropic.MessageParam[] = [
    ...(request.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user", content: request.userInput }
  ];

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: request.maxTokens ?? parseInt(process.env.MAX_TOKENS || "0") || 4000,
      system: enrichedSystemPrompt,
      messages
    });

    const text = message.content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }
        return "";
      })
      .join("\n")
      .trim();

    return {
      text: text || "Claude returned an empty response."
    };
  } catch (error) {
    return {
      text: `Claude API error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
