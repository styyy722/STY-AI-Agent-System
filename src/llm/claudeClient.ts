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

  const response = await runCoreAgent({
    mode,
    userInput: finalUserInput,
    sessionId: options.session
  });

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
  .description("Test whether the agent is working")
  .action(() => {
    console.log("Hello! STY AI Agent System is working.");
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
