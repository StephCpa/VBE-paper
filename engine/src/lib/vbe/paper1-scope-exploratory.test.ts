import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, test } from "node:test";

// Minimal adapter so the original Bun assertions run unchanged under node:test.
const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => assert.equal(actual, expected),
  toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
  toHaveLength: (n: number) => assert.equal((actual as { length: number }).length, n),
  toBeCloseTo: (expected: number, digits = 2) => assert.ok(Math.abs((actual as number) - expected) < 10 ** -digits / 2, `${actual} != ${expected}`),
});
import { buildPaperOneScopeExploratoryReport, SCOPE_CELLS } from "./analyze-paper1-scope-exploratory.ts";
import type { SemanticBoundaryReport } from "./welfare-semantic-boundary.ts";

const stored = JSON.parse(readFileSync("src/data/welfare-semantic-boundary.json", "utf8")) as SemanticBoundaryReport;
const report = buildPaperOneScopeExploratoryReport(stored);

describe("Paper 1 frozen-data exploratory audit", () => {
  test("covers every arm and realizable role-relation cell", () => {
    expect(report.runCount).toBe(98);
    expect(Object.keys(report.scopeMatrix)).toHaveLength(7);
    for (const arm of Object.values(report.scopeMatrix)) expect(Object.keys(arm)).toEqual([...SCOPE_CELLS]);
  });

  test("reproduces the main expanded and harmful cells", () => {
    expect(report.scopeMatrix["gift-exact"]["H>E:gift"]).toEqual({ events: 99, opportunities: 304, rate: 99 / 304 });
    expect(report.scopeMatrix["gift-exact"]["H-H:swap"]).toEqual({ events: 105, opportunities: 125, rate: 105 / 125 });
    expect(report.scopeMatrix["easy-easy-negative"]["E-E:swap"]).toEqual({ events: 113, opportunities: 114, rate: 113 / 114 });
    expect(SCOPE_CELLS.filter(cell => cell.endsWith(":sale")).every(cell =>
      Object.values(report.scopeMatrix).every(arm => arm[cell].events === 0))).toBe(true);
  });

  test("round bins close to the pooled H-H opportunity totals", () => {
    for (const [arm, bins] of Object.entries(report.hhSwapDynamics)) {
      expect(bins.reduce((sum, bin) => sum + bin.opportunities, 0)).toBe(report.scopeMatrix[arm as keyof typeof report.scopeMatrix]["H-H:swap"].opportunities);
      expect(bins.reduce((sum, bin) => sum + bin.events, 0)).toBe(report.scopeMatrix[arm as keyof typeof report.scopeMatrix]["H-H:swap"].events);
    }
  });

  test("account-level pairing closes to the confirmatory welfare effect", () => {
    expect(report.giftMinusNeutralDistribution.accountCount).toBe(112);
    expect(report.giftMinusNeutralDistribution.positive).toBe(70);
    expect(report.giftMinusNeutralDistribution.zero).toBe(20);
    expect(report.giftMinusNeutralDistribution.negative).toBe(22);
    expect(report.giftMinusNeutralDistribution.meanAccountDelta).toBeCloseTo(2.0625, 12);
  });
});
