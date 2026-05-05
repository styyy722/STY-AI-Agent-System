import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ToolPermission } from "./toolInterface.js";

export type ToolAuditStatus =
  | "relevant"
  | "skipped"
  | "dry-run"
  | "success"
  | "error"
  | "denied"
  | "invalid";

export interface ToolAuditEntry {
  timestamp: string;
  traceId: string;
  toolName: string;
  mode: string;
  sessionId: string | null;
  status: ToolAuditStatus;
  permissions: ToolPermission[];
  durationMs?: number;
  reason?: string;
  inputChars: number;
  outputChars?: number;
}

function getAuditDir(): string {
  const projectDir = path.join(process.cwd(), "tool_audit");
  try {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.accessSync(projectDir, fs.constants.W_OK);
    return projectDir;
  } catch {
    const fallback = path.join(os.homedir(), ".sty-agent", "tool_audit");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getAuditPath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(getAuditDir(), `tools-${date}.jsonl`);
}

export function writeToolAudit(entry: ToolAuditEntry): void {
  try {
    fs.appendFileSync(getAuditPath(), JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // Tool auditing should never block a user request.
  }
}

export function getToolAuditDir_public(): string {
  return getAuditDir();
}
