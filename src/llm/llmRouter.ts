import "dotenv/config";
import type { LLMClient } from "./llmInterface.js";

// Returns the correct LLM client based on LLM_PROVIDER in .env
// Defaults to Claude if not set
export function getLLMClient(): LLMClient {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase().trim();

  if (provider === "openai") {
    // Lazy import so OpenAI SDK is only loaded when actually needed
    const { OpenAIClient } = require("./openaiClient.js");
    return new OpenAIClient();
  }

  // Default: Anthropic/Claude
  // Wraps the existing callClaude function to match the LLMClient interface
  return {
    async complete(request) {
      const { callClaude } = await import("./claudeClient.js");
      return callClaude(request);
    },
  };
}
