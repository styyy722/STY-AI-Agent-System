import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { runCoreAgent, type AgentMode } from "../src/agent/coreAgent.js";
import { runMultiAgent } from "../src/agent/multiAgent.js";
import { readBusinessFile } from "../src/tools/fileReader.js";
import { saveAgentOutputFile } from "../src/tools/outputWriter.js";
import {
  initDb,
  listSessions,
  loadSession,
  clearSession,
  appendToSession
} from "../src/tools/sessionMemory.js";
import {
  checkBudget,
  getDailySummary,
  getWeeklySummary
} from "../src/tools/costTracker.js";
import {
  getAllItems,
  getPendingItems,
  approveItem,
  rejectItem
} from "../src/tools/reviewQueue.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.cwd();
const uploadsDir = path.join(projectRoot, "web_uploads");
const outputsDir = path.join(projectRoot, "web_outputs");
const settingsPath = path.join(projectRoot, "web_settings.json");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(__dirname, "public")));

type WebSettings = {
  audience: string;
  outputFormat: string;
  detailLevel: "concise" | "balanced" | "detailed";
  includeAssumptions: boolean;
  includeNextSteps: boolean;
  deepAnalysis: boolean;
};

type UploadedFileContext = {
  id?: string;
  fileName: string;
  extension?: string;
  content?: string;
  warning?: string;
};

const defaultSettings: WebSettings = {
  audience: "Business user",
  outputFormat: "Structured response",
  detailLevel: "balanced",
  includeAssumptions: true,
  includeNextSteps: true,
  deepAnalysis: false
};

function safeFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const base =
    path
      .basename(fileName, ext)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 64) || "upload";

  return `${base}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
}

function getSettings(): WebSettings {
  if (!fs.existsSync(settingsPath)) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: Partial<WebSettings>): WebSettings {
  const next = {
    ...defaultSettings,
    ...getSettings(),
    ...settings
  };

  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function buildAdvancedInstruction(settings: WebSettings): string {
  return [
    "WEB INTERFACE SETTINGS:",
    `- Audience: ${settings.audience || "Business user"}`,
    `- Preferred output format: ${settings.outputFormat || "Structured response"}`,
    `- Detail level: ${settings.detailLevel}`,
    `- Include assumptions: ${settings.includeAssumptions ? "yes" : "no"}`,
    `- Include next steps: ${settings.includeNextSteps ? "yes" : "no"}`
  ].join("\n");
}

function buildUploadedFilePrompt(files: UploadedFileContext[] = []): string {
  const usableFiles = files.filter(
    file => file.content && file.content.trim().length > 0
  );

  if (usableFiles.length === 0) {
    return "";
  }

  return [
    "UPLOADED FILE CONTEXT:",
    ...usableFiles.map((file, index) =>
      [
        `\n--- File ${index + 1}: ${file.fileName} ---`,
        file.warning ? `Warning: ${file.warning}` : "",
        file.content,
        `--- End of ${file.fileName} ---`
      ]
        .filter(Boolean)
        .join("\n")
    )
  ].join("\n");
}

function listSavedOutputs() {
  if (!fs.existsSync(outputsDir)) {
    return [];
  }

  return fs
    .readdirSync(outputsDir)
    .filter(file => fs.statSync(path.join(outputsDir, file)).isFile())
    .map(file => {
      const fullPath = path.join(outputsDir, file);
      const stats = fs.statSync(fullPath);

      return {
        fileName: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
        downloadUrl: `/api/outputs/${encodeURIComponent(file)}`
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function createOutputFileName(format: string): string {
  const allowedFormats = ["md", "txt", "docx", "xlsx", "pdf", "ipynb"];
  const extension = allowedFormats.includes(format) ? format : "md";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `sty-agent-output-${stamp}.${extension}`;
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/settings", (_req, res) => {
  res.json(getSettings());
});

app.post("/api/settings", (req, res) => {
  res.json(saveSettings(req.body ?? {}));
});

app.get("/api/sessions", (_req, res) => {
  const sessions = listSessions().map(session => ({
    id: session.id,
    mode: session.mode,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    preview: session.messages[0]?.content?.slice(0, 120) ?? ""
  }));

  res.json({ sessions });
});

app.get("/api/sessions/:id", (req, res) => {
  const session = loadSession(req.params.id);

  if (!session) {
    return res.status(404).json({
      error: "Session not found"
    });
  }

  res.json(session);
});

app.delete("/api/sessions/:id", (req, res) => {
  const deleted = clearSession(req.params.id);
  res.json({ deleted });
});

app.post("/api/upload", (req, res) => {
  try {
    const { fileName, dataBase64, textContent } = req.body ?? {};

    if (!fileName) {
      return res.status(400).json({
        error: "No file name provided"
      });
    }

    const extension = path.extname(fileName).toLowerCase();
    const id = crypto.randomUUID();

    let content = "";
    let warning = "";

    if (typeof textContent === "string" && textContent.length > 0) {
      content = textContent.slice(0, 50000);

      if (textContent.length > 50000) {
        warning = "File content truncated to 50,000 characters for web analysis.";
      }
    } else if (dataBase64) {
      const filePath = path.join(uploadsDir, safeFileName(fileName));
      fs.writeFileSync(filePath, Buffer.from(dataBase64, "base64"));

      try {
        const fileContext = readBusinessFile(filePath);
        content = fileContext.content;
        warning = fileContext.warning ?? "";
      } catch (error) {
        warning =
          error instanceof Error
            ? error.message
            : "Could not extract file content.";

        content = `[Uploaded file saved as ${path.basename(
          filePath
        )}, but the server could not extract readable text from it.]`;
      }
    } else {
      return res.status(400).json({
        error: "No file content provided"
      });
    }

    res.json({
      id,
      fileName,
      extension,
      content,
      warning
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Upload failed"
    });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { mode, prompt, sessionId, files, settings } = req.body;
    const requestStartedAt = Date.now();
    const usageBefore = getDailySummary();

    if (!prompt) {
      return res.status(400).json({
        error: "No prompt provided"
      });
    }

    const validModes: AgentMode[] = ["general", "finance", "data", "report"];
    const resolvedMode: AgentMode = validModes.includes(mode)
      ? mode
      : "general";

    const resolvedSettings = {
      ...getSettings(),
      ...(settings ?? {})
    } as WebSettings;

    const filePrompt = buildUploadedFilePrompt(files ?? []);
    const advancedInstruction = buildAdvancedInstruction(resolvedSettings);

    const finalPrompt = [
      `User request:\n${prompt}`,
      filePrompt,
      advancedInstruction
    ]
      .filter(Boolean)
      .join("\n\n");

    if (resolvedSettings.deepAnalysis) {
      const result = await runMultiAgent({
        mode: resolvedMode,
        userInput: finalPrompt,
        sessionId
      });

      if (sessionId) {
        appendToSession(sessionId, resolvedMode, prompt, result.finalOutput);
      }

      const usageAfter = getDailySummary();
      const estimatedCostUSD = Math.max(
        0,
        Number(usageAfter.totalCostUSD ?? 0) - Number(usageBefore.totalCostUSD ?? 0)
      );
      
      return res.json({
        response: result.finalOutput,
        title: `STY Agent — Deep Analysis (${resolvedMode})`,
        sessionId,
        deepAnalysis: true,
        elapsedMs: Date.now() - requestStartedAt,
        estimatedCostUSD,
        steps: result.steps.map(step => ({
          role: step.role,
          durationMs: step.durationMs
        }))
      });
    }

    const result = await runCoreAgent({
      mode: resolvedMode,
      userInput: finalPrompt,
      sessionId
    });

    const usageAfter = getDailySummary();
    const estimatedCostUSD = Math.max(
      0,
      Number(usageAfter.totalCostUSD ?? 0) - Number(usageBefore.totalCostUSD ?? 0)
    );
    
    res.json({
      response: result.summary,
      title: result.title,
      nextSteps: result.nextSteps,
      sessionId: result.sessionId,
      confidence: result.confidence,
      confidenceBlock: result.confidenceBlock,
      reviewQueued: result.reviewQueued,
      reviewId: result.reviewId,
      toolsUsed: result.toolsUsed,
      codeExecuted: result.codeExecuted,
      memoriesUsed: result.memoriesUsed,
      elapsedMs: Date.now() - requestStartedAt,
      estimatedCostUSD
    });
  } catch (error: any) {
    console.error("Agent error:", error);

    res.status(500).json({
      error: error.message || "Something went wrong"
    });
  }
});

app.get("/api/usage", (_req, res) => {
  res.json({
    budget: checkBudget(),
    today: getDailySummary(),
    week: getWeeklySummary()
  });
});

app.get("/api/review", (req, res) => {
  const status = String(req.query.status ?? "all");
  const items = status === "pending" ? getPendingItems() : getAllItems();

  res.json({ items });
});

app.post("/api/review/:id/approve", (req, res) => {
  const item = approveItem(
    req.params.id,
    req.body?.reviewedBy ?? "web-user",
    req.body?.note
  );

  if (!item) {
    return res.status(404).json({
      error: "Review item not found"
    });
  }

  res.json(item);
});

app.post("/api/review/:id/reject", (req, res) => {
  const item = rejectItem(
    req.params.id,
    req.body?.reviewedBy ?? "web-user",
    req.body?.note
  );

  if (!item) {
    return res.status(404).json({
      error: "Review item not found"
    });
  }

  res.json(item);
});

app.get("/api/outputs", (_req, res) => {
  res.json({
    outputs: listSavedOutputs()
  });
});

app.post("/api/save-output", async (req, res) => {
  try {
    const { title, summary, nextSteps, format } = req.body ?? {};

    if (!summary) {
      return res.status(400).json({
        error: "No output content provided"
      });
    }

    const fileName = createOutputFileName(format ?? "md");
    const outputPath = path.join(outputsDir, fileName);

    await saveAgentOutputFile(outputPath, {
      title: title ?? "STY Agent Output",
      summary,
      nextSteps: Array.isArray(nextSteps) ? nextSteps : [],
      notebookCode: "# Add your follow-up analysis code here"
    });

    res.json({
      fileName,
      downloadUrl: `/api/outputs/${encodeURIComponent(fileName)}`
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Could not save output"
    });
  }
});

app.get("/api/outputs/:fileName", (req, res) => {
  const requested = path.basename(req.params.fileName);
  const filePath = path.join(outputsDir, requested);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Output file not found");
  }

  res.download(filePath, requested);
});

async function startServer() {
  await initDb();

  app.listen(PORT, () => {
    console.log("\n✅ STY Agent Web UI is running");
    console.log(`👉 Open this in your browser: http://localhost:${PORT}\n`);
  });
}

startServer().catch(error => {
  console.error("Failed to start web server:", error);
  process.exit(1);
});
