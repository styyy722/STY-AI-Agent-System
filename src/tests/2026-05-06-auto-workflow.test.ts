import { describe, expect, it } from "vitest";
import { inferAutoModePlan } from "../agent/workflows.js";
import { findRelevantSkills } from "../skills/skillRegistry.js";

describe("auto workflow mode planning", () => {
  it("selects Power BI, data, finance, and report lenses for CFO dashboard reviews", () => {
    const plan = inferAutoModePlan(
      "Review this CFO Power BI dashboard screenshot and financials.xlsx. Validate DAX measures, data quality, metric definitions, finance logic, and produce an executive recommendation.",
      "general"
    );

    const modes = plan.map(item => item.mode);

    expect(modes).toContain("pbi");
    expect(modes).toContain("data");
    expect(modes).toContain("finance");
    expect(modes).toContain("report");
    expect(plan.every(item => item.score > 0)).toBe(true);
    expect(plan.every(item => item.reasons.length > 0)).toBe(true);
  });

  it("keeps report as the final specialist lens when selected with other modes", () => {
    const plan = inferAutoModePlan(
      "Create a board-ready report from this anomaly analysis and budget variance bridge.",
      "general"
    );

    expect(plan.length).toBeGreaterThan(1);
    expect(plan[plan.length - 1].mode).toBe("report");
  });
});

describe("new corporate trust skills", () => {
  it("matches CFO dashboard trust and metric governance skills", () => {
    const skills = findRelevantSkills(
      "Can the CFO trust this dashboard? Review metric governance, Power BI design, data quality, and board finance assumptions."
    ).map(skill => skill.folder);

    expect(skills).toContain("cfo_dashboard_trust_review");
    expect(skills).toContain("metric_governance_review");
    expect(skills).toContain("board_finance_quality_review");
  });
});
