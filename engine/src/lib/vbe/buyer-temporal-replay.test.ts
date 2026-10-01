import assert from "node:assert/strict";
import test from "node:test";
import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  BUYER_TEMPORAL_ARMS,
  BUYER_TEMPORAL_CONTROL_BLOCKS,
  BUYER_TEMPORAL_EV_CONSTANT,
  buildBuyerTemporalReport,
  buyerTemporalHistoricalRecord,
  buyerTemporalOrder,
  buyerTemporalPrompt,
  buyerTemporalRequestBodySha256,
  loadBuyerTemporalCases,
  sha256BuyerTemporal,
  type BuyerTemporalArm,
  type BuyerTemporalRecord,
} from "./buyer-temporal-replay.ts";
import type { Proposal } from "./types.ts";

function records(wrapperBuy: boolean, controlBuy: boolean, proposalOverride?: Proposal): BuyerTemporalRecord[] {
  return loadBuyerTemporalCases().flatMap((item) => BUYER_TEMPORAL_ARMS.map((arm) => {
    const buy = arm === "historical-wrapper-narrow" ? wrapperBuy : controlBuy;
    const proposal = proposalOverride ?? { giveCheck: true, giveChits: buy ? 1 : 0, requireChit: buy };
    const prompt = buyerTemporalPrompt(arm, item);
    const rawResponse = JSON.stringify(proposal);
    return {
      block: item.block,
      arm,
      position: buyerTemporalOrder(item.block).indexOf(arm) + 1,
      sourceStudy: arm === "historical-wrapper-narrow" ? "E-BUY-WRAP-D" : "E-BUY",
      sourceBlock: arm === "historical-wrapper-narrow" ? item.wrapperBlock : item.controlBlock,
      historicalPromptHash: buyerTemporalHistoricalRecord(arm, item).promptHash,
      promptHash: sha256BuyerTemporal(prompt),
      requestBodySha256: buyerTemporalRequestBodySha256(prompt),
      priorBuy: true,
      rawResponse,
      rawResponseSha256: sha256BuyerTemporal(rawResponse),
      proposal,
      buy: proposal.giveChits === 1,
      provider: {
        responseId: `test-${item.block}-${arm}`,
        returnedModel: "deepseek-v4-flash",
        created: 0,
        systemFingerprint: null,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, promptCacheHitTokens: null, promptCacheMissTokens: null },
        headers: {},
        attempt: 1,
      },
    } satisfies BuyerTemporalRecord;
  }));
}

test("selects balanced historical successes and reproduces their prompt hashes", () => {
  const cases = loadBuyerTemporalCases();
  assert.equal(cases.length, 12);
  assert.deepEqual(cases.map((item) => item.controlBlock), [...BUYER_TEMPORAL_CONTROL_BLOCKS]);
  assert.deepEqual([...new Set(cases.map((item) => item.controlAgentId))], [4, 5, 6, 7]);
  assert.equal(cases.filter((item) => item.controlHistory === "NONE").length, 6);
  assert.equal(cases.filter((item) => item.controlHistory === "TWO_PRIOR_NO_TRADES").length, 6);
  for (const item of cases) for (const arm of BUYER_TEMPORAL_ARMS) {
    const historical = buyerTemporalHistoricalRecord(arm, item);
    assert.equal(historical.buy, true);
    assert.equal(sha256BuyerTemporal(buyerTemporalPrompt(arm, item)), historical.promptHash);
  }
});

test("balances both arms over position and precedence", () => {
  for (const arm of BUYER_TEMPORAL_ARMS) {
    assert.equal(loadBuyerTemporalCases().filter((item) => buyerTemporalOrder(item.block)[0] === arm).length, 6);
    assert.equal(loadBuyerTemporalCases().filter((item) => buyerTemporalOrder(item.block)[1] === arm).length, 6);
  }
});

test("strict parser preserves the EV-L constant", () => {
  assert.deepEqual(parseBuyerProposal(JSON.stringify(BUYER_TEMPORAL_EV_CONSTANT)), BUYER_TEMPORAL_EV_CONSTANT);
});

test("two surviving historical families support new-context fragility", () => {
  assert.equal(buildBuyerTemporalReport(records(true, true), "deepseek-v4-flash").verdict, "NEW-CONTEXT FRAGILITY SUPPORTED");
});

test("a cross-family constant no-buy collapse has its own verdict", () => {
  const report = buildBuyerTemporalReport(records(false, false, { ...BUYER_TEMPORAL_EV_CONSTANT }), "deepseek-v4-flash");
  assert.equal(report.responseShape.uniqueProposalCount, 1);
  assert.equal(report.responseShape.proposalEntropyBits, 0);
  assert.equal(report.verdict, "BROAD CURRENT-WINDOW OUTPUT COLLAPSE");
});

test("a live positive control isolates prompt-family temporal drift", () => {
  assert.equal(buildBuyerTemporalReport(records(false, true), "deepseek-v4-flash").verdict, "PROMPT-FAMILY-SPECIFIC TEMPORAL DRIFT");
});

test("raw-response corruption makes a complete run invalid", () => {
  const corrupted = records(true, true);
  corrupted[0] = { ...corrupted[0]!, rawResponseSha256: "bad" };
  const report = buildBuyerTemporalReport(corrupted, "deepseek-v4-flash");
  assert.equal(report.integrity.rawHashesValid, false);
  assert.equal(report.verdict, "INVALID");
});
