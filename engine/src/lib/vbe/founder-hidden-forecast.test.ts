import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HIDDEN_FORECAST_COSTS, HIDDEN_FORECAST_SEEDS, FROZEN_CLIMATOLOGY, buildHiddenForecastReport, hiddenAuditPrompt, hiddenDecisionPrompt, hiddenForecastOrder, parseHiddenAudit, sha256, type HiddenForecastAudit, type HiddenForecastRun } from "./founder-hidden-forecast.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { RoundSnapshot, RunResult } from "./types.ts";

function slice(trades: number): CoordinationSlice { return { heMeetings: 10, opportunities: 10, sellerIntents: trades, buyerIntents: trades, trades, sellerIntentRate: trades / 10, buyerIntentRate: trades / 10, tradeRate: trades / 10, sellerIntentPerHe: trades / 10, buyerIntentPerHe: trades / 10, tradePerHe: trades / 10 }; }
function audit(): HiddenForecastAudit { return { distribution: { p0: 0, p1: 8 / 18, p2: 9 / 18, p3plus: 1 / 18 }, expected_trades: 29 / 18, chosen_action_confidence: { cost1: 1, cost3: 10 / 18, cost5: 17 / 18 }, rationale: "test" }; }
function fakeRun(seed: number, n: number): HiddenForecastRun {
  const speakerId = seed % 8;
  const order = hiddenForecastOrder(seed);
  const decisions = order.map((cost, i) => ({ cost, position: i + 1, promptHash: sha256(`decision-${seed}-${cost}`), decision: { publish: cost < 5, rationale: "test" } }));
  const rounds: RoundSnapshot[] = Array.from({ length: 24 }, (_, i) => ({ t: i + 1, types: Array(8).fill("E"), chits: Array(8).fill(0), scores: Array(8).fill(10), meetings: [], solved: Array(8).fill(false), heOffers: 0, heAccepts: 0 }));
  const result: RunResult = { scores: Array(8).fill(10), meanScore: 10, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds };
  return { seed, speakerId, decisionCalls: 3, auditCalls: 1, actionCalls: 0, apiFails: 0, parseFails: 0, scheduleHash: "1234abcd", decisions, auditPromptHash: sha256(`audit-${seed}`), audit: audit(), realizedTrades: n, seller: slice(n), buyer: slice(n), trade: slice(n), meanScore: 10, result };
}

describe("hidden adoption forecast", () => {
  it("uses 36 unique seeds and balances threshold positions", () => {
    assert.equal(HIDDEN_FORECAST_SEEDS.length, 36); assert.equal(new Set(HIDDEN_FORECAST_SEEDS).size, 36);
    for (const c of HIDDEN_FORECAST_COSTS) { const ps = HIDDEN_FORECAST_SEEDS.map((s) => hiddenForecastOrder(s).indexOf(c)); assert.deepEqual([0, 1, 2].map((p) => ps.filter((x) => x === p).length), [12, 12, 12]); }
  });
  it("hides historical distributions from decision and audit prompts", () => {
    const me = { id: 1, type: "H" as const, checks: 1, chits: 0, score: 0 };
    const decision = hiddenDecisionPrompt(3, me, 1);
    const ds = HIDDEN_FORECAST_COSTS.map((cost, i) => ({ cost, position: i + 1, promptHash: "0".repeat(64), decision: { publish: cost < 5, rationale: "x" } }));
    const auditText = hiddenAuditPrompt(ds, me);
    assert.match(decision, /distribution is deliberately hidden/); assert.doesNotMatch(decision, /13\/18|8\/18|29\/18/);
    assert.match(auditText, /actions are sealed and cannot be changed/i); assert.doesNotMatch(auditText, /13\/18|8\/18|29\/18/);
  });
  it("parses only coherent strict probability schemas", () => {
    assert.deepEqual(parseHiddenAudit(JSON.stringify(audit())), audit());
    assert.throws(() => parseHiddenAudit('{"distribution":{"p0":0.2,"p1":0.2,"p2":0.2,"p3plus":0.2},"expected_trades":1,"chosen_action_confidence":{"cost1":.5,"cost3":.5,"cost5":.5},"rationale":"x"}'), /JSON|sum/);
  });
  it("recognizes a calibrated forecast and benchmark policy", () => {
    const outcomes = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3];
    const runs = HIDDEN_FORECAST_SEEDS.map((s, i) => fakeRun(s, outcomes[i % outcomes.length]!));
    const r = buildHiddenForecastReport(runs, "test-model");
    assert.deepEqual(r.frozenClimatology, [...FROZEN_CLIMATOLOGY]);
    assert.equal(r.decision.overallBenchmarkAgreement, 1);
    assert.ok((r.forecast.totalVariation ?? 1) < 1e-12);
    assert.equal(r.forecast.baselineMinusModel?.mean, 0);
    assert.equal(r.verdict, "FORECAST AND DECISION CALIBRATED");
  });
  it("separates good decisions from bad forecast calibration", () => {
    const runs = HIDDEN_FORECAST_SEEDS.map((s) => { const r = fakeRun(s, 1); r.audit.distribution = { p0: 0, p1: 0, p2: 0, p3plus: 1 }; return r; });
    const report = buildHiddenForecastReport(runs, "test-model");
    assert.equal(report.decision.pass, true); assert.equal(report.forecast.pass, false); assert.equal(report.verdict, "DECISION WITHOUT FORECAST CALIBRATION");
  });
  it("rejects call-count corruption", () => { const r = fakeRun(HIDDEN_FORECAST_SEEDS[0]!, 1); r.decisionCalls = 2 as 3; assert.throws(() => buildHiddenForecastReport([r], "test-model"), /call invariant/); });
});
