import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

const EXECUTION_TIMEOUT_MS = 30_000; // 30 seconds max per script
const MAX_OUTPUT_CHARS = 4000;       // cap output so it doesn't flood the response

// Writes code to a temp file and executes it with Python
export async function executePythonCode(code: string): Promise<ExecutionResult> {
  // Write code to a temporary file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `sty_agent_exec_${Date.now()}.py`);

  try {
    fs.writeFileSync(tmpFile, code, "utf-8");
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: `Failed to write temp file: ${err instanceof Error ? err.message : String(err)}`,
      exitCode: -1,
      timedOut: false,
      durationMs: 0
    };
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn("python3", [tmpFile], {
      timeout: EXECUTION_TIMEOUT_MS,
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, EXECUTION_TIMEOUT_MS);

    child.on("close", (exitCode: number | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

      // Trim output to avoid flooding context
      const trimmedStdout = stdout.length > MAX_OUTPUT_CHARS
        ? stdout.slice(0, MAX_OUTPUT_CHARS) + `\n... [output truncated at ${MAX_OUTPUT_CHARS} chars]`
        : stdout;

      const trimmedStderr = stderr.length > MAX_OUTPUT_CHARS
        ? stderr.slice(0, MAX_OUTPUT_CHARS) + `\n... [truncated]`
        : stderr;

      resolve({
        success: (exitCode === 0) && !timedOut,
        stdout: trimmedStdout.trim(),
        stderr: trimmedStderr.trim(),
        exitCode: exitCode ?? -1,
        timedOut,
        durationMs
      });
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

      resolve({
        success: false,
        stdout: "",
        stderr: err.message.includes("ENOENT")
          ? "Python 3 not found. Make sure python3 is installed and available in your PATH."
          : err.message,
        exitCode: -1,
        timedOut: false,
        durationMs: Date.now() - startTime
      });
    });
  });
}

// Formats a result into a readable block to append to the agent response
export function formatExecutionResult(result: ExecutionResult, blockIndex: number): string {
  const label = `Code Block ${blockIndex + 1}`;

  if (result.timedOut) {
    return `\n\n--- ${label} Execution: TIMED OUT (>${EXECUTION_TIMEOUT_MS / 1000}s) ---\nThe script was stopped after ${EXECUTION_TIMEOUT_MS / 1000} seconds.`;
  }

  if (!result.success) {
    const errorDetail = result.stderr || "Unknown error";
    return `\n\n--- ${label} Execution: ERROR (exit code ${result.exitCode}) ---\n${errorDetail}`;
  }

  const output = result.stdout || "(no output)";
  return `\n\n--- ${label} Execution Output (${result.durationMs}ms) ---\n${output}`;
}
