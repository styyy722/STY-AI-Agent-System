import fs from "node:fs";
import path from "node:path";
import type { AgentTool, ToolContext, ToolResult } from "./toolInterface.js";

// Scans the plugins/ directory and loads every tool.ts it finds
async function discoverTools(): Promise<AgentTool[]> {
  const pluginsDir = path.join(process.cwd(), "plugins");

  if (!fs.existsSync(pluginsDir)) return [];

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const tools: AgentTool[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const toolFile = path.join(pluginsDir, entry.name, "tool.ts");
    const toolFileJs = path.join(pluginsDir, entry.name, "tool.js");

    const fileToLoad = fs.existsSync(toolFile)
      ? toolFile
      : fs.existsSync(toolFileJs) ? toolFileJs : null;

    if (!fileToLoad) continue;

    try {
      // Dynamic import — works with both .ts (via tsx) and .js (built)
      const mod = await import(fileToLoad);
      const tool: AgentTool = mod.default ?? mod.tool;

      if (tool && typeof tool.execute === "function") {
        tools.push(tool);
      }
    } catch (err) {
      // Never let a broken plugin crash the agent
      console.error(`[ToolRegistry] Failed to load plugin: ${entry.name}`, err instanceof Error ? err.message : String(err));
    }
  }

  return tools;
}

// Cache so we only scan the filesystem once per process
let _toolsCache: AgentTool[] | null = null;

export async function getAvailableTools(): Promise<AgentTool[]> {
  if (_toolsCache) return _toolsCache;
  _toolsCache = await discoverTools();
  return _toolsCache;
}

// Runs all tools that declare themselves relevant for the current context
// Returns combined output text to prepend to the agent's context
export async function runRelevantTools(context: ToolContext): Promise<{
  combinedOutput: string;
  toolsUsed: string[];
}> {
  const tools = await getAvailableTools();
  const toolsUsed: string[] = [];
  const outputs: string[] = [];

  for (const tool of tools) {
    try {
      if (!tool.isRelevant(context)) continue;

      const result: ToolResult = await tool.execute(context);

      if (result.success && result.output.trim()) {
        outputs.push(result.output);
        toolsUsed.push(tool.name);
      }
    } catch {
      // A crashing tool must never block the agent
    }
  }

  return {
    combinedOutput: outputs.join("\n\n"),
    toolsUsed
  };
}

// Builds a short tools summary for the system prompt
// so the agent knows what capabilities are available
export async function buildToolsSystemContext(): Promise<string> {
  const tools = await getAvailableTools();
  if (tools.length === 0) return "";

  const lines = [
    "Available tools (auto-invoked when relevant):",
    ...tools.map(t => `- ${t.name}: ${t.description}`)
  ];

  return lines.join("\n");
}

// For the CLI tools command
export async function listTools(): Promise<AgentTool[]> {
  return getAvailableTools();
}
