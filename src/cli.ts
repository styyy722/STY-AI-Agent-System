#!/usr/bin/env node

import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { runCoreAgent, type AgentMode } from "./agent/coreAgent.js";
import { readBusinessFile, buildFilePrompt } from "./tools/fileReader.js";
import { saveAgentOutputFile } from "./tools/outputWriter.js";
import {
  getAvailableSkills,
  type SkillCategory
} from "./skills/skillRegistry.js";
import {
  clearSession,
  listSessions,
  initDb,
  getDbPath_public
} from "./tools/sessionMemory.js";
import { getLogDir_public } from "./tools/logger.js";
import {
  getDailySummary,
  getWeeklySummary,
  getDailyBudgetUSD,
  getDailySpend,
  getLedgerDir_public
} from "./tools/costTracker.js";
import {
  checkModeAccess,
  checkFileAccess,
  checkCanExport,
  checkCanApproveReview,
  getCurrentUser,
  writeDefaultPolicy
} from "./tools/accessControl.js";
import {
  getPendingItems,
  getAllItems,
  approveItem,
  rejectItem,
  getItemById,
  exportApprovedOutput,
  getQueueDir_public
} from "./tools/reviewQueue.js";
import { validateAgentCommand } from "./tools/inputValidator.js";
import {
  MissingApiKeyError,
  ApiRateLimitError,
  ApiAuthError,
  ApiError,
  BudgetExceededError
} from "./llm/claudeClient.js";
import ora from "ora";

const program = new Command();

interface CommandOptions {
  file?: string;
  output?: string;
  session?: string;
}

interface SkillsCommandOptions {
  category?: SkillCategory;
}

async function handleAgentCommand(
  mode: AgentMode,
  userInput: string,
  options: CommandOptions = {}
) {
  validateAgentCommand(userInput, options);

  const modeAccess = checkModeAccess(mode);
  if (!modeAccess.allowed) {
    console.error("");
    console.error("Access denied: " + modeAccess.reason);
    console.error("");
    process.exit(1);
  }

  const spinnerLabels: Record<string, string> = {
    general: "Thinking...",
    finance: "Running finance analysis...",
    data: "Analysing data...",
    report: "Drafting report..."
  };

  let finalUserInput = userInput;

  if (options.file) {
    const fileAccess = checkFileAccess(options.file);
    if (!fileAccess.allowed) {
      console.error("");
      console.error("File access denied: " + fileAccess.reason);
      console.error("");
      process.exit(1);
    }
    if (fileAccess.warning) {
      console.warn("");
      console.warn("⚠ Data classification warning: " + fileAccess.warning);
      console.warn("");
    }
    try {
      const fileContext = readBusinessFile(options.file);
      const filePrompt = buildFilePrompt(fileContext);

      finalUserInput = `
User request:
${userInput}

${filePrompt}
`;
    } catch (error) {
      console.error("");
      console.error("File error:");
      console.error(error instanceof Error ? error.message : "Unknown file error");
      console.error("");
      process.exit(1);
    }
  }

  const spinner = ora(spinnerLabels[mode] ?? "Thinking...").start();

  let response;
  try {
    response = await runCoreAgent({
      mode,
      userInput: finalUserInput,
      sessionId: options.session
    });
    spinner.succeed("Done");
  } catch (error) {
    spinner.fail("Failed");
    console.error("");
    if (error instanceof BudgetExceededError) {
      console.error("Budget Exceeded:");
      console.error(error.message);
    } else if (error instanceof MissingApiKeyError) {
      console.error("API Key Error:");
      console.error(error.message);
    } else if (error instanceof ApiAuthError) {
      console.error("Authentication Error:");
      console.error(error.message);
    } else if (error instanceof ApiRateLimitError) {
      console.error("Rate Limit Error:");
      console.error(error.message);
    } else if (error instanceof ApiError) {
      console.error("API Error:");
      console.error(error.message);
    } else {
      console.error("Unexpected error:");
      console.error(error instanceof Error ? error.message : String(error));
    }
    console.error("");
    process.exit(1);
  }

  console.log("");
  console.log("====================================");
  console.log(response.title);
  if (response.sessionId) {
    console.log(`Session: ${response.sessionId}`);
  }
  console.log("====================================");
  console.log("");
  console.log(response.summary);
  console.log("");

  if (response.nextSteps.length > 0) {
    console.log("Next steps:");
    response.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
  }

  if (response.confidenceBlock) {
    console.log(response.confidenceBlock);
  }

  if (response.reviewQueued && response.reviewId) {
    console.log("");
    console.log("  ⚑  This output has been added to the review queue.");
    console.log("     Review ID: " + response.reviewId);
    console.log("     Run: sty-agent review list");
    console.log("     Approve: sty-agent review approve " + response.reviewId);
    console.log("");
  }

    if (options.output) {
      if (response.reviewQueued && response.reviewId) {
        console.log("");
        console.log("Output was not saved because this response requires review first.");
        console.log(`Review ID: ${response.reviewId}`);
        console.log(`Approve with: sty-agent review approve ${response.reviewId}`);
        console.log(
          `Then export with: sty-agent review export ${response.reviewId} --output ${options.output}`
        );
        console.log("");
        return;
      }
  
      try {
        const savedFile = await saveAgentOutputFile(options.output, {
          title: response.title,
          summary: response.summary,
          nextSteps: response.nextSteps
        });
  
        console.log("");
        console.log(`Output saved to: ${savedFile.outputPath}`);
      } catch (error) {
        console.error("");
        console.error("Output save error:");
        console.error(error instanceof Error ? error.message : "Unknown output error");
        console.error("");
        process.exit(1);
      }
  }

  console.log("");
}

