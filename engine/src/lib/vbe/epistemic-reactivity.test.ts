import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  REACTIVITY_ORDERS,
  REACTIVITY_SEEDS,
  buildReactivityReport,
  reactivityCellKey,
  type ReactivityMode,
  type ReactivityRun,
} from "./epistemic-reactivity.ts";

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

describe("Study E elicitation-reactivity factorial", () => {
  it("balances every cell over the four run positions", () => {
    const cells = REACTIVITY_ORDERS.flat().map(reactivityCellKey);
    assert.equal(new Set(cells).size, 4);
    for (let position = 0; position < 4; position++) {
      const atPosition = REACTIVITY_ORDERS.map((order) => reactivityCellKey(order[position]!));
      assert.equal(new Set(atPosition).size, 4);
    }
  });

  it("identifies an inline-only public buyer effect", () => {
    const runs = REACTIVITY_SEEDS.flatMap((seed) => [
      fakeRun("private", "inline", seed, 0.1),
      fakeRun("public", "inline", seed, 0.4),
      fakeRun("private", "sealed-replay", seed, 0.1),
      fakeRun("public", "sealed-replay", seed, 0.1),
    ]);
    const report = buildReactivityReport(runs, "test-model");
    assert.equal(report.completeBlocks, 8);
    assert.ok(
      Math.abs((report.interactionInference.buyerIntentRate?.mean ?? 0) - 0.3) < 1e-12,
    );
    assert.equal(report.verdict, "ELICITATION-REACTIVITY CANDIDATE");
    assert.equal(report.integrity.sealedActionBeliefFields, 0);
  });

  it("rejects a missing sealed replay", () => {
    const run = fakeRun("private", "sealed-replay", REACTIVITY_SEEDS[0], 0);
    run.replayCalls -= 1;
    assert.throws(() => buildReactivityReport([run], "test-model"), /replay count/);
  });

  it("rejects a four-cell schedule mismatch", () => {
    const seed = REACTIVITY_SEEDS[0];
    const runs = [
      fakeRun("private", "inline", seed, 0),
      fakeRun("public", "inline", seed, 0),
      fakeRun("private", "sealed-replay", seed, 0),
      { ...fakeRun("public", "sealed-replay", seed, 0), scheduleHash: "different" },
    ];
    assert.throws(() => buildReactivityReport(runs, "test-model"), /schedule mismatch/);
  });
});
