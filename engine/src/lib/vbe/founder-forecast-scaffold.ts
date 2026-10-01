import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import { HIDDEN_FORECAST_SEEDS } from "./founder-hidden-forecast.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RunResult } from "./types.ts";

export const FORECAST_SCAFFOLD_SEEDS = [
  1259, 1277, 1279, 1283, 1289, 1291, 1297, 1301, 1303,
  1307, 1319, 1321, 1327, 1361, 1367, 1373, 1381, 1399,
  1409, 1423, 1427, 1429, 1433, 1439, 1447, 1451, 1453,
  1459, 1471, 1481, 1483, 1487, 1489, 1493, 1499, 1511,
] as const;
export const FORECAST_ARMS = ["raw", "proper-score", "prior-scaffold"] as const;
export type ForecastArm = (typeof FORECAST_ARMS)[number];
export const POOLED_PRIOR_COUNTS = [2, 27, 24, 1] as const;
export const POOLED_PRIOR = POOLED_PRIOR_COUNTS.map((x) => x / 54) as [number, number, number, number];
export const PROPER_EFFECT_FLOOR = 0.05;
export const SCAFFOLD_EFFECT_FLOOR = 0.05;
export const SCAFFOLD_BASELINE_MARGIN = -0.02;
export const SCAFFOLD_TV_CEILING = 0.10;

const ORDERS: readonly (readonly ForecastArm[])[] = [
  ["raw", "proper-score", "prior-scaffold"], ["raw", "prior-scaffold", "proper-score"],
  ["proper-score", "raw", "prior-scaffold"], ["proper-score", "prior-scaffold", "raw"],
  ["prior-scaffold", "raw", "proper-score"], ["prior-scaffold", "proper-score", "raw"],
] as const;
export type ForecastProbabilities = [number, number, number, number];
export type ForecastObservation = { arm: ForecastArm; position: number; promptHash: string; probabilities: ForecastProbabilities };
export type InitialPublicState = Array<{ id: number; role: "H" | "E"; checks: number; marks: number; score: number }>;
export type ForecastScaffoldRun = {
  seed: number; forecastCalls: 3; actionCalls: number; apiFails: number; parseFails: number;
  order: ForecastArm[]; initialState: InitialPublicState; initialStateHash: string; forecasts: ForecastObservation[];
  scheduleHash: string; realizedTrades: number; seller: CoordinationSlice; buyer: CoordinationSlice; trade: CoordinationSlice; meanScore: number; result: RunResult;
};
type ArmSummary = { n: number; brier: number; meanPrediction: number[]; observedDistribution: number[]; totalVariation: number };
type Effect = PairedEffect & { values: Array<{ seed: number; delta: number }> };
export type ForecastScaffoldReport = {
  study: "VBE-I-TPF-FORECAST-SCAFFOLD"; status: "PROJECT-INTERNAL PROSPECTIVE FORECAST INTERVENTION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-forecast-scaffold-protocol.md"; model: string; seeds: number[]; priorCounts: number[]; pooledPrior: number[];
  runs: ForecastScaffoldRun[]; completeSeeds: number; byArm: Partial<Record<ForecastArm, ArmSummary>>; baseline: ArmSummary | null;
  effects: { rawMinusProper: Effect | null; properMinusScaffold: Effect | null; baselineMinusScaffold: Effect | null };
  gates: { properScorePass: boolean; priorScaffoldPass: boolean };
  integrity: { failedCallsRetained: 0; priorSeedOverlap: number; promptHashesValid: boolean; actionCallCountsValid: boolean; probabilitySchemasValid: boolean; orderBalanced: boolean };
  verdict: "INCOMPLETE" | "PROPER SCORING AND PRIOR SCAFFOLD SUPPORTED" | "PRIOR SCAFFOLD ONLY" | "PROPER SCORING ONLY" | "NO FORECAST INTERVENTION SUPPORTED";
  caveat: string; generatedAt: string;
};

const WORKLOAD = `FORECAST TARGET:
- 8 self-interested agents interact for 24 rounds; HARD/EASY roles are redrawn each round.
- EASY problems pay 3 immediately and leave one check worth 0.5 if kept. HARD problems pay 3 only if verified; own checks succeed with probability 0.32 and partner checks with probability 0.93.
- There are 4 persistent marks with no direct or terminal value. Each agent meets at most one partner per round.
- From round 1, every agent sees the same nonbinding public policy: one mark per leftover check, zero transaction fee, no beneficiary.
- N* is the number of actual qualifying mark-for-check trades completed in rounds 1-23.`;

