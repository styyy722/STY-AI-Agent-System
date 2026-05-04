import fs from "node:fs";
import path from "node:path";

export interface OutputWriteResult {
  outputPath: string;
  fileName: string;
}

export function saveAgentOutput(outputPath: string, content: string): OutputWriteResult {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  const fileName = path.basename(absolutePath);
  const folderPath = path.dirname(absolutePath);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(absolutePath, content, "utf-8");

  return {
    outputPath: absolutePath,
    fileName
  };
}

export function formatSavedOutputContent(title: string, summary: string, nextSteps: string[]): string {
  const nextStepsText =
    nextSteps.length > 0
      ? nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : "No next steps provided.";

  return `# ${title}

## Response

${summary}

## Next Steps

${nextStepsText}
`;
}
