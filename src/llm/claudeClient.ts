import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

export interface ClaudeRequest {
  systemPrompt: string;
  userInput: string;
}

export interface ClaudeResponse {
  text: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      text: "Claude API key is missing. Please create a .env file and add ANTHROPIC_API_KEY=your_api_key_here."
    };
  }

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      system: request.systemPrompt,
      messages: [
        {
          role: "user",
          content: request.userInput
        }
      ]
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
