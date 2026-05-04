import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import type { ConversationMessage } from "../tools/sessionMemory.js";
import { checkBudget } from "../tools/costTracker.js";

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

// Typed error classes so cli.ts can handle each case differently
export class BudgetExceededError extends Error {
  constructor(spentUSD: number, budgetUSD: number) {
    super(
      `Daily budget exceeded. Spent: $${spentUSD.toFixed(4)} / Limit: $${budgetUSD.toFixed(2)}.
` +
      `  Update DAILY_BUDGET_USD in .env to raise the limit, or wait until tomorrow.
` +
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

export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
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
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    return {
      text: text || "Claude returned an empty response."
    };

  } catch (error) {
    // Re-throw our own typed errors directly
    if (error instanceof MissingApiKeyError) throw error;

    // Map Anthropic SDK errors to typed errors
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ApiAuthError(error.message);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ApiRateLimitError(error.message);
    }
    if (error instanceof Anthropic.APIError) {
      throw new ApiError(`${error.status} ${error.message}`);
    }

    // Unexpected errors
    throw new ApiError(error instanceof Error ? error.message : String(error));
  }
}
