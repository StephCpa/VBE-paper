import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONCENTRATED_ALLOCATIONS,
  DIFFUSE_ALLOCATION,
  MARK_CONCENTRATION_SEEDS,
  buildMarkConcentrationReport,
  markAllocationKey,
  type MarkConcentrationBlock,
  type MarkConcentrationRun,
} from "./mark-concentration.ts";

function fakeRun(seed: number, allocation = DIFFUSE_ALLOCATION, trades = 4): MarkConcentrationRun {
  return {
    seed,
    allocation,
    supportIds: [0, 1, 2, 3],
    interventionChits: allocation.allocation,
    scheduleHash: `schedule-${seed}`,
    preHistoryHash: `history-${seed}`,
    futureHeMeetings: 10,
    futureEligibleOpportunities: trades,
    futureTrades: trades,
    velocityPerMark: trades / 4,
    meanHolderCount: allocation.kind === "diffuse" ? 4 : 3,
    meanScore: 50 + trades,
    markSupplyInvariant: true,
    mechanicalFidelity: true,
  };
}

function fakeBlock(seed: number, diffuseTrades = 4, concentratedTrades = 3): MarkConcentrationBlock {
  return {
    seed,
    diffuse: fakeRun(seed, DIFFUSE_ALLOCATION, diffuseTrades),
    concentrated: CONCENTRATED_ALLOCATIONS.map((allocation) => fakeRun(seed, allocation, concentratedTrades)),
  };
}

describe("fixed-supply mark concentration intervention", () => {
  it("uses 512 declared seeds and all 12 ordered reallocations", () => {
    assert.equal(MARK_CONCENTRATION_SEEDS.length, 512);
    assert.equal(new Set(MARK_CONCENTRATION_SEEDS).size, 512);
    assert.equal(CONCENTRATED_ALLOCATIONS.length, 12);
    assert.equal(new Set(CONCENTRATED_ALLOCATIONS.map(markAllocationKey)).size, 12);
    for (const item of [DIFFUSE_ALLOCATION, ...CONCENTRATED_ALLOCATIONS]) {
      assert.equal(item.allocation.reduce((sum, value) => sum + value, 0), 4);
    }
  });

  it("averages allocation variants within seed and recognizes a material reduction", () => {
    const report = buildMarkConcentrationReport(MARK_CONCENTRATION_SEEDS.map((seed) => fakeBlock(seed)));
    assert.equal(report.metrics.futureTrades?.effect.mean, -1);
    assert.deepEqual(report.metrics.futureTrades?.effect.bootstrap95, [-1, -1]);
    assert.equal(report.verdict, "MARK CONCENTRATION CAUSALLY REDUCES VELOCITY");
  });

  it("does not support a sub-MRES effect", () => {
    const blocks = MARK_CONCENTRATION_SEEDS.map((seed, index) => fakeBlock(seed, 4, index % 2 ? 4 : 3.5));
    const report = buildMarkConcentrationReport(blocks);
    assert.equal(report.metrics.futureTrades?.effect.mean, -0.25);
    assert.equal(report.verdict, "NO MATERIAL CONCENTRATION EFFECT");
  });

  it("rejects schedule drift as invalid", () => {
    const blocks = MARK_CONCENTRATION_SEEDS.map((seed) => fakeBlock(seed));
    blocks[0]!.concentrated[0]!.scheduleHash = "drift";
    const report = buildMarkConcentrationReport(blocks);
    assert.equal(report.integrity.schedulePaired, false);
    assert.equal(report.verdict, "INVALID");
  });
});