function printAvailableSkills(options: SkillsCommandOptions = {}) {
  const skills = getAvailableSkills();

  const filteredSkills = options.category
    ? skills.filter((skill) => skill.category === options.category)
    : skills;

  console.log("");
  console.log("====================================");
  console.log("Installed STY Agent Skills");
  console.log("====================================");
  console.log("");

  if (filteredSkills.length === 0) {
    console.log("No skills found.");
    console.log("");
    console.log("Check that your skill folders exist:");
    console.log("- finance_skills/");
    console.log("- data_skills/");
    console.log("- report_skills/");
    console.log("");
    return;
  }

  filteredSkills.forEach((skill, index) => {
    console.log(`${index + 1}. ${skill.name}`);
    console.log(`   Category: ${skill.category}`);
    console.log(`   Folder: ${skill.rootFolder}/${skill.folder}`);
    console.log(`   Description: ${skill.description}`);
    console.log("");
  });

  console.log(`Total skills found: ${filteredSkills.length}`);
  console.log("");
}

program
  .name("sty-agent")
  .description("A Claude-powered AI business agent for finance, data analytics, and reporting workflows.")
  .version("0.1.0");

program
  .command("hello")
  .description("Verify the agent is correctly set up and the API key works")
  .action(async () => {
    console.log("");
    console.log("STY AI Agent System — Setup Check");
    console.log("====================================");
    console.log("");

    let allPassed = true;

    // Check 1: .env file
    const fs = await import("node:fs");
    const path = await import("node:path");
    const envPath = path.join(process.cwd(), ".env");
    const envExists = fs.existsSync(envPath);
    console.log(envExists ? "✔ .env file found" : "✖ .env file not found — copy .env.example to .env");
    if (!envExists) allPassed = false;

    // Check 2: API key present
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const keyPresent = !!apiKey && apiKey !== "your_api_key_here";
    console.log(keyPresent ? "✔ ANTHROPIC_API_KEY is set" : "✖ ANTHROPIC_API_KEY is missing or still set to placeholder");
    if (!keyPresent) allPassed = false;

    // Check 3: API key works (live call)
    if (keyPresent) {
      const spinner = ora("Testing API connection...").start();
      try {
        const { callClaude } = await import("./llm/claudeClient.js");
        await callClaude({
          systemPrompt: "You are a test assistant. Reply with exactly: OK",
          userInput: "Reply with OK",
          maxTokens: 10
        });
        spinner.succeed("API connection successful");
      } catch (error) {
        spinner.fail("API connection failed");
        console.log("  " + (error instanceof Error ? error.message : String(error)));
        allPassed = false;
      }
    } else {
      console.log("  Skipping API test — fix the key first");
    }

    // Check 4: Skills loading
    const { getAvailableSkills: getSkills } = await import("./skills/skillRegistry.js");
    const skills = getSkills();
    console.log(
      skills.length > 0
        ? `✔ ${skills.length} skills loaded`
        : "✖ No skills found — check that finance_skills/, data_skills/, and report_skills/ exist"
    );
    if (skills.length === 0) allPassed = false;

    // Check 5: Session database
    const dbPath = getDbPath_public();
    const dbExists = fs.existsSync(dbPath);
    console.log(dbExists
      ? `✔ Session database: ${dbPath}`
      : `✔ Session database will be created at: ${dbPath} (on first use)`
    );

    // Summary
    console.log("");
    if (allPassed) {
      console.log("All checks passed. Your agent is ready to use.");
      console.log("");
      console.log('Try: sty-agent finance "Explain WACC"');
    } else {
      console.log("Some checks failed. Fix the issues above before using the agent.");
      process.exit(1);
    }
    console.log("");
  });

