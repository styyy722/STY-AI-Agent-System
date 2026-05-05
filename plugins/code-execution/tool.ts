import type { AgentTool, ToolContext, ToolResult } from "../../src/tools/toolInterface.js";

// Note: code execution runs AFTER the LLM responds (it needs the response to extract code blocks).
// This plugin's isRelevant() is checked pre-LLM to inject instructions into the system prompt.
// The actual execution is still handled in coreAgent.ts post-response.
// This plugin exists so the tool is discoverable and its description appears in the system prompt.

const codeExecutionTool: AgentTool = {
  name: "code-execution",
  description: "Executes Python code blocks written by the agent. Active in data mode when CODE_EXECUTION_ENABLED=true.",
  category: "data",
  permissions: ["context-read", "code-execution"],
  supportsDryRun: true,
  inputSchema: {
    type: "object",
    required: ["mode", "userInput"],
    properties: {
      mode: { type: "string", description: "Agent mode requesting code execution" },
      sessionId: { type: "string", description: "Optional session identifier" },
      userInput: {
        type: "string",
        description: "User request that may lead to executable Python",
        minLength: 1,
        maxLength: 120000
      },
      dryRun: { type: "boolean", description: "Preview code execution without running Python" }
    }
  },

  isRelevant(context: ToolContext): boolean {
    return (
      process.env.CODE_EXECUTION_ENABLED === "true" &&
      context.mode === "data"
    );
  },

  // Pre-execution: injects a reminder into context so Claude writes executable code
  async execute(context: ToolContext): Promise<ToolResult> {
    if (context.dryRun) {
      return {
        success: true,
        dryRun: true,
        output: "[Dry run] Python code execution would be enabled for generated code blocks, but no code will be run."
      };
    }

    return {
      success: true,
      output: "Note: Python code blocks you write will be automatically executed. Use print() to show results."
    };
  }
};

export default codeExecutionTool;
