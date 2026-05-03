#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

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
  .command("finance")
  .description("Run finance-related AI workflows")
  .action(() => {
    console.log("Finance agent coming soon.");
  });

program
  .command("data")
  .description("Run data analytics AI workflows")
  .action(() => {
    console.log("Data analytics agent coming soon.");
  });

program
  .command("report")
  .description("Generate business reports and executive summaries")
  .action(() => {
    console.log("Reporting agent coming soon.");
  });

program.parse();
