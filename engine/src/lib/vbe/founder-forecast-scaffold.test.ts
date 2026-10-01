import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORECAST_ARMS, FORECAST_SCAFFOLD_SEEDS, POOLED_PRIOR, buildForecastScaffoldReport, forecastOrder, forecastPrompt, parseForecastProbabilities, serializeInitialState, sha256Forecast, type ForecastProbabilities, type ForecastScaffoldRun } from "./founder-forecast-scaffold.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RoundSnapshot, RunResult } from "./types.ts";

function slice(n: number): CoordinationSlice { return { heMeetings: 10, opportunities: 10, sellerIntents: n, buyerIntents: n, trades: n, sellerIntentRate: n / 10, buyerIntentRate: n / 10, tradeRate: n / 10, sellerIntentPerHe: n / 10, buyerIntentPerHe: n / 10, tradePerHe: n / 10 }; }
function fakeRun(seed: number, n: number, forecasts: Record<string, ForecastProbabilities>): ForecastScaffoldRun {
  const order = [...forecastOrder(seed)]; const agents: AgentState[] = Array.from({ length: 8 }, (_, id) => ({ id, type: id < 4 ? "H" : "E", checks: 1, chits: id < 4 ? 1 : 0, score: id < 4 ? 0 : 3, solved: id >= 4, receivedFrom: null, memory: [] })); const initialState = serializeInitialState(agents);
  const rounds: RoundSnapshot[] = Array.from({ length: 24 }, (_, i) => ({ t: i + 1, types: agents.map((a) => a.type), chits: agents.map((a) => a.chits), scores: agents.map((a) => a.score), meetings: [], solved: agents.map((a) => a.solved), heOffers: 0, heAccepts: 0 }));
  const result: RunResult = { scores: Array(8).fill(10), meanScore: 10, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds };
  return { seed, forecastCalls: 3, actionCalls: 0, apiFails: 0, parseFails: 0, order, initialState, initialStateHash: sha256Forecast(JSON.stringify(initialState)), forecasts: order.map((arm, i) => ({ arm, position: i + 1, promptHash: sha256Forecast(forecastPrompt(arm, initialState)), probabilities: forecasts[arm]! })), scheduleHash: "1234abcd", realizedTrades: n, seller: slice(n), buyer: slice(n), trade: slice(n), meanScore: 10, result };
}
describe("forecast scaffold intervention", () => {
  it("uses 36 unique fresh seeds and balances all order positions", () => { assert.equal(FORECAST_SCAFFOLD_SEEDS.length, 36); assert.equal(new Set(FORECAST_SCAFFOLD_SEEDS).size, 36); for (const arm of FORECAST_ARMS) assert.deepEqual([0, 1, 2].map((p) => FORECAST_SCAFFOLD_SEEDS.filter((s) => forecastOrder(s)[p] === arm).length), [12, 12, 12]); });
  it("freezes the pooled prior", () => { assert.ok(Math.abs(POOLED_PRIOR.reduce((a, b) => a + b, 0) - 1) < 1e-12); assert.deepEqual(POOLED_PRIOR.map((x) => x * 54), [2, 27, 24, 1]); });
  it("keeps history out of raw/proper and exposes it only to scaffold", () => { const s = serializeInitialState([]); assert.doesNotMatch(forecastPrompt("raw", s), /54 runs|\[2,27,24,1\]/); assert.doesNotMatch(forecastPrompt("proper-score", s), /54 runs|\[2,27,24,1\]/); assert.match(forecastPrompt("proper-score", s), /Brier/); assert.match(forecastPrompt("prior-scaffold", s), /54 runs/); });
  it("parses strict probability arrays", () => { assert.deepEqual(parseForecastProbabilities('{"probabilities":[0.1,0.2,0.3,0.4]}'), [0.1, 0.2, 0.3, 0.4]); assert.throws(() => parseForecastProbabilities('{"probabilities":[0.2,0.2,0.2,0.2]}'), /sum/); assert.throws(() => parseForecastProbabilities('{"p0":1}'), /schema/); });
  it("recognizes both successful interventions", () => {
    const outcomes = [0, 1, 1, 2, 2, 3]; const runs = FORECAST_SCAFFOLD_SEEDS.map((seed, i) => { const y = outcomes[i % outcomes.length]!; const truth = [0, 0, 0, 0] as ForecastProbabilities; truth[Math.min(3, y)] = 1; return fakeRun(seed, y, { raw: [0.7, 0.1, 0.1, 0.1], "proper-score": [1 / 6, 2 / 6, 2 / 6, 1 / 6], "prior-scaffold": truth }); });
    const r = buildForecastScaffoldReport(runs, "test"); assert.equal(r.gates.properScorePass, true); assert.equal(r.gates.priorScaffoldPass, true); assert.equal(r.verdict, "PROPER SCORING AND PRIOR SCAFFOLD SUPPORTED");
  });
  it("rejects corruption", () => { const r = fakeRun(FORECAST_SCAFFOLD_SEEDS[0]!, 1, { raw: [0, 1, 0, 0], "proper-score": [0, 1, 0, 0], "prior-scaffold": [0, 1, 0, 0] }); r.forecastCalls = 2 as 3; assert.throws(() => buildForecastScaffoldReport([r], "x"), /call invariant/); });
});