program
  .command("skills")
  .description("List installed agent skills")
  .option(
    "-c, --category <category>",
    "Filter skills by category: finance, data, report, or general"
  )
  .action((options: SkillsCommandOptions) => {
    printAvailableSkills(options);
  });

// Session management command
const sessionCmd = program
  .command("session")
  .description("Manage conversation sessions");

sessionCmd
  .command("list")
  .description("List all saved sessions")
  .action(() => {
    const sessions = listSessions();
    console.log("");
    console.log("====================================");
    console.log("Saved Sessions");
    console.log("====================================");
    console.log("");

    if (sessions.length === 0) {
      console.log("No sessions found.");
      console.log("");
      console.log("Start a session with: sty-agent finance \"your question\" --session my-session");
      console.log("");
      return;
    }

    sessions.forEach((s, i) => {
      const turns = s.messages.length / 2;
      const updated = new Date(s.updatedAt).toLocaleString();
      console.log(`${i + 1}. ${s.id}`);
      console.log(`   Mode: ${s.mode}  |  Turns: ${turns}  |  Last used: ${updated}`);
      console.log("");
    });
  });

sessionCmd
  .command("clear <sessionId>")
  .description("Clear a saved session by ID")
  .action((sessionId: string) => {
    const cleared = clearSession(sessionId);
    if (cleared) {
      console.log(`Session "${sessionId}" cleared.`);
    } else {
      console.log(`Session "${sessionId}" not found.`);
    }
  });

sessionCmd
  .command("clear-all")
  .description("Clear all saved sessions")
  .action(() => {
    const sessions = listSessions();
    if (sessions.length === 0) {
      console.log("No sessions to clear.");
      return;
    }
    sessions.forEach((s) => clearSession(s.id));
    console.log(`Cleared ${sessions.length} session(s).`);
  });

program
  .command("ask")
  .description("Ask the general business agent a question")
  .argument("<request>", "Your business request")
  .option("-f, --file <path>", "Attach a local file")
  .option("-o, --output <path>", "Save the agent response to a file")
  .option("-s, --session <id>", "Session ID to maintain conversation history")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("general", request, options);
  });

program
  .command("finance")
  .description("Run finance-related AI workflows")
  .argument("<request>", "Your finance request")
  .option("-f, --file <path>", "Attach a local file")
  .option("-o, --output <path>", "Save the agent response to a file")
  .option("-s, --session <id>", "Session ID to maintain conversation history")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("finance", request, options);
  });

