import { describe, it, expect } from "vitest";
import {
  validateUserInput,
  validateSessionId,
  validateOutputPath
} from "../tools/inputValidator.js";

describe("validateUserInput", () => {
  it("accepts a normal query", () => {
    const result = validateUserInput("Explain WACC for Telstra");
    expect(result.valid).toBe(true);
  });

  it("rejects empty input", () => {
    const result = validateUserInput("");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too short/i);
  });

  it("rejects single character input", () => {
    const result = validateUserInput("x");
    expect(result.valid).toBe(false);
  });

  it("rejects input over 8000 characters", () => {
    const result = validateUserInput("A".repeat(8001));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
    expect(result.error).toMatch(/--file/i);
  });

  it("accepts input at exactly the max boundary", () => {
    const result = validateUserInput("A".repeat(8000));
    expect(result.valid).toBe(true);
  });

  it("accepts multi-line input", () => {
    const result = validateUserInput("Line one\nLine two\nLine three");
    expect(result.valid).toBe(true);
  });
});

describe("validateSessionId", () => {
  it("accepts a valid hyphenated session ID", () => {
    expect(validateSessionId("telstra-analysis").valid).toBe(true);
  });

  it("accepts underscores and alphanumerics", () => {
    expect(validateSessionId("project_2024_q1").valid).toBe(true);
  });

  it("rejects spaces", () => {
    const result = validateSessionId("my session");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid characters/i);
  });

  it("rejects special characters", () => {
    expect(validateSessionId("session!@#").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateSessionId("").valid).toBe(false);
    expect(validateSessionId("  ").valid).toBe(false);
  });

  it("rejects session ID over 50 characters", () => {
    const result = validateSessionId("a".repeat(51));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });
});

describe("validateOutputPath", () => {
  it("accepts a normal relative path", () => {
    expect(validateOutputPath("outputs/my-report.md").valid).toBe(true);
  });

  it("rejects path traversal", () => {
    const result = validateOutputPath("../../../etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/\.\./);
  });

  it("rejects empty path", () => {
    expect(validateOutputPath("").valid).toBe(false);
  });

  it("accepts nested output paths", () => {
    expect(validateOutputPath("outputs/finance/q1/report.md").valid).toBe(true);
  });
});
