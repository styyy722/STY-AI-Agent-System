import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { ImageAttachment, ImageMediaType } from "../llm/llmInterface.js";

export type { ImageAttachment };

export interface FileContext {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  warning?: string;
}

export interface MultiFileContext {
  files: FileContext[];
  totalFiles: number;
  skippedFiles: string[];
  totalCharacters: number;
  truncated: boolean;
}

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xlsx", ".pdf"];
const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_FILE_CHARACTERS = 40000;
const MAX_TOTAL_CHARACTERS = 120000;
const MAX_FILES_PER_FOLDER = 30;

const IMAGE_MEDIA_TYPES: Record<string, ImageMediaType> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

export function isImageFile(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(
    path.extname(filePath).toLowerCase()
  );
}

export function readImageFile(filePath: string): ImageAttachment {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const extension = path.extname(absolutePath).toLowerCase();

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported image type: ${extension}. ` +
      `Supported image types: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}`
    );
  }

  const mediaType = IMAGE_MEDIA_TYPES[extension];
  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");

  return { base64, mediaType };
}

function getScriptPath(scriptName: string): string {
  const candidates = [
    path.join(process.cwd(), "scripts", scriptName),
    path.join(process.cwd(), "script", scriptName),
    path.join(path.dirname(process.argv[1]), "..", "scripts", scriptName),
    path.join(path.dirname(process.argv[1]), "..", "script", scriptName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(process.cwd(), "script", scriptName);
}

function readTextFile(absolutePath: string): string {
  return fs.readFileSync(absolutePath, "utf-8");
}

function readXlsxFile(absolutePath: string): string {
  const script = getScriptPath("extract_xlsx.py");

  if (!fs.existsSync(script)) {
    throw new Error(
      `Excel extraction script not found. Looked for script/extract_xlsx.py or scripts/extract_xlsx.py.`
    );
  }

  return execSync(`python3 "${script}" "${absolutePath}"`, {
    encoding: "utf-8",
    timeout: 30000
  });
}

function readPdfFile(absolutePath: string): string {
  const script = getScriptPath("extract_pdf.py");

  if (!fs.existsSync(script)) {
    throw new Error(
      `PDF extraction script not found. Looked for script/extract_pdf.py or scripts/extract_pdf.py.`
    );
  }

  return execSync(`python3 "${script}" "${absolutePath}"`, {
    encoding: "utf-8",
    timeout: 30000
  });
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
    throw new Error(
      `Expected a file but received a folder: ${filePath}. ` +
      `Use --folder to read an entire directory.`
    );
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
      warning: `File truncated to ${MAX_FILE_CHARACTERS} characters. Full size: ${rawContent.length} characters.`
    };
  }

  return {
    filePath: absolutePath,
    fileName,
    extension,
    content: rawContent
  };
}

export function readMultipleFiles(filePaths: string[]): MultiFileContext {
  const files: FileContext[] = [];
  const skippedFiles: string[] = [];
  let totalCharacters = 0;
  let truncated = false;

  for (const filePath of filePaths) {
    if (totalCharacters >= MAX_TOTAL_CHARACTERS) {
      skippedFiles.push(`${filePath} combined character limit reached`);
      truncated = true;
      continue;
    }

    try {
      const fileContext = readBusinessFile(filePath);

      if (totalCharacters + fileContext.content.length > MAX_TOTAL_CHARACTERS) {
        const remaining = MAX_TOTAL_CHARACTERS - totalCharacters;

        files.push({
          ...fileContext,
          content: fileContext.content.slice(0, remaining),
          warning: `File truncated because combined file limit was reached. Showing first ${remaining} characters.`
        });

        totalCharacters = MAX_TOTAL_CHARACTERS;
        truncated = true;
      } else {
        files.push(fileContext);
        totalCharacters += fileContext.content.length;
      }
    } catch (error) {
      skippedFiles.push(
        `${path.basename(filePath)} (${
          error instanceof Error ? error.message : "read error"
        })`
      );
    }
  }

  return {
    files,
    totalFiles: filePaths.length,
    skippedFiles,
    totalCharacters,
    truncated
  };
}

export interface FolderReadOptions {
  recursive?: boolean;
  extensions?: string[];
  pattern?: string;
}

export function readFolder(
  folderPath: string,
  options: FolderReadOptions = {}
): MultiFileContext {
  const absoluteFolder = path.resolve(process.cwd(), folderPath);

  if (!fs.existsSync(absoluteFolder)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const stats = fs.statSync(absoluteFolder);

  if (!stats.isDirectory()) {
    throw new Error(
      `Expected a folder but received a file: ${folderPath}. Use --file instead.`
    );
  }

  const extensions = options.extensions ?? SUPPORTED_EXTENSIONS;
  const pattern = options.pattern?.toLowerCase();

  function collectFiles(dir: string, depth = 0): string[] {
    if (depth > 3) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const collected: string[] = [];

    for (const entry of entries) {
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "logs" ||
        entry.name === "usage" ||
        entry.name === "review_queue" ||
        entry.name === "tool_audit" ||
        entry.name === "web_uploads" ||
        entry.name === "web_outputs"
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && options.recursive) {
        collected.push(...collectFiles(fullPath, depth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const nameMatch =
          !pattern || entry.name.toLowerCase().includes(pattern);

        if (extensions.includes(ext) && nameMatch) {
          collected.push(fullPath);
        }
      }
    }

    return collected;
  }

  const allFiles = collectFiles(absoluteFolder);

  if (allFiles.length === 0) {
    throw new Error(
      `No supported files found in: ${folderPath}. ` +
      `Supported types: ${extensions.join(", ")}`
    );
  }

  if (allFiles.length > MAX_FILES_PER_FOLDER) {
    throw new Error(
      `Folder contains ${allFiles.length} supported files. Maximum is ${MAX_FILES_PER_FOLDER}. ` +
      `Use --pattern to filter by filename, or specify individual files with --file.`
    );
  }

  return readMultipleFiles(allFiles);
}

const TYPE_LABELS: Record<string, string> = {
  ".xlsx": "Excel spreadsheet",
  ".pdf": "PDF document",
  ".csv": "CSV data file",
  ".json": "JSON file",
  ".md": "Markdown document",
  ".txt": "Text file"
};

export function buildFilePrompt(fileContext: FileContext): string {
  const label = TYPE_LABELS[fileContext.extension] ?? fileContext.extension;
  const warningText = fileContext.warning
    ? `\nWarning: ${fileContext.warning}\n`
    : "";

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

export function buildMultiFilePrompt(
  ctx: MultiFileContext,
  source: string
): string {
  const lines: string[] = [];

  lines.push(`The user attached ${ctx.files.length} file(s) from ${source}.`);
  lines.push(
    `Total content: ~${Math.round(
      ctx.totalCharacters / 1000
    )}k characters across ${ctx.files.length} file(s).`
  );

  if (ctx.truncated) {
    lines.push(
      `Note: Combined content was truncated at ${MAX_TOTAL_CHARACTERS} characters to stay within context limits.`
    );
  }

  if (ctx.skippedFiles.length > 0) {
    lines.push(
      `\nSkipped files that could not be read:\n${ctx.skippedFiles
        .map(file => `  - ${file}`)
        .join("\n")}`
    );
  }

  lines.push("\nFiles included:");

  ctx.files.forEach((file, index) => {
    lines.push(
      `  ${index + 1}. ${file.fileName} (${
        TYPE_LABELS[file.extension] ?? file.extension
      })`
    );
  });

  lines.push(`\n${"=".repeat(60)}`);

  ctx.files.forEach((file, index) => {
    const label = TYPE_LABELS[file.extension] ?? file.extension;

    lines.push(
      `\n--- File ${index + 1} of ${ctx.files.length}: ${file.fileName} (${label}) ---`
    );

    if (file.warning) {
      lines.push(`Warning: ${file.warning}`);
    }

    lines.push(`\n\`\`\`\n${file.content}\n\`\`\``);
  });

  return lines.join("\n");
}
