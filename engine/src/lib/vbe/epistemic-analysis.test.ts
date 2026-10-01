import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeEpistemicReport,
  bootstrapMean95,
  exactSignFlipP,
  pairedEffect,
} from "./epistemic-analysis.ts";
import type { EpistemicReport } from "./epistemic.ts";

describe("epistemic seed-level inference", () => {
  it("computes an exact two-sided sign-flip probability", () => {
    assert.equal(exactSignFlipP([1, 1, 1, 1]), 2 / 16);
    assert.equal(exactSignFlipP([0, 0, 0]), 1);
    assert.equal(exactSignFlipP([]), null);
  });

  it("uses a deterministic paired bootstrap", () => {
    const a = bootstrapMean95([0.1, 0.2, 0.3], 1_000, 7);
    const b = bootstrapMean95([0.1, 0.2, 0.3], 1_000, 7);
    assert.deepEqual(a, b);
    assert.ok(a![0] <= 0.2 && a![1] >= 0.2);
  });

  it("summarizes effects without using meeting counts", () => {
    const effect = pairedEffect([0.1, 0.2, 0.3]);
    assert.equal(effect.n, 3);
    assert.ok(Math.abs(effect.mean - 0.2) < 1e-12);
    assert.equal(effect.positiveShare, 1);
  });

  it("does not call a sub-12-pair report confirmatory", () => {
    const report = {
      pairedDeltas: [
        {
          seed: 17,
          sellerIntentRate: 0.2,
          buyerIntentRate: 0.2,
          tradeRate: 0.2,
          pAccept: 0.2,
          pSecond: 0.2,
          meanScore: 1,
        },
      ],
    } as EpistemicReport;
    const inference = analyzeEpistemicReport(report);
    assert.equal(inference.confirmatoryReady, false);
    assert.equal(inference.pilotComplete, false);
    assert.match(inference.warning, /pilot is incomplete/);
  });
});
