import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { checkBudget } from "../tools/costTracker.js";
import type { LLMRequest, LLMResponse } from "./llmInterface.js";

export interface ClaudeRequest extends LLMRequest {}
export interface ClaudeResponse extends LLMResponse {}

export class BudgetExceededError extends Error {
  constructor(spentUSD: number, budgetUSD: number) {
    super(
      `Daily budget exceeded. Spent: $${spentUSD.toFixed(4)} / Limit: $${budgetUSD.toFixed(2)}.\n` +
      `  Update DAILY_BUDGET_USD in .env to raise the limit, or wait until tomorrow.\n` +
      `  Run: sty-agent usage to see full spend breakdown.`
    );
    this.name = "BudgetExceededError";
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "Anthropic API key is missing.\n" +
      "  1. Copy .env.example to .env\n" +
      "  2. Add your key: ANTHROPIC_API_KEY=sk-ant-...\n" +
      "  Get a key at: https://console.anthropic.com"
    );
    this.name = "MissingApiKeyError";
  }
}

export class ApiRateLimitError extends Error {
  constructor(message: string) {
    super(`Rate limit reached. Please wait a moment and try again.\n  Detail: ${message}`);
    this.name = "ApiRateLimitError";
  }
}

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(`API authentication failed. Check your ANTHROPIC_API_KEY in .env.\n  Detail: ${message}`);
    this.name = "ApiAuthError";
  }
}

export class ApiError extends Error {
  constructor(message: string) {
    super(`Claude API error: ${message}`);
    this.name = "ApiError";
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function callClaude(request: LLMRequest): Promise<LLMResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError();
  }

  const budget = checkBudget();
  if (!budget.allowed) {
    throw new BudgetExceededError(budget.spentUSD, budget.budgetUSD);
  }

  const defaultModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const premiumModel = process.env.ANTHROPIC_MODEL_PREMIUM || "claude-opus-4-7";
  const model = request.usePremiumModel ? premiumModel : defaultModel;

  const agentStyle = process.env.AGENT_STYLE || "professional";
  const outputFormat = process.env.OUTPUT_FORMAT || "markdown";
  const enrichedSystemPrompt = `${request.systemPrompt}\n\nResponse style: ${agentStyle}.\nOutput format: ${outputFormat}.`;

  // Build the last user message — plain string, or content array if images attached
  let lastUserContent: string | Anthropic.ContentBlockParam[];

  if (request.images && request.images.length > 0) {
    const blocks: Anthropic.ContentBlockParam[] = [];

    for (const img of request.images) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType,
          data: img.base64
        }
      });
    }

    blocks.push({ type: "text", text: request.userInput });
    lastUserContent = blocks;
  } else {
    lastUserContent = request.userInput;
  }

  const messages: Anthropic.MessageParam[] = [
    ...(request.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user", content: lastUserContent }
  ];

  const thinkingBudget = parseInt(process.env.THINKING_BUDGET_TOKENS || "0");
  const useThinking = thinkingBudget >= 1024;

  // ✅ Fixed: parentheses added to disambiguate ?? and ||
  const maxTokens = request.maxTokens ?? (parseInt(process.env.MAX_TOKENS || "0") || 4000);

  const effectiveMaxTokens = useThinking
    ? Math.max(maxTokens, thinkingBudget + 2000)
    : maxTokens;

  const createParams: any = {
    model,
    max_tokens: effectiveMaxTokens,
    system: enrichedSystemPrompt,
    messages
  };

  if (useThinking) {
    if (model.includes("opus-4-7")) {
      createParams.thinking = { type: "adaptive" };
    } else {
      createParams.thinking = { type: "enabled", budget_tokens: thinkingBudget };
    }
  }

  try {
    const message = await anthropic.messages.create(createParams);

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    return {
      text: text || "Claude returned an empty response."
    };

  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new ApiAuthError(error.message);
    if (error instanceof Anthropic.RateLimitError) throw new ApiRateLimitError(error.message);
    if (error instanceof Anthropic.APIError) throw new ApiError(`${error.status} ${error.message}`);
    throw new ApiError(error instanceof Error ? error.message : String(error));
  }
}
