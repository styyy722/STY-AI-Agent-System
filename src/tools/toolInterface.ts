// Every plugin tool must implement this interface.
// Drop a new folder in plugins/ with a tool.ts that exports a default
// matching this shape, and the registry picks it up automatically.

export interface ToolContext {
  mode: string;
  sessionId?: string;
  userInput: string;
  dryRun?: boolean;
  permittedToolPermissions?: ToolPermission[];
}

export interface ToolResult {
  success: boolean;
  output: string;     // text to prepend to the agent's context
  error?: string;
  dryRun?: boolean;
}

export type ToolPermission =
  | "context-read"
  | "network"
  | "filesystem-read"
  | "filesystem-write"
  | "code-execution"
  | "external-api";

export interface ToolSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  minLength?: number;
  maxLength?: number;
}

export interface ToolInputSchema {
  type: "object";
  required?: string[];
  properties: Record<string, ToolSchemaProperty>;
}

export interface AgentTool {
  // Unique slug — used as the folder name and identifier
  name: string;

  // One-line description shown in sty-agent tools and added to the system prompt
  description: string;

  // Category for filtering and display
  category: "search" | "data" | "finance" | "utility";

  // Declares the context shape this tool expects. The registry validates this
  // before execution so tool failures are caught early and auditable.
  inputSchema?: ToolInputSchema;

  // Permission labels required to run the tool. The registry compares these
  // with the current request and environment policy before execution.
  permissions?: ToolPermission[];

  // If true, execute() can return a non-side-effecting preview when dryRun is set.
  supportsDryRun?: boolean;

  // The tool decides if it should run for a given query/mode
  // Return true to auto-invoke, false to skip
  isRelevant(context: ToolContext): boolean;

  // The actual execution — must not throw; return success:false on error
  execute(context: ToolContext): Promise<ToolResult>;
}