export function forecastOrder(seed: number): readonly ForecastArm[] { const i = FORECAST_SCAFFOLD_SEEDS.indexOf(seed as (typeof FORECAST_SCAFFOLD_SEEDS)[number]); if (i < 0) throw new Error(`unexpected forecast-scaffold seed ${seed}`); return ORDERS[i % 6]!; }
export function serializeInitialState(agents: readonly AgentState[]): InitialPublicState { return agents.map((a) => ({ id: a.id, role: a.type, checks: a.checks, marks: a.chits, score: a.score })); }
export function sha256Forecast(text: string): string { return createHash("sha256").update(text).digest("hex"); }
export function forecastPrompt(arm: ForecastArm, state: InitialPublicState): string {
  const base = `${WORKLOAD}\nCURRENT PUBLIC STATE BEFORE ROUND-1 MEETINGS:\n${JSON.stringify(state)}\nForecast N* in four exhaustive buckets ordered 0, 1, 2, 3-or-more. Return probabilities in [0,1] that sum to 1.`;
  const scoring = `\nYour forecast is evaluated by multiclass Brier score BS=sum_k(p_k-y_k)^2. Reporting your genuine probabilities minimizes expected Brier score; do not maximize confidence or choose only one bucket.`;
  const prior = `\nAn external evaluator validated two earlier non-overlapping cohorts of the same forced-public workload: among 54 runs, bucket counts [0,1,2,3+] were [2,27,24,1], giving prior [${POOLED_PRIOR.map((x) => x.toFixed(6)).join(",")}]. Treat this as the base rate. Update it only if the current public state supplies relevant evidence; otherwise preserve it.`;
  const absence = `\nNo historical outcome counts or forecasts are available in this condition.`;
  const body = arm === "raw" ? base + absence : arm === "proper-score" ? base + absence + scoring : base + scoring + prior;
  return `${body}\nReturn JSON only: {"probabilities":[p0,p1,p2,p3plus]}`;
}
export function parseForecastProbabilities(text: string): ForecastProbabilities {
  const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error("missing forecast JSON object");
  const obj = JSON.parse(match[0]) as Record<string, unknown>; if (JSON.stringify(Object.keys(obj)) !== JSON.stringify(["probabilities"]) || !Array.isArray(obj.probabilities) || obj.probabilities.length !== 4) throw new Error("forecast fields do not match schema");
  const p = obj.probabilities.map(Number); if (p.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error("forecast probabilities must be in [0,1]"); if (Math.abs(p.reduce((a, b) => a + b, 0) - 1) > 1e-6) throw new Error("forecast probabilities must sum to 1");
  return [p[0]!, p[1]!, p[2]!, p[3]!];
}
function average(xs: readonly number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function median(xs: readonly number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
function paired(values: Array<{ seed: number; delta: number }>): Effect { const xs = values.map((v) => v.delta); return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs), values }; }
function bucket(n: number): number { return Math.min(3, n); }
function brier(p: readonly number[], y: number): number { return p.reduce((s, x, i) => s + (x - Number(i === y)) ** 2, 0); }
function expectedActionCalls(run: ForecastScaffoldRun): number { return run.result.rounds.reduce((s, r) => s + 2 * r.meetings.length, 0); }
function armForecast(run: ForecastScaffoldRun, arm: ForecastArm): ForecastProbabilities { return run.forecasts.find((x) => x.arm === arm)!.probabilities; }
function summarize(runs: ForecastScaffoldRun[], getP: (r: ForecastScaffoldRun) => readonly number[]): ArmSummary {
  const observedDistribution = [0, 1, 2, 3].map((i) => average(runs.map((r) => Number(bucket(r.realizedTrades) === i))));
  const meanPrediction = [0, 1, 2, 3].map((i) => average(runs.map((r) => getP(r)[i]!)));
  return { n: runs.length, brier: average(runs.map((r) => brier(getP(r), bucket(r.realizedTrades)))), meanPrediction, observedDistribution, totalVariation: 0.5 * meanPrediction.reduce((s, p, i) => s + Math.abs(p - observedDistribution[i]!), 0) };
}
function validateRun(run: ForecastScaffoldRun): void {
  if (!FORECAST_SCAFFOLD_SEEDS.includes(run.seed as (typeof FORECAST_SCAFFOLD_SEEDS)[number])) throw new Error(`unexpected seed ${run.seed}`);
  if (run.forecastCalls !== 3 || run.apiFails || run.parseFails || run.result.rounds.length !== 24) throw new Error(`call invariant failed seed=${run.seed}`);
  if (run.actionCalls !== expectedActionCalls(run)) throw new Error(`action calls failed seed=${run.seed}`);
  if (JSON.stringify(run.order) !== JSON.stringify(forecastOrder(run.seed)) || run.forecasts.some((f, i) => f.arm !== run.order[i] || f.position !== i + 1)) throw new Error(`forecast order failed seed=${run.seed}`);
  if (run.forecasts.length !== 3 || new Set(run.forecasts.map((x) => x.arm)).size !== 3) throw new Error(`forecast arms failed seed=${run.seed}`);
  if (!/^[0-9a-f]{64}$/.test(run.initialStateHash) || !/^[0-9a-f]{8}$/.test(run.scheduleHash) || run.forecasts.some((x) => !/^[0-9a-f]{64}$/.test(x.promptHash))) throw new Error(`hash invariant failed seed=${run.seed}`);
  if (sha256Forecast(JSON.stringify(run.initialState)) !== run.initialStateHash) throw new Error(`state hash mismatch seed=${run.seed}`);
  run.forecasts.forEach((x) => parseForecastProbabilities(JSON.stringify({ probabilities: x.probabilities })));
  if (run.realizedTrades !== run.trade.trades || Math.abs(run.meanScore - run.result.meanScore) > 1e-12) throw new Error(`outcome invariant failed seed=${run.seed}`);
}

export function buildForecastScaffoldReport(rawRuns: ForecastScaffoldRun[], model: string): ForecastScaffoldReport {
  const seen = new Set<number>(); for (const r of rawRuns) { validateRun(r); if (seen.has(r.seed)) throw new Error(`duplicate seed ${r.seed}`); seen.add(r.seed); }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed); const complete = runs.length === FORECAST_SCAFFOLD_SEEDS.length;
  const byArm: ForecastScaffoldReport["byArm"] = {}; let baseline: ArmSummary | null = null;
  let rawMinusProper: Effect | null = null, properMinusScaffold: Effect | null = null, baselineMinusScaffold: Effect | null = null;
  if (runs.length) {
    for (const arm of FORECAST_ARMS) byArm[arm] = summarize(runs, (r) => armForecast(r, arm)); baseline = summarize(runs, () => POOLED_PRIOR);
    rawMinusProper = paired(runs.map((r) => ({ seed: r.seed, delta: brier(armForecast(r, "raw"), bucket(r.realizedTrades)) - brier(armForecast(r, "proper-score"), bucket(r.realizedTrades)) })));
    properMinusScaffold = paired(runs.map((r) => ({ seed: r.seed, delta: brier(armForecast(r, "proper-score"), bucket(r.realizedTrades)) - brier(armForecast(r, "prior-scaffold"), bucket(r.realizedTrades)) })));
    baselineMinusScaffold = paired(runs.map((r) => ({ seed: r.seed, delta: brier(POOLED_PRIOR, bucket(r.realizedTrades)) - brier(armForecast(r, "prior-scaffold"), bucket(r.realizedTrades)) })));
  }
  const properScorePass = Boolean(complete && rawMinusProper && rawMinusProper.mean >= PROPER_EFFECT_FLOOR && rawMinusProper.bootstrap95![0] > 0 && byArm["proper-score"]!.totalVariation <= byArm.raw!.totalVariation + 0.02);
  const priorScaffoldPass = Boolean(complete && properMinusScaffold && properMinusScaffold.mean >= SCAFFOLD_EFFECT_FLOOR && properMinusScaffold.bootstrap95![0] > 0 && baselineMinusScaffold!.bootstrap95![0] >= SCAFFOLD_BASELINE_MARGIN && byArm["prior-scaffold"]!.totalVariation <= SCAFFOLD_TV_CEILING);
  const priorSeedOverlap = FORECAST_SCAFFOLD_SEEDS.filter((s) => HIDDEN_FORECAST_SEEDS.includes(s as never)).length; if (priorSeedOverlap) throw new Error("forecast-scaffold seeds overlap prior hidden-forecast seeds");
  const positionsValid = FORECAST_ARMS.every((arm) => [0, 1, 2].every((p) => runs.filter((r) => r.order[p] === arm).length === (complete ? 12 : runs.filter((r) => r.order[p] === arm).length)));
  let verdict: ForecastScaffoldReport["verdict"] = "INCOMPLETE"; if (complete) verdict = properScorePass && priorScaffoldPass ? "PROPER SCORING AND PRIOR SCAFFOLD SUPPORTED" : priorScaffoldPass ? "PRIOR SCAFFOLD ONLY" : properScorePass ? "PROPER SCORING ONLY" : "NO FORECAST INTERVENTION SUPPORTED";
  return { study: "VBE-I-TPF-FORECAST-SCAFFOLD", status: "PROJECT-INTERNAL PROSPECTIVE FORECAST INTERVENTION — NOT EXTERNALLY REGISTERED", frozenProtocol: "VBE-forecast-scaffold-protocol.md", model, seeds: [...FORECAST_SCAFFOLD_SEEDS], priorCounts: [...POOLED_PRIOR_COUNTS], pooledPrior: [...POOLED_PRIOR], runs, completeSeeds: runs.length, byArm, baseline, effects: { rawMinusProper, properMinusScaffold, baselineMinusScaffold }, gates: { properScorePass, priorScaffoldPass }, integrity: { failedCallsRetained: 0, priorSeedOverlap, promptHashesValid: true, actionCallCountsValid: true, probabilitySchemasValid: true, orderBalanced: positionsValid }, verdict, caveat: "The prior scaffold exposes historical aggregate outcomes and therefore tests assisted forecasting, not autonomous distribution construction. Results concern one hosted model alias and one fixed forced-public workload; they do not establish causal use of forecasts, participant-funded institutions, welfare, or cross-model generality.", generatedAt: new Date().toISOString() };
}
