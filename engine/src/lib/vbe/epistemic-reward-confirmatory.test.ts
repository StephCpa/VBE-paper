import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exactSignFlipP } from "./epistemic-analysis.ts";
import {
  REWARD_CONFIRMATORY_ORDERS,
  REWARD_CONFIRMATORY_SEEDS,
  buildRewardConfirmatoryReport,
  exactTwoSidedSignFlipMitm,
  exactUpperSignFlipMitm,
} from "./epistemic-reward-confirmatory.ts";
import { DISASSEMBLY_SEEDS, disassemblyCellKey, type DisassemblyRun } from "./epistemic-disassembly.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";
import { PRIOR_LLM_EXPERIMENT_SEEDS, REACTIVITY_CONFIRMATORY_SEEDS } from "./epistemic-reactivity-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";

const zeroSlice: CoordinationSlice = {
  heMeetings: 1,
  opportunities: 1,
  sellerIntents: 0,
  buyerIntents: 0,
  trades: 0,
  sellerIntentRate: 0,
  buyerIntentRate: 0,
  tradeRate: 0,
  sellerIntentPerHe: 0,
  buyerIntentPerHe: 0,
  tradePerHe: 0,
};

function fakeRun(
  delivery: "private" | "public",
  mode: "belief-unrewarded" | "belief-rewarded",
  seed: number,
  buyer: number,
): DisassemblyRun {
  const calls = 2;
  return {
    delivery,
    mode,
    seed,
    calls,
    apiFails: 0,
    parseFails: 0,
    beliefFieldCount: 2 * calls,
    formatFieldCount: 0,
    robotIds: [0, 1],
    scheduleHash: `seed-${seed}`,
    primaryRounds: { first: 5, last: 21 },
    llmSeller: { ...zeroSlice, sellerIntentPerHe: buyer },
    llmBuyer: { ...zeroSlice, buyerIntentPerHe: buyer },
    llmLlm: { ...zeroSlice, tradePerHe: buyer },
    auxRecords: Array.from({ length: calls }, (_, index) => ({
      t: 5 + index,
      agentId: 2 + index,
      fieldA: 0.4 + 0.1 * index,
      fieldB: 0.6 - 0.1 * index,
    })),
    aux: { n: calls, fieldA: 0.45, fieldB: 0.55 },
    beliefBonus: mode === "belief-rewarded" ? 0.2 : 0,
    meanScore: buyer,
    totalMeanScore: buyer + (mode === "belief-rewarded" ? 0.2 : 0),
    result: {
      scores: [],
      meanScore: buyer,
      heOffersInterior: 0,
      heAcceptsInterior: 0,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: 0,
      accEnd: 0,
      rounds: [],
    },
  };
}

function block(seed: number, unrewardedEffect: number, rewardedEffect: number): DisassemblyRun[] {
  return [
    fakeRun("private", "belief-unrewarded", seed, 0.1),
    fakeRun("public", "belief-unrewarded", seed, 0.1 + unrewardedEffect),
    fakeRun("private", "belief-rewarded", seed, 0.1),
    fakeRun("public", "belief-rewarded", seed, 0.1 + rewardedEffect),
  ];
}

describe("Study E-RW reward-transition confirmation", () => {
  it("matches direct exact sign-flip enumeration on small samples", () => {
    const samples = [
      [0.4, -0.2, 0.1, 0],
      [0.3, 0.3, -0.1, -0.5, 0.2],
      [-0.25, 0.125, 0.5, -0.75, 0.25, 0.125],
    ];
    for (const xs of samples) {
      assert.equal(exactTwoSidedSignFlipMitm(xs), exactSignFlipP(xs));
      assert.equal(exactUpperSignFlipMitm(xs), exactUpperSignFlipP(xs));
      assert.equal(exactUpperSignFlipMitm(xs, 0.1), exactUpperSignFlipP(xs, 0.1));
    }
  });

  it("uses fresh seeds and balances every cell across four positions", () => {
    assert.equal(REWARD_CONFIRMATORY_SEEDS.length, 28);
    const prior = new Set<number>([
      ...PRIOR_LLM_EXPERIMENT_SEEDS,
      ...REACTIVITY_CONFIRMATORY_SEEDS,
      ...DISASSEMBLY_SEEDS,
    ]);
    assert.equal(REWARD_CONFIRMATORY_SEEDS.filter((seed) => prior.has(seed)).length, 0);
    const keys = REWARD_CONFIRMATORY_ORDERS[0]!.map(disassemblyCellKey);
    for (const key of keys) {
      const positions = REWARD_CONFIRMATORY_SEEDS.map((_, index) =>
        REWARD_CONFIRMATORY_ORDERS[index % 4]!.findIndex(
          (cell) => disassemblyCellKey(cell) === key,
        ),
      );
      assert.deepEqual(
        [0, 1, 2, 3].map((position) => positions.filter((value) => value === position).length),
        [7, 7, 7, 7],
      );
    }
  });

  it("returns SUPPORTED only when the primary test and both guardrails pass", () => {
    const runs = REWARD_CONFIRMATORY_SEEDS.flatMap((seed) => block(seed, 0.05, 0.25));
    const report = buildRewardConfirmatoryReport(runs, "test-model");
    assert.equal(report.completeBlocks, 28);
    assert.ok(Math.abs((report.primary?.mean ?? 0) - 0.2) < 1e-12);
    assert.equal(report.primary?.exactUpperP, 1 / 2 ** 28);
    assert.equal(report.primary?.passes, true);
    assert.equal(report.directionGuardrails.pass, true);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("distinguishes a positive interaction with failed directional fidelity", () => {
    const runs = REWARD_CONFIRMATORY_SEEDS.flatMap((seed) => block(seed, 0.2, 0.4));
    const report = buildRewardConfirmatoryReport(runs, "test-model");
    assert.equal(report.primary?.passes, true);
    assert.equal(report.directionGuardrails.pass, false);
    assert.equal(report.verdict, "POSITIVE INCREMENT WITHOUT DIRECTIONAL FIDELITY");
  });

  it("rejects a field violation and within-seed schedule drift", () => {
    const bad = fakeRun("private", "belief-unrewarded", REWARD_CONFIRMATORY_SEEDS[0], 0);
    bad.formatFieldCount = 2;
    assert.throws(() => buildRewardConfirmatoryReport([bad], "test"), /contains format fields/);

    const runs = block(REWARD_CONFIRMATORY_SEEDS[0], 0.05, 0.25);
    runs[3]!.scheduleHash = "different";
    assert.throws(() => buildRewardConfirmatoryReport(runs, "test"), /schedule mismatch/);
  });
});
