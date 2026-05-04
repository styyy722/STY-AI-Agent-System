import type { AgentTool, ToolContext, ToolResult } from "../../src/tools/toolInterface.js";
import { queryNeedsWebSearch, searchWeb, formatSearchContext } from "../../src/tools/webSearch.js";

const webSearchTool: AgentTool = {
  name: "web-search",
  description: "Searches the web for live data — current prices, news, interest rates, ASX filings.",
  category: "search",

  isRelevant(context: ToolContext): boolean {
    if (process.env.WEB_SEARCH_ENABLED !== "true") return false;
    return queryNeedsWebSearch(context.userInput);
  },

  async execute(context: ToolContext): Promise<ToolResult> {
    try {
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
