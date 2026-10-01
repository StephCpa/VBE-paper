import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CALIBRATION_TRADE_COUNTS,
  FOUNDER_ROYALTY_ARMS,
  FOUNDER_ROYALTY_ORDERS,
  FOUNDER_ROYALTY_SEEDS,
  LOTTERY_UNITS_BY_SEED,
  buildFounderRoyaltyReport,
  founderRoyaltyPrompt,
  royaltySettlement,
  settleRoyaltyDecision,
  validateFounderRoyaltyDecision,
  type FounderRoyaltyArm,
  type FounderRoyaltyRun,
} from "./founder-royalty.ts";
import { CANDIDATE_PROPOSAL, type FounderDecision } from "./founder.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RoundSnapshot, RunResult } from "./types.ts";

const publish: FounderDecision = { speak: true, proposal: { ...CANDIDATE_PROPOSAL }, rationale: "positive expected return" };
const silent: FounderDecision = { speak: false, proposal: { kind: "none", token: "", units_per_check: 0, transaction_fee: 0, beneficiary: "none" }, rationale: "silent" };

function slice(trades: number): CoordinationSlice {
  return { heMeetings: 10, opportunities: 10, sellerIntents: trades, buyerIntents: trades, trades, sellerIntentRate: trades / 10, buyerIntentRate: trades / 10, tradeRate: trades / 10, sellerIntentPerHe: trades / 10, buyerIntentPerHe: trades / 10, tradePerHe: trades / 10 };
}

function fakeRun(arm: FounderRoyaltyArm, seed: number, founded: boolean): FounderRoyaltyRun {
  const speakerId = seed % 8;
  const speaker: AgentState = { id: speakerId, type: "E", checks: 1, chits: 0, score: 1, solved: true, receivedFrom: null, memory: [] };
  const authorship = settleRoyaltyDecision(arm, speaker, founded ? publish : silent);
  const trades = arm === "trade-royalty" && founded ? 1 : 0;
  const settlement = royaltySettlement(arm, seed, founded, trades);
  const rounds: RoundSnapshot[] = Array.from({ length: 24 }, (_, index) => ({ t: index + 1, types: Array(8).fill("E"), chits: Array(8).fill(0), scores: Array(8).fill(10), meetings: [], solved: Array(8).fill(false), heOffers: 0, heAccepts: 0 }));
  const scores = Array(8).fill(10); scores[speakerId] += settlement.endPayout;
  const result: RunResult = { scores, meanScore: scores.reduce((a, b) => a + b, 0) / 8, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds };
  return { arm, seed, speakerId, authorCalls: 1, actionCalls: 0, apiFails: 0, parseFails: 0, scheduleHash: `schedule-${seed}`, authorship, settlement, seller: slice(trades), buyer: slice(trades), trade: slice(trades), founderFinalScore: scores[speakerId], meanScore: result.meanScore, result };
}

function block(seed: number, royalty: boolean, lottery = false, refund = false) {
  return [fakeRun("refund-control", seed, refund), fakeRun("trade-royalty", seed, royalty), fakeRun("lottery-wealth-control", seed, lottery)];
}

describe("founder transaction royalty", () => {
  it("uses fresh seeds and balances arm positions", () => {
    assert.equal(FOUNDER_ROYALTY_SEEDS.length, 18);
    assert.equal(new Set(FOUNDER_ROYALTY_SEEDS).size, 18);
    for (const arm of FOUNDER_ROYALTY_ARMS) {
      const positions = FOUNDER_ROYALTY_SEEDS.map((_, i) => FOUNDER_ROYALTY_ORDERS[i % 3]!.indexOf(arm));
      assert.deepEqual([0, 1, 2].map((p) => positions.filter((x) => x === p).length), [6, 6, 6]);
    }
  });

  it("matches the lottery distribution to calibration exactly", () => {
    assert.deepEqual([...LOTTERY_UNITS_BY_SEED].sort(), [...CALIBRATION_TRADE_COUNTS].sort());
    assert.equal(LOTTERY_UNITS_BY_SEED.reduce((a, b) => a + b, 0) / 18, 4 / 3);
  });

  it("keeps candidate fixed and distinguishes contingent from independent pay", () => {
    const me = { id: 3, type: "E" as const, checks: 1, chits: 0, score: 1 };
    const royalty = founderRoyaltyPrompt("trade-royalty", me, 1, 24);
    const lottery = founderRoyaltyPrompt("lottery-wealth-control", me, 1, 24);
    assert.match(royalty, /No publication means no royalty/);
    assert.match(lottery, /whether you publish or stay silent/);
    assert.match(royalty, /"transaction_fee":0,"beneficiary":"none"/);
    assert.match(lottery, /"transaction_fee":0,"beneficiary":"none"/);
  });

  it("enforces strict author schema and settlement arithmetic", () => {
    assert.equal(validateFounderRoyaltyDecision(JSON.stringify(publish)), null);
    assert.equal(royaltySettlement("trade-royalty", FOUNDER_ROYALTY_SEEDS[0]!, true, 2).totalContractNet, 3);
    assert.equal(royaltySettlement("trade-royalty", FOUNDER_ROYALTY_SEEDS[0]!, false, 2).endPayout, 0);
    assert.equal(royaltySettlement("lottery-wealth-control", FOUNDER_ROYALTY_SEEDS[0]!, false, 0).endPayout, 2);
  });

  it("supports only complete royalty-specific separation", () => {
    const report = buildFounderRoyaltyReport(FOUNDER_ROYALTY_SEEDS.flatMap((seed) => block(seed, true)), "test-model");
    assert.equal(report.completeBlocks, 18);
    assert.equal(report.primary?.mean, 1);
    assert.equal(report.primary?.exactUpperP, 1 / 2 ** 18);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("rejects payout corruption", () => {
    const run = fakeRun("trade-royalty", FOUNDER_ROYALTY_SEEDS[0]!, true);
    run.settlement.endPayout += 1;
    assert.throws(() => buildFounderRoyaltyReport([run], "test-model"), /end settlement invariant/);
  });
});
