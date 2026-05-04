import "dotenv/config";
import type { LLMClient, LLMRequest, LLMResponse } from "./llmInterface.js";

// OpenAI models mapped to match Claude's premium/standard split
const STANDARD_MODEL = "gpt-4o-mini";
const PREMIUM_MODEL = "gpt-4o";

export class OpenAIClient implements LLMClient {
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is missing.\n" +
        "  1. Add OPENAI_API_KEY=sk-... to your .env file\n" +
        "  Get a key at: https://platform.openai.com/api-keys"
      );
    }

    const model = request.usePremiumModel ? PREMIUM_MODEL : STANDARD_MODEL;
    const maxTokens = request.maxTokens ?? 4000;

    // Build the messages array (system + history + current user message)
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: request.systemPrompt },
      ...(request.history ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: request.userInput },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 401) {
        throw new Error(`OpenAI authentication failed. Check your OPENAI_API_KEY.\n  Detail: ${errorBody}`);
      }
      if (response.status === 429) {
        throw new Error(`OpenAI rate limit reached. Please wait a moment and try again.\n  Detail: ${errorBody}`);
      }
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content?.trim();

    return {
      text: text || "OpenAI returned an empty response.",
    };
  }
}
