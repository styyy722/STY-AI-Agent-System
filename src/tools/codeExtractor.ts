// Finds all Python code blocks in an LLM response and extracts them

export interface ExtractedCode {
  code: string;
  index: number; // which block this is (0-based)
}

// Matches ```python ... ``` blocks (case-insensitive, handles whitespace)
const PYTHON_BLOCK_REGEX = /```python\s*\n([\s\S]*?)```/gi;

export function extractPythonBlocks(text: string): ExtractedCode[] {
  const blocks: ExtractedCode[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = PYTHON_BLOCK_REGEX.exec(text)) !== null) {
    const code = match[1].trim();
    if (code.length > 0) {
      blocks.push({ code, index });
      index++;
    }
  }

  return blocks;
}

// Checks if a response contains any Python blocks worth executing
export function hasPythonCode(text: string): boolean {
  return PYTHON_BLOCK_REGEX.test(text);
}
