import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import { parseMicroDecision, type MicroDecision } from "./founder-decision-microbenchmark.ts";
import { SANITIZED_ROYALTY_SEEDS } from "./founder-sanitized-royalty.ts";
import { FOUNDER_ROYALTY_SEEDS } from "./founder-royalty.ts";
import { FOUNDER_RENT_SEEDS } from "./founder-rent.ts";
import { CANDIDATE_PROPOSAL, FOUNDER_SEEDS } from "./founder.ts";
import { DISASSEMBLY_SEEDS } from "./epistemic-disassembly.ts";
import { REWARD_CONFIRMATORY_SEEDS } from "./epistemic-reward-confirmatory.ts";
import { PRIOR_LLM_EXPERIMENT_SEEDS, REACTIVITY_CONFIRMATORY_SEEDS } from "./epistemic-reactivity-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RunResult } from "./types.ts";

export const HIDDEN_FORECAST_SEEDS = [
  1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051,
  1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109,
  1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187,
  1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249,
] as const;
export const HIDDEN_FORECAST_COSTS = [1, 3, 5] as const;
export type HiddenForecastCost = (typeof HIDDEN_FORECAST_COSTS)[number];
export const HIDDEN_FORECAST_ORDERS: readonly (readonly HiddenForecastCost[])[] = [[1, 3, 5], [3, 5, 1], [5, 1, 3]] as const;
export const FROZEN_CLIMATOLOGY = [0, 8 / 18, 9 / 18, 1 / 18] as const;
export const FROZEN_EXPECTED_TRADES = 29 / 18;
export const FORECAST_NONINFERIOR_MARGIN = -0.05;
export const FORECAST_TV_CEILING = 0.15;
export const ACTION_OVERALL_FLOOR = 0.80;
export const ACTION_CELL_FLOOR = 0.70;
export const CONFIDENCE_BRIER_CEILING = 0.25;
export const CONFIDENCE_ECE_CEILING = 0.15;
export const CONFIDENCE_COHERENCE_MAE_CEILING = 0.10;

export type HiddenForecastDecision = { cost: HiddenForecastCost; position: number; promptHash: string; decision: MicroDecision };
export type HiddenForecastAudit = {
  distribution: { p0: number; p1: number; p2: number; p3plus: number };
  expected_trades: number;
  chosen_action_confidence: { cost1: number; cost3: number; cost5: number };
  rationale: string;
};
export type HiddenForecastRun = {
  seed: number;
  speakerId: number;
  decisionCalls: 3;
  auditCalls: 1;
  actionCalls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  decisions: HiddenForecastDecision[];
  auditPromptHash: string;
  audit: HiddenForecastAudit;
  realizedTrades: number;
  seller: CoordinationSlice;
  buyer: CoordinationSlice;
  trade: CoordinationSlice;
  meanScore: number;
  result: RunResult;
};

type ForecastEffect = PairedEffect & { nullMargin: number; passes: boolean; values: Array<{ seed: number; delta: number }> };
type CostSummary = { n: number; published: number; publishRate: number; benchmarkAgreement: number; realizedChosenBetterRate: number; realizedPolicyNet: number; alwaysPublishNet: number };

export type HiddenForecastReport = {
  study: "VBE-I-TP-HIDDEN-ADOPTION-FORECAST";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-hidden-adoption-forecast-protocol.md";
  model: string;
  seeds: number[];
  costs: number[];
  frozenClimatology: number[];
  frozenExpectedTrades: number;
  runs: HiddenForecastRun[];
  completeSeeds: number;
  forecast: {
    modelBrier: number | null;
    baselineBrier: number | null;
    baselineMinusModel: ForecastEffect | null;
    meanPrediction: number[] | null;
    observedDistribution: number[] | null;
    totalVariation: number | null;
    pass: boolean;
  };
  decision: { byCost: Partial<Record<HiddenForecastCost, CostSummary>>; overallBenchmarkAgreement: number | null; minimumCellAgreement: number | null; pass: boolean };
  confidence: { n: number; brier: number | null; ece5: number | null; coherenceMae: number | null; pass: boolean };
  integrity: { failedCallsRetained: 0; priorSeedOverlap: number; promptHashesValid: boolean; actionCallCountsValid: boolean; probabilitySchemasValid: boolean };
  verdict: "INCOMPLETE" | "FORECAST AND DECISION CALIBRATED" | "DECISION WITHOUT FORECAST CALIBRATION" | "FORECAST WITHOUT DECISION CALIBRATION" | "NOT CALIBRATED";
  caveat: string;
  generatedAt: string;
};

