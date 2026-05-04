#!/usr/bin/env node

import { Command } from "commander";
import { runCoreAgent, type AgentMode } from "./agent/coreAgent.js";
import { readBusinessFile, buildFilePrompt } from "./tools/fileReader.js";

const program = new Command();

interface CommandOptions {
  file?: string;
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
    userInput: finalUserInput
  });

  console.log("");
  console.log("====================================");
  console.log(response.title);
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
  .command("ask")
  .description("Ask the general business agent a question")
  .argument("<request>", "Your business request")
  .option("-f, --file <path>", "Attach a local file")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("general", request, options);
  });

program
  .command("finance")
  .description("Run finance-related AI workflows")
  .argument("<request>", "Your finance request")
  .option("-f, --file <path>", "Attach a local file")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("finance", request, options);
  });

program
  .command("data")
  .description("Run data analytics AI workflows")
  .argument("<request>", "Your data analytics request")
  .option("-f, --file <path>", "Attach a local file")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("data", request, options);
  });

program
  .command("report")
  .description("Generate business reports and executive summaries")
  .argument("<request>", "Your reporting request")
  .option("-f, --file <path>", "Attach a local file")
  .action(async (request: string, options: CommandOptions) => {
    await handleAgentCommand("report", request, options);
  });

program.parseAsync();
