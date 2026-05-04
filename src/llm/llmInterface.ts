import type { ConversationMessage } from "../tools/sessionMemory.js";

// Supported image formats for both Claude and OpenAI vision
export type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface ImageAttachment {
  base64: string;
  mediaType: ImageMediaType;
}

export interface LLMRequest {
  systemPrompt: string;
  userInput: string;
  usePremiumModel?: boolean;
  maxTokens?: number;
  history?: ConversationMessage[];
  images?: ImageAttachment[];   // NEW: optional image attachments
}

export interface LLMResponse {
  text: string;
}

export interface LLMClient {
  complete(request: LLMRequest): Promise<LLMResponse>;
}
