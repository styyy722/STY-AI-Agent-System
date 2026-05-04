import { describe, it, expect } from "vitest";
import { findRelevantSkills, getAvailableSkills, buildSkillContext } from "../skills/skillRegistry.js";

describe("getAvailableSkills", () => {
  it("returns at least one skill", () => {
    const skills = getAvailableSkills();
    expect(skills.length).toBeGreaterThan(0);
  });

  it("returns skills with required fields", () => {
    const skills = getAvailableSkills();
    for (const skill of skills) {
      expect(skill.name).toBeTruthy();
      expect(skill.category).toMatch(/^(finance|data|report|general)$/);
      expect(skill.keywords.length).toBeGreaterThan(0);
    }
  });

  it("returns finance category skills", () => {
    const skills = getAvailableSkills();
    expect(skills.filter(s => s.category === "finance").length).toBeGreaterThan(0);
  });

  it("returns data category skills", () => {
    const skills = getAvailableSkills();
    expect(skills.filter(s => s.category === "data").length).toBeGreaterThan(0);
  });

  it("returns report category skills", () => {
    const skills = getAvailableSkills();
    expect(skills.filter(s => s.category === "report").length).toBeGreaterThan(0);
  });
});

describe("findRelevantSkills — finance queries", () => {
  it("matches WACC query to finance skills", () => {
    const skills = findRelevantSkills("Calculate WACC for this company");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches IRR query", () => {
    const skills = findRelevantSkills("What is the IRR on this investment?");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches P/E ratio query", () => {
    const skills = findRelevantSkills("What is the P/E multiple?");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches EBITDA query", () => {
    const skills = findRelevantSkills("Analyse the EBITDA margin trend");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches DCF query", () => {
    const skills = findRelevantSkills("Build a DCF valuation model");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches balance sheet query", () => {
    const skills = findRelevantSkills("Review the balance sheet");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });

  it("matches stock analysis query", () => {
    const skills = findRelevantSkills("Analyse this ASX stock");
    expect(skills.some(s => s.category === "finance")).toBe(true);
  });
});

describe("findRelevantSkills — data queries", () => {
  it("matches EDA query to data skills", () => {
    const skills = findRelevantSkills("Run an EDA on this dataset");
    expect(skills.some(s => s.category === "data")).toBe(true);
  });

  it("matches SQL query", () => {
    const skills = findRelevantSkills("Review my SQL query for performance");
    expect(skills.some(s => s.category === "data")).toBe(true);
  });

  it("matches churn analysis query", () => {
    const skills = findRelevantSkills("Analyse customer churn and retention");
    expect(skills.some(s => s.category === "data")).toBe(true);
  });

  it("matches root cause query", () => {
    const skills = findRelevantSkills("Why did revenue drop last month?");
    expect(skills.some(s => s.category === "data")).toBe(true);
  });

  it("matches metric definition query", () => {
    const skills = findRelevantSkills("How do I calculate MRR and ARR?");
    expect(skills.some(s => s.category === "data")).toBe(true);
  });
});

describe("findRelevantSkills — report queries", () => {
  it("matches executive summary query to report skill", () => {
    const skills = findRelevantSkills("Write an executive summary for the board");
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some(s => s.category === "report")).toBe(true);
  });

  it("matches board paper query", () => {
    const skills = findRelevantSkills("Draft a board paper with recommendations");
    expect(skills.some(s => s.category === "report")).toBe(true);
  });
});

describe("findRelevantSkills — limits", () => {
  it("returns no more than 8 skills", () => {
    const skills = findRelevantSkills(
      "finance data report executive summary WACC EDA SQL churn board paper valuation"
    );
    expect(skills.length).toBeLessThanOrEqual(8);
  });

  it("returns empty array for unrelated query", () => {
    expect(findRelevantSkills("what is the weather like today")).toHaveLength(0);
  });
});

describe("buildSkillContext", () => {
  it("returns empty string when no skills match", () => {
    expect(buildSkillContext("what is the weather like today")).toBe("");
  });

  it("returns non-empty string when skills match", () => {
    expect(buildSkillContext("Calculate WACC").length).toBeGreaterThan(0);
  });

  it("includes skill label in context", () => {
    const context = buildSkillContext("executive summary for board");
    expect(context.toLowerCase()).toContain("skill");
  });
});