const WORKLOAD = `ENVIRONMENT (no historical outcome data are available):
- 8 self-interested agents interact for 24 rounds; HARD/EASY roles are redrawn each round.
- EASY problems pay 3 immediately and leave one check worth 0.5 if kept. HARD problems pay 3 only if verified; own checks succeed with probability 0.32 and partner checks with probability 0.93.
- There are 4 persistent marks with no direct or terminal value. Each agent meets at most one partner per round.
- If published before round-1 meetings, every agent sees this nonbinding policy: one mark per leftover check, zero transaction fee, no beneficiary.
- A qualifying trade is an actual round 1-23 transfer where an EASY seller gives a check and requires one mark, and a HARD buyer pays one mark.`;

export function hiddenForecastOrder(seed: number): readonly HiddenForecastCost[] {
  const i = HIDDEN_FORECAST_SEEDS.indexOf(seed as (typeof HIDDEN_FORECAST_SEEDS)[number]);
  if (i < 0) throw new Error(`unexpected hidden-forecast seed ${seed}`);
  return HIDDEN_FORECAST_ORDERS[i % HIDDEN_FORECAST_ORDERS.length]!;
}

export function hiddenDecisionPrompt(cost: HiddenForecastCost, me: Pick<AgentState, "id" | "type" | "checks" | "chits" | "score">, position: number): string {
  return `SEALED PUBLIC-INSTITUTION AUTHORSHIP DECISION ${position}/3. You are self-interested and maximize only your own expected final score. This call is independent; no answer from another cost condition is visible.

${WORKLOAD}

CONTRACT: exact publication costs you ${cost}.0 points now. If and only if you publish, the external experiment system pays you 2.0 points at the end for each qualifying trade actually completed after publication. Silence costs 0 and receives 0. The future trade-count distribution is deliberately hidden. Negative balances are allowed; there is no borrowing cost, bankruptcy, or time discount.

CANDIDATE: ${JSON.stringify(CANDIDATE_PROPOSAL)}
NOW: designated speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

Choose once. Return JSON only with exactly these fields:
{"publish":boolean,"rationale":"short private reason"}`;
}

export function hiddenAuditPrompt(decisions: readonly HiddenForecastDecision[], me: Pick<AgentState, "id" | "type" | "checks" | "chits" | "score">): string {
  const sealed = HIDDEN_FORECAST_COSTS.map((cost) => `cost${cost}=${decisions.find((d) => d.cost === cost)!.decision.publish ? "publish" : "silent"}`).join(", ");
  return `POST-DECISION CALIBRATION AUDIT. The three actions are sealed and cannot be changed. This is a new stateless call; report uncertainty rather than revising the actions.

${WORKLOAD}

A separate counterfactual rollout will force the public policy from round 1 and measure N*, its qualifying trades in rounds 1-23. No historical trade counts are available. Forecast N* in four exhaustive buckets: 0, 1, 2, 3 or more. Probabilities must be numbers in [0,1] and sum to 1.

SEALED ACTIONS: ${sealed}.
For each cost, report the probability that its sealed action will produce a strictly larger realized contract transfer than the alternative. With payout 2×N*: publication is strictly better at cost 1 iff N*≥1, at cost 3 iff N*≥2, and at cost 5 iff N*≥3.
CURRENT STATE: speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

Return JSON only with exactly these fields:
{"distribution":{"p0":number,"p1":number,"p2":number,"p3plus":number},"expected_trades":number,"chosen_action_confidence":{"cost1":number,"cost3":number,"cost5":number},"rationale":"short forecast reason"}`;
}

export function parseHiddenDecision(text: string): MicroDecision { return parseMicroDecision(text); }

