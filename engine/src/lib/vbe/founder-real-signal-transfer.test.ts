import test from "node:test";
import assert from "node:assert/strict";
import { coordinationSlice } from "./epistemic.ts";
import { runPopulationAsyncPaired } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  CALIBRATION_COUNTS,
  POSTERIOR_EARLY,
  POSTERIOR_NO_EARLY,
  PRIOR_Y,
  REAL_SIGNAL_ARMS,
  REAL_SIGNAL_SEEDS,
  buildRealSignalReport,
  earlyTradeCountFromMemories,
  optimalRealSignalPublish,
  parseRealSignalAction,
  qualifyingTradeCount,
  realSignalDecisionObject,
  realSignalOrder,
  realSignalPriorSeedOverlap,
  signalFromEarlyTrades,
  type RealSignalRun,
} from "./founder-real-signal-transfer.ts";
import type { AgentState, Meeting, RoundSnapshot, RunResult } from "./types.ts";

function tradeMeeting(t: number): Meeting {
  return {
    t, i: 0, j: 1, iType: "E", jType: "H",
    pi: { giveCheck: true, giveChits: 0, requireChit: true },
    pj: { giveCheck: false, giveChits: 1, requireChit: false },
    kind: "chit-for-check", seller: 0, buyer: 1,
    hardHadChit: true, easyHadCheck: true,
  };
}

function round(t: number, meetings: Meeting[] = []): RoundSnapshot {
  return { t, types: ["E", "H", "E", "H", "E", "H", "E", "H"], chits: Array(8).fill(0), scores: Array(8).fill(0), meetings, solved: Array(8).fill(false), heOffers: meetings.length, heAccepts: meetings.length };
}

function fixture(seed: number, signal: "NO_EARLY_TRADE" | "EARLY_TRADE", outcomeY: 0 | 1, ignoreTyped = false): RealSignalRun {
  const rounds = Array.from({ length: 24 }, (_, i) => round(i + 1));
  if (signal === "EARLY_TRADE") rounds[0] = round(1, [tradeMeeting(1)]);
  if (outcomeY) rounds[4] = round(5, [tradeMeeting(5)]);
  const result: RunResult = { scores: Array(8).fill(0), meanScore: 0, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds };
  const order = [...realSignalOrder(seed)];
  const observations = order.map((arm, index) => {
    const decisionObject = realSignalDecisionObject(arm, signal);
    const publish = ignoreTyped && arm === "typed-posterior" ? true : optimalRealSignalPublish(decisionObject);
    return { arm, position: index + 1, promptHash: "a".repeat(64), decisionObject, publish };
  });
  const early = coordinationSlice(result, () => true, 1, 4);
  const future = coordinationSlice(result, () => true, 5, 23);
  return {
    seed, speakerId: seed % 8, decisionRound: 5,
    earlyTrades: signal === "EARLY_TRADE" ? 1 : 0, signal,
    decisionCalls: 3, actionCalls: result.rounds.reduce((sum, item) => sum + 2 * item.meetings.length, 0), apiFails: 0, parseFails: 0,
    order, observations, scheduleHash: "1234abcd", futureTrades: outcomeY, outcomeY,
    early, future, meanScore: 0, result,
  };
}

function supportedRuns(ignoreTyped = false): RealSignalRun[] {
  return REAL_SIGNAL_SEEDS.map((seed, index) => index < 18
    ? fixture(seed, "NO_EARLY_TRADE", index < 16 ? 1 : 0, ignoreTyped)
    : fixture(seed, "EARLY_TRADE", index < 24 ? 1 : 0, ignoreTyped));
}

