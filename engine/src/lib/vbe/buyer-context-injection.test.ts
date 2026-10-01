import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import { onlineSourceNotice } from "./online-source-quarantine.ts";
import {
  BUYER_CONTEXT_ARMS,
  BUYER_CONTEXT_SOURCE_SHA256,
  buildBuyerContextReport,
  buyerContextCaseHash,
  buyerContextCorpusHash,
  buyerContextOrder,
  buyerContextPrompt,
  buyerContextVerdict,
  loadBuyerContextCases,
  sha256BuyerContext,
  type BuyerContextArm,
  type BuyerContextRecord,
} from "./buyer-context-injection.ts";

function syntheticRecords(actions: Partial<Record<BuyerContextArm, boolean>>): BuyerContextRecord[] {
  const cases = loadBuyerContextCases();
  return cases.flatMap((item) => buyerContextOrder(item.block).map((arm, position) => {
    const buy = actions[arm] ?? false;
    return {
      block: item.block,
      seed: item.seed,
      phase: item.phase,
      arm,
      position: position + 1,
      contextHash: buyerContextCaseHash(item),
      promptHash: sha256BuyerContext(buyerContextPrompt(arm, item)),
      sourceBuy: item.sourceBuy,
      proposal: { giveCheck: false, giveChits: buy ? 1 : 0, requireChit: false },
      buy,
    };
  }));
}

test("selects two deterministic feasible contexts for each of 15 source seeds", () => {
  const cases = loadBuyerContextCases();
  assert.equal(buyerContextCorpusHash(), BUYER_CONTEXT_SOURCE_SHA256);
  assert.equal(cases.length, 30);
  const seeds = [...new Set(cases.map((item) => item.seed))];
  assert.equal(seeds.length, 15);
  for (const seed of seeds) {
    const rows = cases.filter((item) => item.seed === seed);
    assert.deepEqual(rows.map((item) => item.phase), ["early", "late"]);
    assert.ok(rows.every((item) => item.agent.type === "H" && item.agent.chits >= 1));
    assert.ok(rows.every((item) => item.partner.type === "E" && item.partner.checks >= 1));
    assert.ok(rows.every((item) => item.sourceBuy === false));
  }
});

test("balances all five arms over position and pairwise precedence", () => {
  const cases = loadBuyerContextCases();
  for (const arm of BUYER_CONTEXT_ARMS) for (let position = 0; position < 5; position++) {
    assert.equal(cases.filter((item) => buyerContextOrder(item.block)[position] === arm).length, 6);
  }
  for (let i = 0; i < BUYER_CONTEXT_ARMS.length; i++) for (let j = i + 1; j < BUYER_CONTEXT_ARMS.length; j++) {
    const left = BUYER_CONTEXT_ARMS[i]!, right = BUYER_CONTEXT_ARMS[j]!;
    assert.equal(cases.filter((item) => buyerContextOrder(item.block).indexOf(left) < buyerContextOrder(item.block).indexOf(right)).length, 15);
  }
});

test("reconstructs the exact original valid-visible buyer prompt", () => {
  for (const item of loadBuyerContextCases()) {
    assert.equal(
      buyerContextPrompt("online-replay", item),
      meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", onlineSourceNotice("valid-visible", item.selectedRound)),
    );
  }
});

test("keeps weak-positive economics fixed in narrow prompts", () => {
  for (const item of loadBuyerContextCases()) {
    for (const arm of ["standard-sealed", "real-state", "real-memory"] as const) {
      const prompt = buyerContextPrompt(arm, item);
      assert.match(prompt, /"conditionalNetIfExecuted":0\.183/);
      assert.match(prompt, /"sellerExecutionProbability":0\.25/);
      assert.match(prompt, /"proposalExpectedNet":0\.04575/);
      assert.doesNotMatch(prompt, /optimalProposal/);
    }
  }
});

test("identifies an envelope suppressor with seed-level paired contrasts", () => {
  const report = buildBuyerContextReport(syntheticRecords({
    "standard-sealed": true,
    "real-state": true,
    "real-memory": true,
  }), "deepseek-v4-flash");
  assert.equal(report.calls, 150);
  assert.equal(report.completeSeeds, 15);
  assert.equal(report.contrasts.envelopeUnderMemory?.mean, 1);
  assert.equal(report.contrasts.envelopeWithoutMemory?.mean, 1);
  assert.equal(report.gates.envelopeUnderMemory, true);
  assert.equal(report.gates.envelopeWithoutMemory, true);
  assert.equal(report.verdict, "PUBLIC POPULATION ENVELOPE SUPPRESSOR");
});

test("verdict tree reports the earliest cumulative suppressor", () => {
  const gates = {
    complete: true,
    integrity: true,
    sealedBaseline: true,
    onlineReplay: true,
    sourceAgreement: true,
    dynamicState: true,
    realMemory: true,
    envelopeUnderMemory: true,
    envelopeWithoutMemory: true,
    memoryUnderEnvelope: true,
    totalTransfer: true,
  };
  assert.equal(buyerContextVerdict(gates), "DYNAMIC STATE/HORIZON SUPPRESSOR");
  assert.equal(buyerContextVerdict({ ...gates, sealedBaseline: false }), "SEALED BASELINE NOT REPLICATED");
  assert.equal(buyerContextVerdict({ ...gates, onlineReplay: false }), "ONLINE NULL NOT REPRODUCED");
});
