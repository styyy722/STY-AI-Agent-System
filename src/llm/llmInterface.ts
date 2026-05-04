import type { ConversationMessage } from "../tools/sessionMemory.js";

// The standard shape every LLM client must accept
export interface LLMRequest {
  systemPrompt: string;
  userInput: string;
  usePremiumModel?: boolean;
  maxTokens?: number;
  history?: ConversationMessage[];
}

// The standard shape every LLM client must return
export interface LLMResponse {
  text: string;
}

// Any LLM client (Claude, OpenAI, etc.) must implement this
export interface LLMClient {
  complete(request: LLMRequest): Promise<LLMResponse>;
}
