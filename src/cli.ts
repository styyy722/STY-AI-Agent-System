#!/usr/bin/env node

import { Command } from "commander";
import { runCoreAgent, type AgentMode } from "./agent/coreAgent.js";
import { readBusinessFile, buildFilePrompt } from "./tools/fileReader.js";
import {
  saveAgentOutput,
  formatSavedOutputContent
} from "./tools/outputWriter.js";
import {
  getAvailableSkills,
  type SkillCategory
} from "./skills/skillRegistry.js";
import {
  clearSession,
  listSessions
} from "./tools/sessionMemory.js";
import { validateAgentCommand } from "./tools/inputValidator.js";
import {
  MissingApiKeyError,
  ApiRateLimitError,
  ApiAuthError,
  ApiError
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

  const spinnerLabels: Record<string, string> = {
    general: "Thinking...",
    finance: "Running finance analysis...",
    data: "Analysing data...",
    report: "Drafting report..."
  };

  let finalUserInput = userInput;

  if (options.file) {
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
    if (error instanceof MissingApiKeyError) {
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

  if (options.output) {
    try {
      const savedContent = formatSavedOutputContent(
        response.title,
        response.summary,
        response.nextSteps
      );

      const savedFile = saveAgentOutput(options.output, savedContent);

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

    // Summary
    console.log("");
    if (allPassed) {
      console.log("All checks passed. Your agent is ready to use.");
      console.log("");
      console.log("Try: sty-agent finance "Explain WACC"");
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

program.parseAsync();
