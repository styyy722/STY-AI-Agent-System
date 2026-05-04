#!/usr/bin/env node

import { Command } from "commander";
import { runCoreAgent, type AgentMode } from "./agent/coreAgent.js";

const program = new Command();

async function handleAgentCommand(mode: AgentMode, userInput: string) {
  const response = await runCoreAgent({
    mode,
    userInput
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
  .action(async (request: string) => {
    await handleAgentCommand("general", request);
  });

program
  .command("finance")
  .description("Run finance-related AI workflows")
  .argument("<request>", "Your finance request")
  .action(async (request: string) => {
    await handleAgentCommand("finance", request);
  });

program
  .command("data")
  .description("Run data analytics AI workflows")
  .argument("<request>", "Your data analytics request")
  .action(async (request: string) => {
    await handleAgentCommand("data", request);
  });

program
  .command("report")
  .description("Generate business reports and executive summaries")
  .argument("<request>", "Your reporting request")
  .action(async (request: string) => {
    await handleAgentCommand("report", request);
  });

program.parseAsync();
