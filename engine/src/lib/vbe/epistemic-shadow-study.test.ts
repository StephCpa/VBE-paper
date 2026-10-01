import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  SHADOW_PILOT_SEEDS,
  buildShadowStudyReport,
  type ShadowStudyRun,
} from "./epistemic-shadow-study.ts";
import { SHADOW_CHECKPOINTS, SHADOW_LLM_IDS } from "./epistemic-shadow.ts";

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
  kind: "private" | "public",
  seed: number,
  action: number,
  second: number,
): ShadowStudyRun {
  const records = SHADOW_CHECKPOINTS.flatMap((t) =>
    SHADOW_LLM_IDS.map((agentId) => ({
      t,
      agentId,
      wouldSell: true,
      firstCount: 5,
      secondCount: Math.round(second * 5),
    })),
  );
  return {
    kind,
    seed,
    actionCalls: 144,
    probeCalls: records.length,
    parseFails: 0,
    apiFails: 0,
    actionBeliefFields: 0,
    robotIds: [0, 1],
    scheduleHash: `seed-${seed}`,
    primaryRounds: { first: 5, last: 21 },
    checkpoints: [...SHADOW_CHECKPOINTS],
    meanScore: action,
    llmSeller: { ...zeroSlice, sellerIntentPerHe: action },
    llmBuyer: { ...zeroSlice, buyerIntentPerHe: action },
    llmLlm: { ...zeroSlice, tradePerHe: action },
    shadowRecords: records,
    shadow: {
      n: records.length,
      selfSellRate: 1,
      firstCount: 5,
      secondCount: second * 5,
      firstShare: 1,
      secondShare: second,
      firstMae: 0,
      secondMae: 0,
    },
    shadowByCheckpoint: {},
    result: {
      scores: [],
      meanScore: action,
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

const gate = {
  study: "E-SHADOW-GATES-V2-SEMANTIC-FIELDS",
  model: "test-model",
  exact: 20,
  n: 20,
  pass: true,
  verdict: "PASS",
};

describe("shadow Study E pilot", () => {
  it("pairs by structural seed and identifies the action-plus-belief branch", () => {
    const runs = SHADOW_PILOT_SEEDS.flatMap((seed) => [
      fakeRun("private", seed, 0.1, 0.2),
      fakeRun("public", seed, 0.4, 0.6),
    ]);
    const report = buildShadowStudyReport(runs, "test-model", gate);
    assert.equal(report.completePairs, 8);
    assert.ok(Math.abs((report.effects.buyerIntentRate?.mean ?? 0) - 0.3) < 1e-12);
    assert.ok(Math.abs((report.effects.secondShare?.mean ?? 0) - 0.4) < 1e-12);
    assert.equal(report.verdict, "EXPLORATORY ACTION + HIGHER-ORDER SIGNAL");
    assert.equal(report.nonReactivityAudit.actionBeliefFieldsObserved, 0);
  });

  it("blocks a failed instrument gate", () => {
    assert.throws(
      () => buildShadowStudyReport([], "test-model", { ...gate, exact: 19, pass: false }),
      /instrument gate/,
    );
  });

  it("labels a negative buyer pattern only as a post-hoc diagnostic", () => {
    const runs = SHADOW_PILOT_SEEDS.flatMap((seed) => [
      fakeRun("private", seed, 0.4, 0.5),
      fakeRun("public", seed, 0.2, 0.5),
    ]);
    const report = buildShadowStudyReport(runs, "test-model", gate);
    assert.equal(report.verdict, "NO LARGE POSITIVE EXPLORATORY SIGNAL");
    assert.equal(report.postHocDiagnostic.publicBuyerSuppressionCandidate, true);
    assert.equal(report.postHocDiagnostic.status, "POST-HOC — HYPOTHESIS GENERATING ONLY");
  });

  it("rejects a public/private schedule mismatch", () => {
    const privateRun = fakeRun("private", SHADOW_PILOT_SEEDS[0], 0, 0);
    const publicRun = {
      ...fakeRun("public", SHADOW_PILOT_SEEDS[0], 0, 0),
      scheduleHash: "different",
    };
    assert.throws(
      () => buildShadowStudyReport([privateRun, publicRun], "test-model", gate),
      /schedule mismatch/,
    );
  });
});
