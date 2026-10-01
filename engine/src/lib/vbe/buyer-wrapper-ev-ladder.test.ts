import assert from "node:assert/strict";
import test from "node:test";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import { buyerEnvelopePrompt, loadBuyerEnvelopeCases, sha256BuyerEnvelope } from "./buyer-envelope-disassembly.ts";
import { loadBuyerWrapperCases } from "./buyer-wrapper-disassembly.ts";
import {
  BUYER_EV_ARMS,
  BUYER_EV_SOURCE_SHA256,
  BUYER_EV_TIERS,
  buildBuyerEvReport,
  buyerEvCaseHash,
  buyerEvCorpusHash,
  buyerEvOrder,
  buyerEvPrompt,
  buyerEvUnusedCandidateKeys,
  buyerEvVerdict,
  loadBuyerEvCases,
  sha256BuyerEv,
  type BuyerEvArm,
  type BuyerEvRecord,
} from "./buyer-wrapper-ev-ladder.ts";

type ActionRule = Partial<Record<BuyerEvArm, boolean | ((block: number) => boolean)>>;

function syntheticRecords(actions: ActionRule): BuyerEvRecord[] {
  return loadBuyerEvCases().flatMap((item) => buyerEvOrder(item.block).map((arm, position) => {
    const rule = actions[arm];
    const buy = typeof rule === "function" ? rule(item.block) : rule ?? false;
    return {
      block: item.block,
      seed: item.seed,
      phase: item.phase,
      arm,
      position: position + 1,
      contextHash: buyerEvCaseHash(item),
      promptHash: sha256BuyerEv(buyerEvPrompt(arm, item)),
      sourceBuy: item.sourceBuy,
      proposal: { giveCheck: false, giveChits: buy ? 1 : 0, requireChit: false },
      buy,
    };
  }));
}

test("selects the 35-meeting inventory and 12 fresh contexts declared by the protocol", () => {
  const cases = loadBuyerEvCases();
  const prior = new Set([...loadBuyerContextCases(), ...loadBuyerEnvelopeCases(), ...loadBuyerWrapperCases()]
    .map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  assert.equal(buyerEvCorpusHash(), BUYER_EV_SOURCE_SHA256);
  assert.equal(buyerEvUnusedCandidateKeys().length, 35);
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map((item) => item.seed)).size, 12);
  assert.equal(cases.filter((item) => item.phase === "early").length, 6);
  assert.equal(cases.filter((item) => item.phase === "late").length, 6);
  assert.deepEqual(cases.map((item) => [item.seed, item.selectedRound, item.hardId, item.easyId, item.phase]), [
    [12553, 10, 3, 5, "early"],
    [12601, 16, 0, 6, "late"],
    [12613, 10, 2, 4, "early"],
    [12619, 16, 4, 6, "late"],
    [12637, 7, 3, 4, "early"],
    [12641, 14, 4, 6, "late"],
    [12647, 16, 7, 4, "late"],
    [12653, 14, 7, 4, "late"],
    [12671, 6, 0, 2, "early"],
    [12689, 5, 5, 4, "early"],
    [12697, 5, 4, 3, "early"],
    [12703, 14, 4, 6, "late"],
  ]);
  const selected = new Set(cases.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  assert.equal(buyerEvUnusedCandidateKeys().filter((key) => !selected.has(key)).length, 23);
  const wrapperSeeds = new Set(loadBuyerWrapperCases().map((item) => item.seed));
  assert.deepEqual(cases.filter((item) => wrapperSeeds.has(item.seed)).map((item) => item.seed), [12553, 12601, 12613, 12619, 12637, 12641, 12647, 12653]);
  for (const item of cases) {
    assert.equal(prior.has(`${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`), false);
    assert.equal(item.agent.type, "H");
    assert.equal(item.partner.type, "E");
    assert.ok(item.agent.chits >= 1 && item.partner.checks >= 1);
    assert.equal(item.sourceBuy, false);
  }
});

test("balances six arms over positions and pairwise precedence", () => {
  const cases = loadBuyerEvCases();
  for (const arm of BUYER_EV_ARMS) for (let position = 0; position < 6; position++) {
    assert.equal(cases.filter((item) => buyerEvOrder(item.block)[position] === arm).length, 2);
  }
  for (let i = 0; i < BUYER_EV_ARMS.length; i++) for (let j = i + 1; j < BUYER_EV_ARMS.length; j++) {
    const left = BUYER_EV_ARMS[i]!;
    const right = BUYER_EV_ARMS[j]!;
    assert.equal(cases.filter((item) => buyerEvOrder(item.block).indexOf(left) < buyerEvOrder(item.block).indexOf(right)).length, 6);
  }
});

