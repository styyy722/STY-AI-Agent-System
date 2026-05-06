import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  AgentTool,
  ToolContext,
  ToolInputSchema,
  ToolPermission,
  ToolResult
} from "./toolInterface.js";
import { writeToolAudit } from "./toolAudit.js";

const DEFAULT_TOOL_PERMISSIONS: ToolPermission[] = [
  "context-read",
  "network",
  "filesystem-read",
  "code-execution",
  "external-api"
];

function createTraceId(): string {
  return `tool-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function getAllowedPermissions(context: ToolContext): Set<ToolPermission> {
  const envValue = process.env.TOOL_ALLOWED_PERMISSIONS;
  const envPermissions = envValue
    ? envValue.split(",").map(p => p.trim()).filter(Boolean) as ToolPermission[]
    : DEFAULT_TOOL_PERMISSIONS;

  return new Set(context.permittedToolPermissions ?? envPermissions);
}

function validateToolInput(
  schema: ToolInputSchema | undefined,
  context: ToolContext
): string[] {
  if (!schema) return [];

  const errors: string[] = [];
  const data = context as unknown as Record<string, unknown>;

  for (const required of schema.required ?? []) {
    if (data[required] === undefined || data[required] === null || data[required] === "") {
      errors.push(`Missing required field: ${required}`);
    }
  }

  for (const [key, rule] of Object.entries(schema.properties)) {
    const value = data[key];
    if (value === undefined || value === null) continue;

    if (rule.type === "array") {
      if (!Array.isArray(value)) errors.push(`Field ${key} must be an array`);
      continue;
    }

    if (rule.type === "object") {
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(`Field ${key} must be an object`);
      }
      continue;
    }

    if (typeof value !== rule.type) {
      errors.push(`Field ${key} must be a ${rule.type}`);
      continue;
    }

    if (typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`Field ${key} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`Field ${key} must be at most ${rule.maxLength} characters`);
      }
    }
  }

  return errors;
}

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
  const traceId = createTraceId();
  const allowedPermissions = getAllowedPermissions(context);

  for (const tool of tools) {
    const permissions = tool.permissions ?? ["context-read"];
    const startedAt = Date.now();

    try {
      if (!tool.isRelevant(context)) continue;

      writeToolAudit({
        timestamp: new Date().toISOString(),
        traceId,
        toolName: tool.name,
        mode: context.mode,
        sessionId: context.sessionId ?? null,
        status: "relevant",
        permissions,
        inputChars: context.userInput.length
      });

      const missingPermissions = permissions.filter(
        permission => !allowedPermissions.has(permission)
      );

      if (missingPermissions.length > 0) {
        writeToolAudit({
          timestamp: new Date().toISOString(),
          traceId,
          toolName: tool.name,
          mode: context.mode,
          sessionId: context.sessionId ?? null,
          status: "denied",
          permissions,
          durationMs: Date.now() - startedAt,
          reason: `Missing permission(s): ${missingPermissions.join(", ")}`,
          inputChars: context.userInput.length
        });
        continue;
      }

      const validationErrors = validateToolInput(tool.inputSchema, context);
      if (validationErrors.length > 0) {
        writeToolAudit({
          timestamp: new Date().toISOString(),
          traceId,
          toolName: tool.name,
          mode: context.mode,
          sessionId: context.sessionId ?? null,
          status: "invalid",
          permissions,
          durationMs: Date.now() - startedAt,
          reason: validationErrors.join("; "),
          inputChars: context.userInput.length
        });
        continue;
      }

      if (context.dryRun && !tool.supportsDryRun) {
        const output = `[Dry run] Tool "${tool.name}" would run, but it does not declare dry-run support. Execution skipped.`;
        outputs.push(output);
        toolsUsed.push(`${tool.name}:dry-run-skipped`);
        writeToolAudit({
          timestamp: new Date().toISOString(),
          traceId,
          toolName: tool.name,
          mode: context.mode,
          sessionId: context.sessionId ?? null,
          status: "dry-run",
          permissions,
          durationMs: Date.now() - startedAt,
          reason: "Dry-run requested and tool does not support dry-run execution.",
          inputChars: context.userInput.length,
          outputChars: output.length
        });
        continue;
      }

      const result: ToolResult = await tool.execute(context);

      if (result.success && result.output.trim()) {
        outputs.push(result.output);
        toolsUsed.push(result.dryRun ? `${tool.name}:dry-run` : tool.name);
      }

      writeToolAudit({
        timestamp: new Date().toISOString(),
        traceId,
        toolName: tool.name,
        mode: context.mode,
        sessionId: context.sessionId ?? null,
        status: result.success ? (result.dryRun ? "dry-run" : "success") : "error",
        permissions,
        durationMs: Date.now() - startedAt,
        reason: result.error,
        inputChars: context.userInput.length,
        outputChars: result.output.length
      });
    } catch {
      writeToolAudit({
        timestamp: new Date().toISOString(),
        traceId,
        toolName: tool.name,
        mode: context.mode,
        sessionId: context.sessionId ?? null,
        status: "error",
        permissions,
        durationMs: Date.now() - startedAt,
        reason: "Tool threw an unhandled error.",
        inputChars: context.userInput.length
      });
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
    ...tools.map(t => {
      const permissions = (t.permissions ?? ["context-read"]).join(", ");
      const schemaFields = t.inputSchema
        ? Object.keys(t.inputSchema.properties).join(", ")
        : "standard context";

      return `- ${t.name}: ${t.description} | permissions: ${permissions} | input schema: ${schemaFields}`;
    })
  ];

  return lines.join("\n");
}

// For the CLI tools command
export async function listTools(): Promise<AgentTool[]> {
  return getAvailableTools();
}
