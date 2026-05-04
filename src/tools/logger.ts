import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type LogStatus = "success" | "error";

export interface LogEntry {
  timestamp: string;
  sessionId: string | null;
  mode: string;
  model: string;
  inputChars: number;
  outputChars: number;
  inputSummary: string;
  outputSummary: string;
  skillsMatched: string[];
  status: LogStatus;
  errorMessage?: string;
  durationMs: number;
}

// Log directory: <project root>/logs/
// Falls back to OS home if project root is not writable
function getLogDir(): string {
  const projectLog = path.join(process.cwd(), "logs");
  try {
    fs.mkdirSync(projectLog, { recursive: true });
    fs.accessSync(projectLog, fs.constants.W_OK);
    return projectLog;
  } catch {
    const fallback = path.join(os.homedir(), ".sty-agent", "logs");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(getLogDir(), `agent-${date}.log`);
}

function truncate(text: string, maxChars = 300): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + `... [truncated, total ${text.length} chars]`;
}

export function writeLog(entry: LogEntry): void {
  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(getLogFilePath(), line, "utf-8");
  } catch {
    // Logging must never crash the agent — fail silently
  }
}

export function buildLogEntry(params: {
  mode: string;
  sessionId: string | undefined;
  model: string;
  userInput: string;
  output: string;
  skillsMatched: string[];
  status: LogStatus;
  errorMessage?: string;
  startTime: number;
}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId ?? null,
    mode: params.mode,
    model: params.model,
    inputChars: params.userInput.length,
    outputChars: params.output.length,
    inputSummary: truncate(params.userInput),
    outputSummary: truncate(params.output),
    skillsMatched: params.skillsMatched,
    status: params.status,
    errorMessage: params.errorMessage,
    durationMs: Date.now() - params.startTime
  };
}

export function getLogDir_public(): string {
  return getLogDir();
}
