import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CANDIDATE_PROPOSAL, type FounderDecision } from "./founder.ts";
import { founderRoyaltyPrompt } from "./founder-royalty.ts";
import {
  SANITIZED_LOTTERY_UNITS,
  SANITIZED_ROYALTY_ARMS,
  SANITIZED_ROYALTY_ORDERS,
  SANITIZED_ROYALTY_SEEDS,
  buildSanitizedRoyaltyReport,
  canonicalRoyaltyPayoffObject,
  sanitizedRoyaltyPrompt,
  sanitizedRoyaltySettlement,
  settleSanitizedRoyaltyDecision,
  type SanitizedRoyaltyArm,
  type SanitizedRoyaltyRun,
} from "./founder-sanitized-royalty.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RoundSnapshot, RunResult } from "./types.ts";

const publish: FounderDecision = { speak: true, proposal: { ...CANDIDATE_PROPOSAL }, rationale: "positive expected return" };
const silent: FounderDecision = { speak: false, proposal: { kind: "none", token: "", units_per_check: 0, transaction_fee: 0, beneficiary: "none" }, rationale: "silent" };

function slice(trades: number): CoordinationSlice {
  return { heMeetings: 10, opportunities: 10, sellerIntents: trades, buyerIntents: trades, trades, sellerIntentRate: trades / 10, buyerIntentRate: trades / 10, tradeRate: trades / 10, sellerIntentPerHe: trades / 10, buyerIntentPerHe: trades / 10, tradePerHe: trades / 10 };
}

function fakeRun(arm: SanitizedRoyaltyArm, seed: number, founded: boolean): SanitizedRoyaltyRun {
  const speakerId = seed % 8;
  const speaker: AgentState = { id: speakerId, type: "E", checks: 1, chits: 0, score: 1, solved: true, receivedFrom: null, memory: [] };
  const authorship = settleSanitizedRoyaltyDecision(speaker, founded ? publish : silent);
  const trades = arm !== "canonical-lottery-wealth-control" && founded ? 1 : 0;
  const settlement = sanitizedRoyaltySettlement(arm, seed, founded, trades);
  const rounds: RoundSnapshot[] = Array.from({ length: 24 }, (_, i) => ({ t: i + 1, types: Array(8).fill("E"), chits: Array(8).fill(0), scores: Array(8).fill(10), meetings: [], solved: Array(8).fill(false), heOffers: 0, heAccepts: 0 }));
  const scores = Array(8).fill(10); scores[speakerId] += settlement.endPayout;
  const result: RunResult = { scores, meanScore: scores.reduce((a, b) => a + b, 0) / 8, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds };
  return { arm, seed, speakerId, authorCalls: 1, actionCalls: 0, apiFails: 0, parseFails: 0, scheduleHash: `schedule-${seed}`, authorship, settlement, seller: slice(trades), buyer: slice(trades), trade: slice(trades), founderFinalScore: scores[speakerId], meanScore: result.meanScore, result };
}

function block(seed: number, raw: boolean, canonical: boolean, lottery: boolean) {
  return [fakeRun("raw-trade-royalty", seed, raw), fakeRun("canonical-trade-royalty", seed, canonical), fakeRun("canonical-lottery-wealth-control", seed, lottery)];
}

describe("sanitized royalty environment replication", () => {
  it("uses 18 fresh seeds and balances all arm positions", () => {
    assert.equal(SANITIZED_ROYALTY_SEEDS.length, 18);
    assert.equal(new Set(SANITIZED_ROYALTY_SEEDS).size, 18);
    for (const arm of SANITIZED_ROYALTY_ARMS) {
      const positions = SANITIZED_ROYALTY_SEEDS.map((_, i) => SANITIZED_ROYALTY_ORDERS[i % 3]!.indexOf(arm));
      assert.deepEqual([0, 1, 2].map((p) => positions.filter((x) => x === p).length), [6, 6, 6]);
    }
  });

  it("matches the frozen empirical lottery distribution", () => {
    assert.deepEqual([...SANITIZED_LOTTERY_UNITS].sort(), [3, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1].sort());
    assert.equal(SANITIZED_LOTTERY_UNITS.reduce((a, b) => a + b, 0) / 18, 4 / 3);
  });

  it("keeps raw I-T wording and supplies verified recommendation-free canonical objects", () => {
    const me = { id: 3, type: "E" as const, checks: 1, chits: 0, score: 1 };
    const raw = sanitizedRoyaltyPrompt("raw-trade-royalty", me, 1, 24);
    const trade = sanitizedRoyaltyPrompt("canonical-trade-royalty", me, 1, 24);
    const lottery = sanitizedRoyaltyPrompt("canonical-lottery-wealth-control", me, 1, 24);
    assert.equal(raw, founderRoyaltyPrompt("trade-royalty", me, 1, 24));
    assert.doesNotMatch(raw, /TRUSTED CANONICAL PAYOFF OBJECT/);
    assert.match(trade, /"marginal_expected_net_publish_minus_silent":"\+5\/3"/);
    assert.match(trade, /current trades may be zero/);
    assert.match(lottery, /"payment_dependency":"independent_of_publication"/);
    assert.equal(canonicalRoyaltyPayoffObject("canonical-trade-royalty").action_recommendation, null);
  });

  it("settles contingent and independent payouts exactly", () => {
    const seed = SANITIZED_ROYALTY_SEEDS[0]!;
    assert.equal(sanitizedRoyaltySettlement("canonical-trade-royalty", seed, true, 2).totalContractNet, 3);
    assert.equal(sanitizedRoyaltySettlement("canonical-trade-royalty", seed, false, 2).endPayout, 0);
    assert.equal(sanitizedRoyaltySettlement("canonical-lottery-wealth-control", seed, false, 0).endPayout, 2);
  });

  it("supports only representation rescue plus contingency fidelity", () => {
    const report = buildSanitizedRoyaltyReport(SANITIZED_ROYALTY_SEEDS.flatMap((seed) => block(seed, false, true, false)), "test-model");
    assert.equal(report.effects.representationRescue?.mean, 1);
    assert.equal(report.effects.contingencyFidelity?.mean, 1);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("distinguishes fidelity without incremental representation rescue", () => {
    const report = buildSanitizedRoyaltyReport(SANITIZED_ROYALTY_SEEDS.flatMap((seed) => block(seed, true, true, false)), "test-model");
    assert.equal(report.verdict, "CONTINGENCY FIDELITY WITHOUT REPRESENTATION RESCUE");
  });

  it("rejects corrupted payout records", () => {
    const run = fakeRun("canonical-trade-royalty", SANITIZED_ROYALTY_SEEDS[0]!, true);
    run.settlement.endPayout += 1;
    assert.throws(() => buildSanitizedRoyaltyReport([run], "test-model"), /end settlement invariant/);
  });
});