program
  .command("data")
  .description("Run data analytics AI workflows")
  .argument("<request>", "Your data analytics request")
  .option("-f, --file <path>", "Attach a local file")
  .option("-o, --output <path>", "Save the agent response to a file")
  .option("-s, --session <id>", "Session ID to maintain conversation history")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("data", request, options);
  });

program
  .command("report")
  .description("Generate business reports and executive summaries")
  .argument("<request>", "Your reporting request")
  .option("-f, --file <path>", "Attach a local file")
  .option("-o, --output <path>", "Save the agent response to a file")
  .option("-s, --session <id>", "Session ID to maintain conversation history")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("report", request, options);
  });

const reviewCmd = program
  .command("review")
  .description("Manage the output review queue");

reviewCmd
  .command("list")
  .description("List all items in the review queue")
  .option("--pending", "Show only pending items")
  .action((options: { pending?: boolean }) => {
    const items = options.pending ? getPendingItems() : getAllItems();
    console.log("");
    console.log("====================================");
    console.log("Review Queue");
    console.log("====================================");
    console.log("");

    if (items.length === 0) {
      console.log(options.pending ? "No pending items." : "No items in the review queue.");
      console.log("");
      return;
    }

    items.forEach((item, i) => {
      const time = new Date(item.timestamp).toLocaleString();
      const statusIcon = item.status === "approved" ? "✔" : item.status === "rejected" ? "✖" : "⏳";
      console.log(`${i + 1}. [${statusIcon} ${item.status.toUpperCase()}] ${item.id}`);
      console.log(`   ${time} | ${item.mode} | Confidence: ${item.confidence.tier} (${item.confidence.score}/100)`);
      console.log(`   Request: ${item.userInput.slice(0, 80).replace(/\n/g, " ")}...`);
      if (item.status !== "pending") {
        console.log(`   Reviewed by: ${item.reviewedBy} | ${item.reviewNote ?? ""}`);
      }
      if (item.confidence.flags.length > 0) {
        console.log(`   Flags: ${item.confidence.flags.join(" | ")}`);
      }
      console.log("");
    });

    const pending = items.filter(i => i.status === "pending").length;
    console.log(`Total: ${items.length} item(s), ${pending} pending.`);
    console.log(`Queue directory: ${getQueueDir_public()}`);
    console.log(`Session database: ${getDbPath_public()}`);
    console.log("");
  });

reviewCmd
  .command("show <id>")
  .description("Show full details of a review item")
  .action((id: string) => {
    const item = getItemById(id);
    if (!item) {
      console.error(`Review item "${id}" not found.`);
      process.exit(1);
    }
    console.log("");
    console.log("====================================");
    console.log(`Review Item: ${item.id}`);
    console.log("====================================");
    console.log("");
    console.log(`Status:     ${item.status.toUpperCase()}`);
    console.log(`Mode:       ${item.mode}`);
    console.log(`Time:       ${new Date(item.timestamp).toLocaleString()}`);
    console.log(`Confidence: ${item.confidence.tier} (${item.confidence.score}/100)`);
    if (item.confidence.flags.length > 0) {
      console.log(`Flags:`);
      item.confidence.flags.forEach(f => console.log(`  • ${f}`));
    }
    console.log("");
    console.log("--- REQUEST ---");
    console.log(item.userInput);
    console.log("");
    console.log("--- OUTPUT ---");
    console.log(item.agentOutput);
    if (item.status !== "pending") {
      console.log("");
      console.log(`Reviewed by: ${item.reviewedBy} at ${new Date(item.reviewedAt!).toLocaleString()}`);
      if (item.reviewNote) console.log(`Note: ${item.reviewNote}`);
    }
    console.log("");
  });

