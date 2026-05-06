import type { AgentTool, ToolContext, ToolResult } from "../../src/tools/toolInterface.js";
import { queryNeedsWebSearch, searchWeb, formatSearchContext } from "../../src/tools/webSearch.js";

const webSearchTool: AgentTool = {
  name: "web-search",
  description: "Searches the web for live data — current prices, news, interest rates, ASX filings.",
  category: "search",
  permissions: ["context-read", "network", "external-api"],
  supportsDryRun: true,
  inputSchema: {
    type: "object",
    required: ["mode", "userInput"],
    properties: {
      mode: { type: "string", description: "Agent mode requesting the search" },
      sessionId: { type: "string", description: "Optional session identifier" },
      userInput: {
        type: "string",
        description: "User request to assess and search for",
        minLength: 1,
        maxLength: 120000
      },
      dryRun: { type: "boolean", description: "Preview execution without making a network call" }
    }
  },

  isRelevant(context: ToolContext): boolean {
    if (process.env.WEB_SEARCH_ENABLED !== "true") return false;
    return queryNeedsWebSearch(context.userInput);
  },

  async execute(context: ToolContext): Promise<ToolResult> {
    try {
      if (context.dryRun) {
        return {
          success: true,
          dryRun: true,
          output: `[Dry run] web-search would search the web for current context related to: ${context.userInput.slice(0, 240)}`
        };
      }

      const results = await searchWeb(context.userInput);
      const output = formatSearchContext(results);
      return { success: true, output };
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
};

export default webSearchTool;
