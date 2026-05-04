import type { AgentTool, ToolContext, ToolResult } from "../../src/tools/toolInterface.js";

// Note: code execution runs AFTER the LLM responds (it needs the response to extract code blocks).
// This plugin's isRelevant() is checked pre-LLM to inject instructions into the system prompt.
// The actual execution is still handled in coreAgent.ts post-response.
// This plugin exists so the tool is discoverable and its description appears in the system prompt.

const codeExecutionTool: AgentTool = {
  name: "code-execution",
  description: "Executes Python code blocks written by the agent. Active in data mode when CODE_EXECUTION_ENABLED=true.",
  category: "data",

  isRelevant(context: ToolContext): boolean {
    return (
      process.env.CODE_EXECUTION_ENABLED === "true" &&
      context.mode === "data"
    );
  },

  // Pre-execution: injects a reminder into context so Claude writes executable code
  async execute(_context: ToolContext): Promise<ToolResult> {
    return {
      success: true,
      output: "Note: Python code blocks you write will be automatically executed. Use print() to show results."
    };
  }
};

export default codeExecutionTool;