reviewCmd
  .command("approve <id>")
  .description("Approve a review item")
  .option("-b, --by <name>", "Reviewer name", "reviewer")
  .option("-n, --note <note>", "Optional review note")
  .action((id: string, options: { by: string; note?: string }) => {
    const approveAccess = checkCanApproveReview();
    if (!approveAccess.allowed) {
      console.error("");
      console.error("Access denied: " + approveAccess.reason);
      console.error("");
      process.exit(1);
    }
    const item = approveItem(id, options.by, options.note);
    if (!item) {
      console.error(`Review item "${id}" not found.`);
      process.exit(1);
    }
    console.log("");
    console.log(`✔ Approved: ${id}`);
    console.log(`  To export: sty-agent review export ${id} --output outputs/approved-output.md`);
    console.log("");
  });

reviewCmd
  .command("reject <id>")
  .description("Reject a review item")
  .option("-b, --by <name>", "Reviewer name", "reviewer")
  .option("-n, --note <note>", "Reason for rejection")
  .action((id: string, options: { by: string; note?: string }) => {
    const item = rejectItem(id, options.by, options.note);
    if (!item) {
      console.error(`Review item "${id}" not found.`);
      process.exit(1);
    }
    console.log("");
    console.log(`✖ Rejected: ${id}`);
    if (options.note) console.log(`  Reason: ${options.note}`);
    console.log(`  Re-run the original command with more context to try again.`);
    console.log("");
  });

reviewCmd
  .command("export <id>")
  .description("Export an approved output to a file")
  .requiredOption("-o, --output <path>", "Output file path")
  .action((id: string, options: { output: string }) => {
    const exportAccess = checkCanExport();
    if (!exportAccess.allowed) {
      console.error("");
      console.error("Access denied: " + exportAccess.reason);
      console.error("");
      process.exit(1);
    }
    const success = exportApprovedOutput(id, options.output);
    if (!success) {
      console.error(`Cannot export: item "${id}" not found or not yet approved.`);
      process.exit(1);
    }
    console.log("");
    console.log(`✔ Exported approved output to: ${options.output}`);
    console.log("");
  });

program
  .command("policy")
  .description("Show and manage access policy")
  .option("--init", "Create a default access_policy.json in the project root")
  .action((options: { init?: boolean }) => {
    if (options.init) {
      writeDefaultPolicy();
      console.log("");
      console.log("✔ Default access policy written to: access_policy.json");
      console.log("  Edit this file to configure users, modes, and data classification rules.");
      console.log("");
      return;
    }

    const user = getCurrentUser();
    console.log("");
    console.log("====================================");
    console.log("STY Agent — Access Policy");
    console.log("====================================");
    console.log("");
    console.log(`Current user:    ${user.username}`);
    console.log(`Access level:    ${user.accessLevel}`);
    console.log(`Allowed modes:   ${user.allowedModes.join(", ")}`);
    console.log(`Daily budget:    $${user.maxDailyBudgetUSD.toFixed(2)}`);
    console.log(`Can export:      ${user.canExportOutputs ? "Yes" : "No"}`);
    console.log(`Can approve:     ${user.canApproveReviews ? "Yes" : "No"}`);
    console.log("");
    const policyPath = path.join(process.cwd(), "access_policy.json");

    const policyLabel = fs.existsSync(policyPath)
      ? "access_policy.json (custom)"
      : "default (no policy file found)";

    console.log(`Policy file: ${policyLabel}`);
    console.log("Run: sty-agent policy --init  to create a customisable policy file.");
    console.log("");
  });

