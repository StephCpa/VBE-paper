import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { invasionCell, kPayoffCell } from "./invasion.ts";

describe("invasion", () => {
  it("Never outscores altruists in a 7+1 mix", () => {
    const cell = invasionCell("altruist", "never", 24);
    assert.ok(cell.mutantMean > cell.majorityMean, `${cell.mutantMean} vs ${cell.majorityMean}`);
  });

  it("returns a k-payoff cell", () => {
    const cell = kPayoffCell(2, "barter", 12);
    assert.equal(cell.k, 2);
    assert.ok(cell.kwMean > 0);
  });
});
