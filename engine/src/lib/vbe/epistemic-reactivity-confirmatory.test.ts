import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  PRIOR_LLM_EXPERIMENT_SEEDS,
  REACTIVITY_CONFIRMATORY_SEEDS,
  buildReactivityConfirmatoryReport,
} from "./epistemic-reactivity-confirmatory.ts";
import type { ReactivityMode, ReactivityRun } from "./epistemic-reactivity.ts";

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
  mode: ReactivityMode,
  seed: number,
  buyer: number,
): ReactivityRun {
  const actionCalls = 2;
  return {
    delivery,
    mode,
    seed,
    actionCalls,
    replayCalls: mode === "sealed-replay" ? actionCalls : 0,
    apiFails: 0,
    parseFails: 0,
    actionBeliefFields: mode === "inline" ? actionCalls * 2 : 0,
    replayStartedAfterEnvironment: mode === "sealed-replay",
    robotIds: [0, 1],
    scheduleHash: `seed-${seed}`,
    primaryRounds: { first: 5, last: 21 },
    llmSeller: { ...zeroSlice, sellerIntentPerHe: buyer },
    llmBuyer: { ...zeroSlice, buyerIntentPerHe: buyer },
    llmLlm: { ...zeroSlice, tradePerHe: buyer },
    beliefRecords: Array.from({ length: actionCalls }, (_, i) => ({
      t: 5 + i,
      agentId: 2 + i,
      pAccept: 0.5,
      pSecond: 0.5,
      source: mode,
    })),
    belief: { n: actionCalls, pAccept: 0.5, pSecond: 0.5 },
    meanScore: buyer,
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

function block(
  seed: number,
  inlinePrivate: number,
  inlinePublic: number,
  sealedPrivate: number,
  sealedPublic: number,
): ReactivityRun[] {
  return [
    fakeRun("private", "inline", seed, inlinePrivate),
    fakeRun("public", "inline", seed, inlinePublic),
    fakeRun("private", "sealed-replay", seed, sealedPrivate),
    fakeRun("public", "sealed-replay", seed, sealedPublic),
  ];
}

describe("Study E-R independent confirmation", () => {
  it("uses 16 fresh seeds with no prior LLM-experiment overlap", () => {
    assert.equal(REACTIVITY_CONFIRMATORY_SEEDS.length, 16);
    assert.equal(new Set(REACTIVITY_CONFIRMATORY_SEEDS).size, 16);
    assert.equal(
      REACTIVITY_CONFIRMATORY_SEEDS.filter((seed) =>
        PRIOR_LLM_EXPERIMENT_SEEDS.includes(
          seed as (typeof PRIOR_LLM_EXPERIMENT_SEEDS)[number],
        ),
      ).length,
      0,
    );
  });

  it("supports a large interaction with the frozen directions", () => {
    const runs = REACTIVITY_CONFIRMATORY_SEEDS.flatMap((seed) =>
      block(seed, 0.1, 0.5, 0.2, 0.2),
    );
    const report = buildReactivityConfirmatoryReport(runs, "test-model");
    assert.equal(report.completeBlocks, 16);
    assert.equal(report.primary?.passes, true);
    assert.equal(report.directionGuardrails.pass, true);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("does not support an interaction below the MRES", () => {
    const runs = REACTIVITY_CONFIRMATORY_SEEDS.flatMap((seed) =>
      block(seed, 0.1, 0.2, 0.1, 0.1),
    );
    const report = buildReactivityConfirmatoryReport(runs, "test-model");
    assert.equal(report.primary?.passes, false);
    assert.equal(report.verdict, "NOT SUPPORTED");
  });

  it("separates a primary interaction from directional fidelity", () => {
    const runs = REACTIVITY_CONFIRMATORY_SEEDS.flatMap((seed) =>
      block(seed, 0.1, 0.15, 0.35, 0.1),
    );
    const report = buildReactivityConfirmatoryReport(runs, "test-model");
    assert.equal(report.primary?.passes, true);
    assert.equal(report.directionGuardrails.pass, false);
    assert.equal(report.verdict, "PRIMARY INTERACTION WITHOUT DIRECTIONAL FIDELITY");
  });

  it("rejects old seeds, missing replay, and schedule drift", () => {
    assert.throws(
      () => buildReactivityConfirmatoryReport([fakeRun("private", "inline", 251, 0)], "test"),
      /unexpected reactivity-confirmatory seed/,
    );
    const seed = REACTIVITY_CONFIRMATORY_SEEDS[0];
    const missingReplay = fakeRun("private", "sealed-replay", seed, 0);
    missingReplay.replayCalls -= 1;
    assert.throws(
      () => buildReactivityConfirmatoryReport([missingReplay], "test"),
      /replay count mismatch/,
    );
    const runs = block(seed, 0.1, 0.5, 0.2, 0.2);
    runs[3]!.scheduleHash = "different";
    assert.throws(
      () => buildReactivityConfirmatoryReport(runs, "test"),
      /schedule mismatch/,
    );
  });
});
