import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PERSISTENCE_CONFIRMATORY_SEEDS,
  buildPersistenceConfirmatoryReport,
  exactUpperSignFlipP,
} from "./persistence-confirmatory.ts";
import type { PersistenceRun } from "./persistence.ts";

function fakeRun(
  arm: "transient" | "public-ledger",
  seed: number,
  seller: number,
  trade: number,
): PersistenceRun {
  return {
    arm,
    seed,
    calls: 1,
    apiFails: 0,
    parseFails: 0,
    scheduleHash: `schedule-${seed}`,
    replacementOrder: [0, 1, 2, 3, 4, 5, 6, 7],
    windows: {
      install: {} as PersistenceRun["windows"]["install"],
      turnover: {} as PersistenceRun["windows"]["turnover"],
      postReplacement: {
        sellerIntentPerHe: seller,
        buyerIntentPerHe: trade,
        tradePerHe: trade,
      } as PersistenceRun["windows"]["postReplacement"],
    },
    meanScore: arm === "transient" ? 56 : 53,
    result: {} as PersistenceRun["result"],
  };
}

describe("persistence confirmatory protocol", () => {
  it("computes an exact upper-tail centered sign-flip probability", () => {
    assert.equal(exactUpperSignFlipP([0.5, 0.5, 0.5, 0.5], 0.25), 1 / 16);
  });

  it("supports only when both frozen co-primary effects clear the rule", () => {
    const runs = PERSISTENCE_CONFIRMATORY_SEEDS.flatMap((seed) => [
      fakeRun("transient", seed, 0, 0),
      fakeRun("public-ledger", seed, 0.8, 0.1),
    ]);
    const report = buildPersistenceConfirmatoryReport(runs, "test-model");
    assert.equal(report.completePairs, 16);
    assert.equal(report.effects.seller?.passes, true);
    assert.equal(report.effects.asymmetry?.passes, true);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("does not confirm asymmetry when trade tracks the seller effect", () => {
    const runs = PERSISTENCE_CONFIRMATORY_SEEDS.flatMap((seed) => [
      fakeRun("transient", seed, 0, 0),
      fakeRun("public-ledger", seed, 0.8, 0.7),
    ]);
    const report = buildPersistenceConfirmatoryReport(runs, "test-model");
    assert.equal(report.effects.seller?.passes, true);
    assert.equal(report.effects.asymmetry?.passes, false);
    assert.equal(report.verdict, "SEMANTIC EFFECT WITHOUT CONFIRMED ASYMMETRY");
  });

  it("rejects pilot seeds and schedule mismatches", () => {
    assert.throws(
      () => buildPersistenceConfirmatoryReport([fakeRun("transient", 17, 0, 0)], "test"),
      /unexpected confirmatory seed/,
    );
    const seed = PERSISTENCE_CONFIRMATORY_SEEDS[0];
    const left = fakeRun("transient", seed, 0, 0);
    const right = fakeRun("public-ledger", seed, 0.8, 0.1);
    right.scheduleHash = "different";
    assert.throws(
      () => buildPersistenceConfirmatoryReport([left, right], "test"),
      /schedule mismatch/,
    );
  });
});
