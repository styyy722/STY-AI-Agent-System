import type { ConversationMessage } from "../tools/sessionMemory.js";

// Supported image media types for multi-modal requests
export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// A single image attachment passed alongside a user message
export interface ImageAttachment {
  base64: string;
  mediaType: ImageMediaType;
  fileName?: string;
}

// The standard shape every LLM client must accept
export interface LLMRequest {
  systemPrompt: string;
  userInput: string;
  usePremiumModel?: boolean;
  maxTokens?: number;
  history?: ConversationMessage[];
  images?: ImageAttachment[];
}

// The standard shape every LLM client must return
export interface LLMResponse {
  text: string;
}

// Any LLM client (Claude, OpenAI, etc.) must implement this
export interface LLMClient {
  complete(request: LLMRequest): Promise<LLMResponse>;
}
