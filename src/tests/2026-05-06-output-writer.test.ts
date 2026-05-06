import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveAgentOutputFile } from "../tools/outputWriter.js";

describe("saveAgentOutputFile", () => {
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sty-output-writer-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes structured output formats used by CLI and web exports", async () => {
    const sample = {
      title: "Export Test",
      summary: "This verifies structured output generation.",
      nextSteps: ["Review the file.", "Share with stakeholders."],
      tableRows: [{ metric: "Revenue", value: 100 }],
      notebookCode: "print('ok')"
    };

    for (const extension of ["md", "txt", "docx", "xlsx", "pdf", "ipynb"]) {
      const outputPath = path.join(tempDir, `agent-output.${extension}`);
      const result = await saveAgentOutputFile(outputPath, sample);
      const stats = fs.statSync(result.outputPath);

      expect(stats.size).toBeGreaterThan(0);
      expect(result.fileName).toBe(`agent-output.${extension}`);
    }
  });
});