test("keeps weak anchors exact and separates monotone margin and certainty steps", () => {
  for (const item of loadBuyerEvCases()) {
    assert.equal(buyerEvPrompt("weak-narrow-anchor", item), buyerEnvelopePrompt("narrow-anchor", item));
    assert.equal(buyerEvPrompt("weak-public-hard-anchor", item), buyerEnvelopePrompt("public-hard-current-full", item));
  }
  assert.equal(BUYER_EV_TIERS.weak.sellerExecutionProbability, BUYER_EV_TIERS.medium.sellerExecutionProbability);
  assert.equal(BUYER_EV_TIERS.medium.savedMarkOpportunityValue, BUYER_EV_TIERS.strong.savedMarkOpportunityValue);
  assert.equal(BUYER_EV_TIERS.medium.expectedNetIfExecuted, BUYER_EV_TIERS.strong.expectedNetIfExecuted);
  assert.deepEqual(Object.values(BUYER_EV_TIERS).map((tier) => tier.expectedNetIfExecuted), [0.183, 1.33, 1.33]);
  assert.deepEqual(Object.values(BUYER_EV_TIERS).map((tier) => tier.proposalExpectedNet), [0.04575, 0.3325, 1.33]);
  for (const tier of Object.values(BUYER_EV_TIERS)) {
    assert.ok(Math.abs(1.83 - tier.savedMarkOpportunityValue - tier.expectedNetIfExecuted) < 1e-12);
    assert.ok(Math.abs(tier.sellerExecutionProbability * tier.expectedNetIfExecuted - tier.proposalExpectedNet) < 1e-12);
  }
  const item = loadBuyerEvCases()[0]!;
  assert.match(buyerEvPrompt("medium-narrow", item), /"savedMarkOpportunityValue":0\.5/);
  assert.match(buyerEvPrompt("medium-narrow", item), /"sellerExecutionProbability":0\.25/);
  assert.match(buyerEvPrompt("strong-narrow", item), /"sellerExecutionProbability":1/);
  assert.notEqual(buyerEvPrompt("weak-public-hard-anchor", item), buyerEvPrompt("medium-public-hard", item));
  assert.notEqual(buyerEvPrompt("medium-public-hard", item), buyerEvPrompt("strong-public-hard", item));
  for (const arm of ["weak-public-hard-anchor", "medium-public-hard", "strong-public-hard"] as const) {
    const envelopeLine = buyerEvPrompt(arm, item).split("\n").find((line) => line.startsWith('{"sourceId":"OSQ-1"'));
    assert.ok(envelopeLine);
    const envelope = JSON.parse(envelopeLine) as { payloadSha256: string; numericPayload: unknown };
    assert.equal(envelope.payloadSha256, sha256BuyerEnvelope(JSON.stringify(envelope.numericPayload)));
    assert.equal("actionCompiler" in (envelope.numericPayload as { hardBuyer: object }).hardBuyer, false);
  }
  const narrowLine = buyerEvPrompt("strong-narrow", item).split("\n").find((line) => line.startsWith('{"caseId":"BUY-ENV-D'));
  assert.ok(narrowLine);
  assert.equal(JSON.parse(narrowLine).decisionSupport.actionCompiler, null);
});

test("reports strong persistence when the public endpoint stays suppressed", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "medium-narrow": true,
    "strong-narrow": true,
  }), "deepseek-v4-flash");
  assert.equal(report.integrity.seedOverlapDisclosed, true);
  assert.equal(report.linkStatus, "WEAK LINK REPLICATED");
  assert.equal(report.gates.strongRobustness, true);
  assert.equal(report.verdict, "WRAPPER GAP PERSISTS AT STRONG EV");
});

test("reports full threshold shift and localizes a margin step", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "medium-narrow": true,
    "strong-narrow": true,
    "medium-public-hard": true,
    "strong-public-hard": true,
  }), "deepseek-v4-flash");
  assert.equal(report.gates.thresholdShift, true);
  assert.equal(report.gates.marginStep, true);
  assert.equal(report.gates.certaintyStep, false);
  assert.equal(report.verdict, "NEAR-INDIFFERENCE INTERFACE THRESHOLD SHIFT");
});