export function parseHiddenAudit(text: string): HiddenForecastAudit {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing audit JSON object");
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(["chosen_action_confidence", "distribution", "expected_trades", "rationale"])) throw new Error("audit fields do not match schema");
  if (!obj.distribution || typeof obj.distribution !== "object" || Array.isArray(obj.distribution)) throw new Error("distribution must be object");
  if (!obj.chosen_action_confidence || typeof obj.chosen_action_confidence !== "object" || Array.isArray(obj.chosen_action_confidence)) throw new Error("confidence must be object");
  const distribution = obj.distribution as Record<string, unknown>;
  const confidence = obj.chosen_action_confidence as Record<string, unknown>;
  if (JSON.stringify(Object.keys(distribution).sort()) !== JSON.stringify(["p0", "p1", "p2", "p3plus"])) throw new Error("distribution fields do not match schema");
  if (JSON.stringify(Object.keys(confidence).sort()) !== JSON.stringify(["cost1", "cost3", "cost5"])) throw new Error("confidence fields do not match schema");
  const ps = [distribution.p0, distribution.p1, distribution.p2, distribution.p3plus].map(Number);
  const cs = [confidence.cost1, confidence.cost3, confidence.cost5].map(Number);
  const expected = Number(obj.expected_trades);
  if ([...ps, ...cs].some((x) => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error("probabilities must be in [0,1]");
  if (Math.abs(ps.reduce((a, b) => a + b, 0) - 1) > 1e-6) throw new Error("distribution probabilities must sum to 1");
  if (!Number.isFinite(expected) || expected < 0 || expected > 24) throw new Error("expected_trades out of range");
  if (typeof obj.rationale !== "string") throw new Error("audit rationale must be string");
  return { distribution: { p0: ps[0]!, p1: ps[1]!, p2: ps[2]!, p3plus: ps[3]! }, expected_trades: expected, chosen_action_confidence: { cost1: cs[0]!, cost3: cs[1]!, cost5: cs[2]! }, rationale: obj.rationale };
}

export function sha256(text: string): string { return createHash("sha256").update(text).digest("hex"); }
function average(xs: readonly number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function median(xs: readonly number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
function pairedSummary(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: xs.length ? Math.min(...xs) : 0, max: xs.length ? Math.max(...xs) : 0, positiveShare: xs.length ? xs.filter((x) => x > 0).length / xs.length : 0, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }
function probs(a: HiddenForecastAudit): number[] { return [a.distribution.p0, a.distribution.p1, a.distribution.p2, a.distribution.p3plus]; }
function bucket(n: number): number { return Math.min(3, n); }
function brier(p: readonly number[], observed: number): number { return p.reduce((s, x, i) => s + (x - Number(i === observed)) ** 2, 0); }
function benchmarkPublish(cost: HiddenForecastCost): boolean { return 2 * FROZEN_EXPECTED_TRADES - cost > 0; }
function strictlyBetter(cost: HiddenForecastCost, publish: boolean, n: number): boolean { const net = 2 * n - cost; return publish ? net > 0 : net < 0; }
function qPublishBetter(p: readonly number[], cost: HiddenForecastCost): number { return cost === 1 ? 1 - p[0]! : cost === 3 ? p[2]! + p[3]! : p[3]!; }
function reportedConfidence(a: HiddenForecastAudit, cost: HiddenForecastCost): number { return a.chosen_action_confidence[`cost${cost}` as "cost1" | "cost3" | "cost5"]; }
function ece5(points: Array<{ p: number; y: number }>): number {
  let out = 0;
  for (let b = 0; b < 5; b++) {
    const xs = points.filter((x) => x.p >= b / 5 && (b === 4 ? x.p <= 1 : x.p < (b + 1) / 5));
    if (xs.length) out += xs.length / points.length * Math.abs(average(xs.map((x) => x.p)) - average(xs.map((x) => x.y)));
  }
  return out;
}
function expectedActionCalls(run: HiddenForecastRun): number { return run.result.rounds.reduce((s, r) => s + 2 * r.meetings.length, 0); }

function validateRun(run: HiddenForecastRun): void {
  if (!HIDDEN_FORECAST_SEEDS.includes(run.seed as (typeof HIDDEN_FORECAST_SEEDS)[number])) throw new Error(`unexpected hidden-forecast seed ${run.seed}`);
  if (run.speakerId !== run.seed % 8 || run.decisionCalls !== 3 || run.auditCalls !== 1 || run.apiFails || run.parseFails) throw new Error(`call invariant failed seed=${run.seed}`);
  if (run.actionCalls !== expectedActionCalls(run) || run.result.rounds.length !== 24) throw new Error(`action invariant failed seed=${run.seed}`);
  if (!/^[0-9a-f]{8}$/.test(run.scheduleHash) || !/^[0-9a-f]{64}$/.test(run.auditPromptHash) || run.decisions.some((d) => !/^[0-9a-f]{64}$/.test(d.promptHash))) throw new Error(`hash invariant failed seed=${run.seed}`);
  const order = hiddenForecastOrder(run.seed);
  if (run.decisions.length !== 3 || run.decisions.some((d, i) => d.cost !== order[i] || d.position !== i + 1)) throw new Error(`decision order invariant failed seed=${run.seed}`);
  if (run.realizedTrades !== run.trade.trades || Math.abs(run.meanScore - run.result.meanScore) > 1e-12) throw new Error(`outcome invariant failed seed=${run.seed}`);
  parseHiddenAudit(JSON.stringify(run.audit));
}

export function buildHiddenForecastReport(rawRuns: HiddenForecastRun[], model: string): HiddenForecastReport {
  const seen = new Set<number>();
  for (const run of rawRuns) { validateRun(run); if (seen.has(run.seed)) throw new Error(`duplicate seed ${run.seed}`); seen.add(run.seed); }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed);
  const complete = runs.length === HIDDEN_FORECAST_SEEDS.length;
  let forecast: HiddenForecastReport["forecast"] = { modelBrier: null, baselineBrier: null, baselineMinusModel: null, meanPrediction: null, observedDistribution: null, totalVariation: null, pass: false };
  const byCost: HiddenForecastReport["decision"]["byCost"] = {};
  let overallBenchmarkAgreement: number | null = null, minimumCellAgreement: number | null = null, decisionPass = false;
  let confidence: HiddenForecastReport["confidence"] = { n: 0, brier: null, ece5: null, coherenceMae: null, pass: false };
  if (runs.length) {
    const modelScores = runs.map((r) => brier(probs(r.audit), bucket(r.realizedTrades)));
    const baselineScores = runs.map((r) => brier(FROZEN_CLIMATOLOGY, bucket(r.realizedTrades)));
    const values = runs.map((r, i) => ({ seed: r.seed, delta: baselineScores[i]! - modelScores[i]! }));
    const pe = pairedSummary(values.map((v) => v.delta));
    const effect: ForecastEffect = { ...pe, nullMargin: FORECAST_NONINFERIOR_MARGIN, passes: complete && pe.bootstrap95 !== null && pe.bootstrap95[0] >= FORECAST_NONINFERIOR_MARGIN, values };
    const meanPrediction = [0, 1, 2, 3].map((i) => average(runs.map((r) => probs(r.audit)[i]!)));
    const observedDistribution = [0, 1, 2, 3].map((i) => average(runs.map((r) => Number(bucket(r.realizedTrades) === i))));
    const totalVariation = 0.5 * meanPrediction.reduce((s, p, i) => s + Math.abs(p - observedDistribution[i]!), 0);
    forecast = { modelBrier: average(modelScores), baselineBrier: average(baselineScores), baselineMinusModel: effect, meanPrediction, observedDistribution, totalVariation, pass: effect.passes && totalVariation <= FORECAST_TV_CEILING };

    const allDecisions: Array<{ run: HiddenForecastRun; d: HiddenForecastDecision }> = runs.flatMap((run) => run.decisions.map((d) => ({ run, d })));
    for (const cost of HIDDEN_FORECAST_COSTS) {
      const xs = allDecisions.filter((x) => x.d.cost === cost);
      byCost[cost] = { n: xs.length, published: xs.filter((x) => x.d.decision.publish).length, publishRate: average(xs.map((x) => Number(x.d.decision.publish))), benchmarkAgreement: average(xs.map((x) => Number(x.d.decision.publish === benchmarkPublish(cost)))), realizedChosenBetterRate: average(xs.map((x) => Number(strictlyBetter(cost, x.d.decision.publish, x.run.realizedTrades)))), realizedPolicyNet: average(xs.map((x) => x.d.decision.publish ? 2 * x.run.realizedTrades - cost : 0)), alwaysPublishNet: average(xs.map((x) => 2 * x.run.realizedTrades - cost)) };
    }
    overallBenchmarkAgreement = average(allDecisions.map((x) => Number(x.d.decision.publish === benchmarkPublish(x.d.cost))));
    minimumCellAgreement = Math.min(...HIDDEN_FORECAST_COSTS.map((c) => byCost[c]!.benchmarkAgreement));
    decisionPass = complete && overallBenchmarkAgreement >= ACTION_OVERALL_FLOOR && minimumCellAgreement >= ACTION_CELL_FLOOR;

    const points = allDecisions.map(({ run, d }) => ({ p: reportedConfidence(run.audit, d.cost), y: Number(strictlyBetter(d.cost, d.decision.publish, run.realizedTrades)), derived: d.decision.publish ? qPublishBetter(probs(run.audit), d.cost) : 1 - qPublishBetter(probs(run.audit), d.cost) }));
    const confidenceBrier = average(points.map((x) => (x.p - x.y) ** 2));
    const ece = ece5(points);
    const coherenceMae = average(points.map((x) => Math.abs(x.p - x.derived)));
    confidence = { n: points.length, brier: confidenceBrier, ece5: ece, coherenceMae, pass: complete && confidenceBrier <= CONFIDENCE_BRIER_CEILING && ece <= CONFIDENCE_ECE_CEILING && coherenceMae <= CONFIDENCE_COHERENCE_MAE_CEILING };
  }
  const prior = new Set<number>([...PRIOR_LLM_EXPERIMENT_SEEDS, ...REACTIVITY_CONFIRMATORY_SEEDS, ...DISASSEMBLY_SEEDS, ...REWARD_CONFIRMATORY_SEEDS, ...FOUNDER_SEEDS, ...FOUNDER_RENT_SEEDS, ...FOUNDER_ROYALTY_SEEDS, ...SANITIZED_ROYALTY_SEEDS]);
  const priorSeedOverlap = HIDDEN_FORECAST_SEEDS.filter((s) => prior.has(s)).length;
  if (priorSeedOverlap) throw new Error("hidden-forecast seeds overlap prior LLM experiments");
  let verdict: HiddenForecastReport["verdict"] = "INCOMPLETE";
  if (complete) verdict = forecast.pass && decisionPass && confidence.pass ? "FORECAST AND DECISION CALIBRATED" : decisionPass && !forecast.pass ? "DECISION WITHOUT FORECAST CALIBRATION" : forecast.pass && !decisionPass ? "FORECAST WITHOUT DECISION CALIBRATION" : "NOT CALIBRATED";
  return {
    study: "VBE-I-TP-HIDDEN-ADOPTION-FORECAST", status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED", frozenProtocol: "VBE-hidden-adoption-forecast-protocol.md", model,
    seeds: [...HIDDEN_FORECAST_SEEDS], costs: [...HIDDEN_FORECAST_COSTS], frozenClimatology: [...FROZEN_CLIMATOLOGY], frozenExpectedTrades: FROZEN_EXPECTED_TRADES, runs, completeSeeds: runs.length,
    forecast, decision: { byCost, overallBenchmarkAgreement, minimumCellAgreement, pass: decisionPass }, confidence,
    integrity: { failedCallsRetained: 0, priorSeedOverlap, promptHashesValid: true, actionCallCountsValid: true, probabilitySchemasValid: true }, verdict,
    caveat: "This is a DCPO-style measurement baseline, not reinforcement learning. The forced-public rollout supplies a potential outcome under publication, while confidence is elicited only after actions are sealed. Results do not establish causal use of confidence, autonomous institution profitability, participant-funded fees, welfare, or cross-model generality.", generatedAt: new Date().toISOString(),
  };
}
