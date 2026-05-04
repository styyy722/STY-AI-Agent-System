import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface FileContext {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  warning?: string;
}

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xlsx", ".pdf"];
const MAX_FILE_CHARACTERS = 40000; // raised from 20k to accommodate richer file types

// Resolve the scripts directory relative to this file's location
function getScriptPath(scriptName: string): string {
  // Works both in dev (src/) and built (dist/) layouts
  const candidates = [
    path.join(process.cwd(), "scripts", scriptName),
    path.join(path.dirname(process.argv[1]), "..", "scripts", scriptName)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), "scripts", scriptName);
}

function readTextFile(absolutePath: string): string {
  return fs.readFileSync(absolutePath, "utf-8");
}

function readXlsxFile(absolutePath: string): string {
  const script = getScriptPath("extract_xlsx.py");
  if (!fs.existsSync(script)) {
    throw new Error(
      `Excel extraction script not found at: ${script}. ` +
      `Make sure scripts/extract_xlsx.py is present in your project root.`
    );
  }
  try {
    return execSync(`python3 "${script}" "${absolutePath}"`, {
      encoding: "utf-8",
      timeout: 30000
    });
  } catch (err) {
    throw new Error(
      `Failed to read Excel file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function readPdfFile(absolutePath: string): string {
  const script = getScriptPath("extract_pdf.py");
  if (!fs.existsSync(script)) {
    throw new Error(
      `PDF extraction script not found at: ${script}. ` +
      `Make sure scripts/extract_pdf.py is present in your project root.`
    );
  }
  try {
    return execSync(`python3 "${script}" "${absolutePath}"`, {
      encoding: "utf-8",
      timeout: 30000
    });
  } catch (err) {
    throw new Error(
      `Failed to read PDF file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

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
      `Unsupported file type: ${extension}. ` +
      `Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
  }

  let rawContent: string;

  if (extension === ".xlsx") {
    rawContent = readXlsxFile(absolutePath);
  } else if (extension === ".pdf") {
    rawContent = readPdfFile(absolutePath);
  } else {
    rawContent = readTextFile(absolutePath);
  }

  if (rawContent.length > MAX_FILE_CHARACTERS) {
    return {
      filePath: absolutePath,
      fileName,
      extension,
      content: rawContent.slice(0, MAX_FILE_CHARACTERS),
      warning: `File content was truncated to ${MAX_FILE_CHARACTERS} characters. ` +
               `The full file has more content that was not included.`
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

  const typeLabel: Record<string, string> = {
    ".xlsx": "Excel spreadsheet",
    ".pdf": "PDF document",
    ".csv": "CSV data file",
    ".json": "JSON file",
    ".md": "Markdown document",
    ".txt": "Text file"
  };

  const label = typeLabel[fileContext.extension] ?? fileContext.extension;

  return `
The user attached a ${label}.

File name: ${fileContext.fileName}
File type: ${label}
File path: ${fileContext.filePath}
${warningText}
File content:

\`\`\`
${fileContext.content}
\`\`\`
`;
}