test("preserves the partial-recovery middle region", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "medium-narrow": true,
    "strong-narrow": true,
    "strong-public-hard": (block) => block <= 6,
  }), "deepseek-v4-flash");
  assert.equal(report.contrasts.publicTotalDose?.mean, 0.5);
  assert.equal(report.contrasts.strongWrapperGap?.mean, 0.5);
  assert.equal(report.gates.strongRobustness, false);
  assert.equal(report.gates.thresholdShift, false);
  assert.equal(report.verdict, "PARTIAL EV DOSE RESPONSE WITH RESIDUAL WRAPPER GAP");
});

test("separates descriptive recovery from confirmatory threshold shift after weak-link drift", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "weak-public-hard-anchor": (block) => block <= 3,
    "medium-narrow": true,
    "strong-narrow": true,
    "medium-public-hard": (block) => block <= 8,
    "strong-public-hard": (block) => block <= 10,
  }), "deepseek-v4-flash");
  assert.equal(report.linkStatus, "WEAK LINK DRIFTED");
  assert.equal(report.gates.thresholdShift, false);
  assert.ok((report.contrasts.publicTotalDose?.mean ?? 0) >= 0.25);
  assert.ok((report.contrasts.strongWrapperGap?.mean ?? 1) < 0.25);
  assert.equal(report.verdict, "DESCRIPTIVE EV RECOVERY — LINK OR THRESHOLD GATE NOT MET");
});

test("routes narrow-arm collapse to tier-manipulation failure", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "medium-narrow": true,
    "strong-narrow": (block) => block <= 2,
    "strong-public-hard": (block) => block <= 2,
  }), "deepseek-v4-flash");
  assert.equal(report.gates.narrowFloorHeld, false);
  assert.equal(report.gates.tierManipulationValid, false);
  assert.deepEqual(report.stepStatus, { margin: "MARGIN STEP NOT INTERPRETABLE", certainty: "CERTAINTY STEP NOT INTERPRETABLE" });
  assert.equal(report.verdict, "TIER MANIPULATION NOT VALIDATED");
});

test("reports a single-axis response when medium recovery reverses at strong certainty", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "medium-narrow": true,
    "strong-narrow": (block) => block <= 9,
    "medium-public-hard": (block) => block <= 8,
    "strong-public-hard": (block) => block >= 10 && block <= 11,
  }), "deepseek-v4-flash");
  assert.equal(report.gates.tierManipulationValid, true);
  assert.equal(report.gates.marginStep, true);
  assert.equal(report.gates.strongRobustness, false);
  assert.equal(report.contrasts.publicTotalDose?.mean, 2 / 12);
  assert.equal(report.verdict, "SINGLE-AXIS EV RESPONSE WITHOUT STRONG-ENDPOINT RECOVERY");
});

test("reserves the no-localization verdict for valid tiers without a material step or total recovery", () => {
  const report = buildBuyerEvReport(syntheticRecords({
    "weak-narrow-anchor": true,
    "weak-public-hard-anchor": (block) => block <= 6,
    "medium-narrow": true,
    "medium-public-hard": (block) => block <= 6,
    "strong-narrow": true,
    "strong-public-hard": (block) => block <= 8,
  }), "deepseek-v4-flash");
  assert.equal(report.gates.tierManipulationValid, true);
  assert.equal(report.gates.singleAxisResponse, false);
  assert.equal(report.contrasts.publicTotalDose?.mean, 2 / 12);
  assert.equal(report.verdict, "NO ECONOMIC ROBUSTNESS LOCALIZED");
});

test("verdict ordering protects incomplete and invalid runs", () => {
  const base = { complete: true, integrity: true, tierManipulationValid: true, strongRobustness: false, thresholdShift: false, singleAxisResponse: false, publicTotalDose: 0.5, strongWrapperGap: 0.5 };
  assert.equal(buyerEvVerdict(base), "PARTIAL EV DOSE RESPONSE WITH RESIDUAL WRAPPER GAP");
  assert.equal(buyerEvVerdict({ ...base, complete: false }), "INCOMPLETE");
  assert.equal(buyerEvVerdict({ ...base, integrity: false }), "INVALID");
  assert.equal(buyerEvVerdict({ ...base, tierManipulationValid: false }), "TIER MANIPULATION NOT VALIDATED");
  const incomplete = buildBuyerEvReport([], "deepseek-v4-flash");
  assert.equal(incomplete.linkStatus, "PENDING");
  assert.deepEqual(incomplete.stepStatus, { margin: "PENDING", certainty: "PENDING" });
});