program
  .command("usage")
  .description("Show API usage and estimated costs")
  .option("-w, --week", "Show the last 7 days")
  .action((options: { week?: boolean }) => {
    const budgetUSD = getDailyBudgetUSD();
    const spentToday = getDailySpend();
    const remainingUSD = Math.max(0, budgetUSD - spentToday);
    const pct = Math.min(100, (spentToday / budgetUSD) * 100);
    const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));

    console.log("");
    console.log("====================================");
    console.log("STY Agent — API Usage & Cost");
    console.log("====================================");
    console.log("");
    console.log(`Daily budget:  $${budgetUSD.toFixed(2)}`);
    console.log(`Spent today:   $${spentToday.toFixed(4)}`);
    console.log(`Remaining:     $${remainingUSD.toFixed(4)}`);
    console.log(`               [${bar}] ${pct.toFixed(1)}%`);
    console.log("");

    const days = options.week ? getWeeklySummary() : [getDailySummary()];

    days.forEach(day => {
      if (day.totalCalls === 0) return;
      console.log(`${day.date}  |  ${day.totalCalls} call(s)  |  ~${day.totalInputTokens + day.totalOutputTokens} tokens  |  $${day.totalCostUSD.toFixed(4)}`);

      Object.entries(day.byMode).forEach(([mode, stats]) => {
        console.log(`  ${mode.padEnd(8)} ${stats.calls} call(s)  $${stats.costUSD.toFixed(4)}`);
      });

      Object.entries(day.byModel).forEach(([model, stats]) => {
        console.log(`  ${model.padEnd(24)} ${stats.calls} call(s)  $${stats.costUSD.toFixed(4)}`);
      });
      console.log("");
    });

    console.log(`Usage data: ${getLedgerDir_public()}`);
    console.log(`Set DAILY_BUDGET_USD in .env to change the daily limit (current: $${budgetUSD.toFixed(2)})`);
    console.log("");
  });

program
  .command("logs")
  .description("Show the audit log directory and recent activity")
  .option("-n, --lines <number>", "Number of recent log entries to show", "20")
  .action(async (options: { lines: string }) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const logDir = getLogDir_public();
    const maxLines = parseInt(options.lines) || 20;

    console.log("");
    console.log("====================================");
    console.log("STY Agent Audit Logs");
    console.log("====================================");
    console.log("");
    console.log("Log directory: " + logDir);
    console.log("");

    if (!fs.existsSync(logDir)) {
      console.log("No logs found yet. Run a command first.");
      console.log("");
      return;
    }

    const files = fs.readdirSync(logDir)
      .filter((f: string) => f.endsWith(".log"))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log("No log files found.");
      console.log("");
      return;
    }

    const entries: string[] = [];
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const lines = fs
          .readFileSync(filePath, "utf-8")
          .split("\n")
          .filter((l: string) => l.trim());
      entries.unshift(...lines);
      if (entries.length >= maxLines) break;
    }

    const recent = entries.slice(-maxLines).reverse();

    recent.forEach((line: string, i: number) => {
      try {
        const entry = JSON.parse(line);
        const time = new Date(entry.timestamp).toLocaleString();
        const status = entry.status === "success" ? "✔" : "✖";
        const skills = entry.skillsMatched.length > 0
          ? " [" + entry.skillsMatched.join(", ") + "]"
          : "";
        const duration = (entry.durationMs / 1000).toFixed(1) + "s";

        const conf = entry.confidenceTier ? ` | ${entry.confidenceTier} confidence` : "";
        console.log(`${status} ${time} | ${entry.mode} | ${entry.model} | ${duration}${conf}`);
        console.log(`   Input:  ${entry.inputSummary.slice(0, 100).replace(/\n/g, " ")}`);
        if (entry.status === "error") {
          console.log(`   Error:  ${entry.errorMessage}`);
        } else {
          console.log(`   Output: ${entry.outputSummary.slice(0, 100).replace(/\n/g, " ")}`);
        }
        if (skills) console.log(`   Skills:${skills}`);
        if (entry.sessionId) console.log(`   Session: ${entry.sessionId}`);
        console.log("");
      } catch {
        // Skip malformed lines
      }
    });

    console.log(`Showing ${recent.length} of ${entries.length} total entries across ${files.length} log file(s).`);
    console.log(`Full logs: ${logDir}`);
    console.log("");
  });

// Initialise persistent session database before any command runs
initDb().then(() => {
  program.parseAsync();
}).catch((err) => {
  console.error("Failed to initialise session database:", err.message);
  process.exit(1);
});
