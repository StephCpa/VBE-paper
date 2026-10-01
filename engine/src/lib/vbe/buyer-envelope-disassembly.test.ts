import assert from "node:assert/strict";
import test from "node:test";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import {
  BUYER_ENVELOPE_ARMS,
  BUYER_ENVELOPE_SOURCE_SHA256,
  buildBuyerEnvelopeReport,
  buyerEnvelopeCaseHash,
  buyerEnvelopeCorpusHash,
  buyerEnvelopeOrder,
  buyerEnvelopePayload,
  buyerEnvelopePrompt,
  buyerEnvelopeVerdict,
  loadBuyerEnvelopeCases,
  sha256BuyerEnvelope,
  type BuyerEnvelopeArm,
  type BuyerEnvelopeRecord,
} from "./buyer-envelope-disassembly.ts";
import { onlineSourceNotice } from "./online-source-quarantine.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";

function syntheticRecords(actions: Partial<Record<BuyerEnvelopeArm, boolean>>): BuyerEnvelopeRecord[] {
  return loadBuyerEnvelopeCases().flatMap((item) => buyerEnvelopeOrder(item.block).map((arm, position) => {
    const buy = actions[arm] ?? false;
    return {
      block: item.block,
      seed: item.seed,
      phase: item.phase,
      arm,
      position: position + 1,
      contextHash: buyerEnvelopeCaseHash(item),
      promptHash: sha256BuyerEnvelope(buyerEnvelopePrompt(arm, item)),
      sourceBuy: item.sourceBuy,
      proposal: { giveCheck: false, giveChits: buy ? 1 : 0, requireChit: false },
      buy,
    };
  }));
}

test("selects one unused feasible context for all 18 source seeds", () => {
  const cases = loadBuyerEnvelopeCases();
  const prior = new Set(loadBuyerContextCases().map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  assert.equal(buyerEnvelopeCorpusHash(), BUYER_ENVELOPE_SOURCE_SHA256);
  assert.equal(cases.length, 18);
  assert.equal(new Set(cases.map((item) => item.seed)).size, 18);
  assert.equal(cases.filter((item) => item.phase === "early").length, 9);
  assert.equal(cases.filter((item) => item.phase === "late").length, 9);
  for (const item of cases) {
    assert.equal(prior.has(`${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`), false);
    assert.equal(item.agent.type, "H");
    assert.equal(item.partner.type, "E");
    assert.ok(item.agent.chits >= 1 && item.partner.checks >= 1);
    assert.equal(item.sourceBuy, false);
  }
});

test("balances six arms over position and pairwise precedence", () => {
  const cases = loadBuyerEnvelopeCases();
  for (const arm of BUYER_ENVELOPE_ARMS) for (let position = 0; position < 6; position++) {
    assert.equal(cases.filter((item) => buyerEnvelopeOrder(item.block)[position] === arm).length, 3);
  }
  for (let i = 0; i < BUYER_ENVELOPE_ARMS.length; i++) for (let j = i + 1; j < BUYER_ENVELOPE_ARMS.length; j++) {
    const left = BUYER_ENVELOPE_ARMS[i]!, right = BUYER_ENVELOPE_ARMS[j]!;
    assert.equal(cases.filter((item) => buyerEnvelopeOrder(item.block).indexOf(left) < buyerEnvelopeOrder(item.block).indexOf(right)).length, 9);
  }
});

test("reconstructs the exact original online envelope prompt", () => {
  for (const item of loadBuyerEnvelopeCases()) assert.equal(
    buyerEnvelopePrompt("original-envelope", item),
    meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", onlineSourceNotice("valid-visible", item.selectedRound)),
  );
});

test("orthogonalizes target and proposal materialization in the dual-role core", () => {
  const currentFull = buyerEnvelopePayload("public-dual-current-full");
  const currentPartial = buyerEnvelopePayload("public-dual-current-partial");
  const populationFull = buyerEnvelopePayload("public-dual-population-full");
  assert.equal(currentFull.target, "CURRENT_HARD_BUYER_PROPOSAL");
  assert.equal(currentPartial.target, "CURRENT_HARD_BUYER_PROPOSAL");
  assert.equal(populationFull.target, "CURRENT_VBE_POPULATION_ROUNDS_5_16");
  assert.deepEqual(currentFull.easySeller, currentPartial.easySeller);
  assert.deepEqual(currentFull.easySeller, populationFull.easySeller);
  assert.equal(currentFull.hardBuyer.proposalExpectedNet, 0.04575);
  assert.equal(populationFull.hardBuyer.proposalExpectedNet, 0.04575);
  assert.equal("proposalExpectedNet" in currentPartial.hardBuyer, false);
  assert.equal("sellerExecutionProbability" in currentPartial.hardBuyer, false);
  const strip = (value: typeof currentFull) => ({ ...value, target: "X", hardBuyer: { ...value.hardBuyer, sellerExecutionProbability: undefined, proposalExpectedNet: undefined } });
  assert.deepEqual(strip(currentFull), strip(currentPartial as typeof currentFull));
  assert.deepEqual(strip(currentFull), strip(populationFull));
});

test("identifies the target main effect in a clean factorial pattern", () => {
  const report = buildBuyerEnvelopeReport(syntheticRecords({
    "narrow-anchor": true,
    "public-hard-current-full": true,
    "public-dual-current-full": true,
    "public-dual-current-partial": true,
  }), "deepseek-v4-flash");
  assert.equal(report.calls, 108);
  assert.equal(report.contrasts.targetMain?.mean, 1);
  assert.equal(report.contrasts.materializationMain?.mean, 0);
  assert.equal(report.gates.targetMain, true);
  assert.equal(report.gates.materializationMain, false);
  assert.equal(report.verdict, "POPULATION TARGET SUPPRESSOR");
});

test("verdict tree protects replication and reports the earliest bridge", () => {
  const gates = {
    complete: true,
    integrity: true,
    narrowBaseline: true,
    originalEnvelope: true,
    sourceAgreement: true,
    wrapperBridge: true,
    nestingBridge: true,
    targetMain: true,
    materializationMain: true,
    coreRepair: true,
  };
  assert.equal(buyerEnvelopeVerdict(gates), "PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR");
  assert.equal(buyerEnvelopeVerdict({ ...gates, narrowBaseline: false }), "NARROW BASELINE NOT REPLICATED");
  assert.equal(buyerEnvelopeVerdict({ ...gates, originalEnvelope: false }), "ONLINE ENVELOPE NULL NOT REPRODUCED");
});
