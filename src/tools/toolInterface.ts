// Every plugin tool must implement this interface.
// Drop a new folder in plugins/ with a tool.ts that exports a default
// matching this shape, and the registry picks it up automatically.

export interface ToolContext {
  mode: string;
  sessionId?: string;
  userInput: string;
}

export interface ToolResult {
  success: boolean;
  output: string;     // text to prepend to the agent's context
  error?: string;
}

export interface AgentTool {
  // Unique slug — used as the folder name and identifier
  name: string;

  // One-line description shown in sty-agent tools and added to the system prompt
  description: string;

  // Category for filtering and display
  category: "search" | "data" | "finance" | "utility";

  // The tool decides if it should run for a given query/mode
  // Return true to auto-invoke, false to skip
  isRelevant(context: ToolContext): boolean;

  // The actual execution — must not throw; return success:false on error
  execute(context: ToolContext): Promise<ToolResult>;
}
