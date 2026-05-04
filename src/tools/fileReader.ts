import fs from "node:fs";
import path from "node:path";

export interface FileContext {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  warning?: string;
}

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".csv", ".json"];
const MAX_FILE_CHARACTERS = 20000;

export function readBusinessFile(filePath: string): FileContext {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileStats = fs.statSync(absolutePath);

  if (fileStats.isDirectory()) {
    throw new Error(`Expected a file but received a folder: ${filePath}`);
  }

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported file type: ${extension}. Currently supported: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }

  const rawContent = fs.readFileSync(absolutePath, "utf-8");

  if (rawContent.length > MAX_FILE_CHARACTERS) {
    return {
      filePath: absolutePath,
      fileName,
      extension,
      content: rawContent.slice(0, MAX_FILE_CHARACTERS),
      warning: `File was longer than ${MAX_FILE_CHARACTERS} characters, so only the first part was included.`
    };
  }

  return {
    filePath: absolutePath,
    fileName,
    extension,
    content: rawContent
  };
}

export function buildFilePrompt(fileContext: FileContext): string {
  const warningText = fileContext.warning
    ? `\nImportant file warning: ${fileContext.warning}\n`
    : "";

  return `
The user attached a file.

File name: ${fileContext.fileName}
File type: ${fileContext.extension}
File path: ${fileContext.filePath}
${warningText}

File content:

\`\`\`
${fileContext.content}
\`\`\`
`;
}