test("real VBE signal calibration", async (t) => {
  await t.test("freezes the 90-run likelihood table and posterior direction", () => {
    assert.deepEqual(CALIBRATION_COUNTS, { noEarly: { y0: 6, y1: 51 }, early: { y0: 21, y1: 12 } });
    assert.equal(PRIOR_Y, 63 / 90);
    assert.equal(POSTERIOR_NO_EARLY, 51 / 57);
    assert.equal(POSTERIOR_EARLY, 12 / 33);
    assert.ok(POSTERIOR_NO_EARLY > PRIOR_Y && POSTERIOR_EARLY < PRIOR_Y);
    assert.equal(realSignalPriorSeedOverlap(), 0);
  });

  await t.test("balances every arm over every call position", () => {
    assert.equal(new Set(REAL_SIGNAL_SEEDS).size, 36);
    for (const arm of REAL_SIGNAL_ARMS) for (let position = 0; position < 3; position++) {
      assert.equal(REAL_SIGNAL_SEEDS.filter((seed) => realSignalOrder(seed)[position] === arm).length, 12);
    }
  });

  await t.test("deduplicates seller-side early trades from agent memory", () => {
    const seller: AgentState = { id: 0, type: "E", checks: 0, chits: 1, score: 0, solved: true, receivedFrom: null, memory: [{ t: 2, partnerId: 1, partnerType: "H", gaveCheck: true, gotCheck: false, gaveChits: 0, gotChits: 1, kind: "chit-for-check" }] };
    const buyer: AgentState = { id: 1, type: "H", checks: 1, chits: 0, score: 0, solved: false, receivedFrom: "E", memory: [{ t: 2, partnerId: 0, partnerType: "E", gaveCheck: false, gotCheck: true, gaveChits: 1, gotChits: 0, kind: "chit-for-check" }] };
    assert.equal(earlyTradeCountFromMemories([seller, buyer]), 1);
    assert.equal(signalFromEarlyTrades(1), "EARLY_TRADE");
    assert.equal(signalFromEarlyTrades(0), "NO_EARLY_TRADE");
  });

  await t.test("observes completed rounds through a read-only after-meetings hook", async () => {
    const observed: number[] = [];
    const result = await runPopulationAsyncPaired(
      99991,
      async () => ({ giveCheck: false, giveChits: 0, requireChit: false }),
      DEFAULT_PARAMS,
      true,
      undefined,
      undefined,
      async (_agents, snapshot) => { observed.push(snapshot.t); },
    );
    assert.deepEqual(observed, Array.from({ length: 24 }, (_, index) => index + 1));
    assert.deepEqual(result.rounds.map((snapshot) => snapshot.t), observed);
  });

  await t.test("uses recommendation-free typed objects and strict action schema", () => {
    const prior = realSignalDecisionObject("prior-only", "EARLY_TRADE");
    const typed = realSignalDecisionObject("typed-posterior", "EARLY_TRADE");
    const control = realSignalDecisionObject("noninformative-control", "EARLY_TRADE");
    assert.equal(optimalRealSignalPublish(prior), true);
    assert.equal(optimalRealSignalPublish(typed), false);
    assert.equal(optimalRealSignalPublish(control), true);
    assert.equal("recommendedAction" in typed, false);
    assert.equal(parseRealSignalAction('{"publish":false}'), false);
    assert.throws(() => parseRealSignalAction('{"publish":false,"reason":"x"}'));
  });

  await t.test("supports the fresh signal and its downstream action transfer together", () => {
    const report = buildRealSignalReport(supportedRuns(), "test-model");
    assert.equal(report.signal.pass, true);
    assert.equal(report.action.pass, true);
    assert.equal(report.verdict, "REAL-SIGNAL PIPELINE SUPPORTED");
    assert.equal(report.action.earlyTypedFlip, 1);
    assert.equal(report.action.noEarlyTypedStability, 1);
    assert.equal(report.action.controlStability, 1);
    assert.ok(report.signal.priorMinusPosterior!.bootstrap95![0] > 0);
  });

  await t.test("separates a valid signal from ignored posterior action", () => {
    const report = buildRealSignalReport(supportedRuns(true), "test-model");
    assert.equal(report.signal.pass, true);
    assert.equal(report.action.pass, false);
    assert.equal(report.verdict, "SIGNAL VALID, ACTION TRANSFER FAILED");
  });

  await t.test("rejects trace corruption", () => {
    const runs = supportedRuns();
    runs[0] = { ...runs[0]!, earlyTrades: 1 };
    assert.throws(() => buildRealSignalReport(runs, "test-model"), /early trace mismatch/);
    assert.equal(qualifyingTradeCount(supportedRuns()[0]!.result, 5, 23), 1);
  });
});
