import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import { DISASSEMBLY_SEEDS } from "./epistemic-disassembly.ts";
import { REWARD_CONFIRMATORY_SEEDS } from "./epistemic-reward-confirmatory.ts";
import { PRIOR_LLM_EXPERIMENT_SEEDS, REACTIVITY_CONFIRMATORY_SEEDS } from "./epistemic-reactivity-confirmatory.ts";
import { FORECAST_SCAFFOLD_SEEDS } from "./founder-forecast-scaffold.ts";
import { HIDDEN_FORECAST_SEEDS } from "./founder-hidden-forecast.ts";
import { FOUNDER_ROYALTY_SEEDS } from "./founder-royalty.ts";
import { FOUNDER_RENT_SEEDS } from "./founder-rent.ts";
import { SANITIZED_ROYALTY_SEEDS } from "./founder-sanitized-royalty.ts";
import { FOUNDER_SEEDS } from "./founder.ts";
import type { AgentState, RunResult } from "./types.ts";

export const REAL_SIGNAL_SEEDS = [
  1531, 1543, 1549, 1553, 1559, 1567, 1571, 1579,
  1583, 1597, 1601, 1607, 1609, 1613, 1619, 1621, 1627,
  1637, 1657, 1663, 1667, 1669, 1693, 1697, 1699, 1709,
  1721, 1723, 1733, 1741, 1747, 1753, 1759, 1777, 1783, 1787,
] as const;

export const REAL_SIGNAL_ARMS = ["prior-only", "typed-posterior", "noninformative-control"] as const;
export type RealSignalArm = (typeof REAL_SIGNAL_ARMS)[number];
export type RealSignalLabel = "NO_EARLY_TRADE" | "EARLY_TRADE";

export const CALIBRATION_COUNTS = {
  noEarly: { y0: 6, y1: 51 },
  early: { y0: 21, y1: 12 },
} as const;
export const CALIBRATION_N = 90;
export const PRIOR_Y = 63 / 90;
export const POSTERIOR_NO_EARLY = 51 / 57;
export const POSTERIOR_EARLY = 12 / 33;
export const CONTRACT_COST = 2;
export const CONTRACT_GROSS_IF_Y = 3;

export const MIN_SIGNAL_STRATUM = 8;
export const BRIER_IMPROVEMENT_FLOOR = 0.05;
export const FRESH_DIRECTION_FLOOR = 0.25;
export const ACTION_ACCURACY_FLOOR = 0.90;
export const EARLY_FLIP_FLOOR = 0.80;
export const NO_EARLY_STABILITY_FLOOR = 0.90;
export const CONTROL_STABILITY_FLOOR = 0.90;

const ORDERS: readonly (readonly RealSignalArm[])[] = [
  ["prior-only", "typed-posterior", "noninformative-control"],
  ["prior-only", "noninformative-control", "typed-posterior"],
  ["typed-posterior", "prior-only", "noninformative-control"],
  ["typed-posterior", "noninformative-control", "prior-only"],
  ["noninformative-control", "prior-only", "typed-posterior"],
  ["noninformative-control", "typed-posterior", "prior-only"],
] as const;

export type RealSignalDecisionObject = {
  probabilitySource: RealSignalArm;
  evidenceStatus: string;
  signalLabel: RealSignalLabel | "WITHHELD";
  calibrationRuns: 90;
  priorProbabilityY: number;
  likelihoodSignalGivenY1: number;
  likelihoodSignalGivenY0: number;
  likelihoodRatio: number;
  probabilityY: number;
  publicationCost: 2;
  grossIfFutureTrade: 3;
  grossIfNoFutureTrade: 0;
  expectedNetPublish: number;
  silenceNet: 0;
};

export type RealSignalObservation = {
  arm: RealSignalArm;
  position: number;
  promptHash: string;
  decisionObject: RealSignalDecisionObject;
  publish: boolean;
};

export type RealSignalRun = {
  seed: number;
  speakerId: number;
  decisionRound: 5;
  earlyTrades: number;
  signal: RealSignalLabel;
  decisionCalls: 3;
  actionCalls: number;
  apiFails: number;
  parseFails: number;
  order: RealSignalArm[];
  observations: RealSignalObservation[];
  scheduleHash: string;
  futureTrades: number;
  outcomeY: 0 | 1;
  early: CoordinationSlice;
  future: CoordinationSlice;
  meanScore: number;
  result: RunResult;
};

type SignalSummary = { n: number; y1: number; yRate: number; frozenPosterior: number };
type ArmSummary = { n: number; accuracy: number; publishRate: number };
export type RealSignalReport = {
  study: "VBE-I-TPUE-REAL-SIGNAL-TRANSFER";
  status: "PROJECT-INTERNAL PROSPECTIVE ENVIRONMENT TRANSFER — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-real-signal-transfer-protocol.md";
  model: string;
  seeds: number[];
  calibration: { n: 90; priorY: number; counts: typeof CALIBRATION_COUNTS; posteriorNoEarly: number; posteriorEarly: number };
  runs: RealSignalRun[];
  completeSeeds: number;
  signal: {
    bySignal: Partial<Record<RealSignalLabel, SignalSummary>>;
    priorBrier: number | null;
    posteriorBrier: number | null;
    priorMinusPosterior: PairedEffect | null;
    freshDirection: number | null;
    gates: { complete: boolean; strata: boolean; effect: boolean; bootstrap: boolean; direction: boolean };
    pass: boolean;
  };
  action: {
    byArm: Partial<Record<RealSignalArm, ArmSummary>>;
    earlyTypedFlip: number | null;
    noEarlyTypedStability: number | null;
    controlStability: number | null;
    gates: { priorAccuracy: boolean; typedAccuracy: boolean; controlAccuracy: boolean; earlyFlip: boolean; noEarlyStability: boolean; controlStability: boolean };
    pass: boolean;
  };
  integrity: { expectedSealedCalls: 108; retainedSealedCalls: number; failedCallsRetained: 0; seedOverlap: number; casesValid: boolean; tracesValid: boolean; objectsValid: boolean; orderBalanced: boolean };
  verdict: "INCOMPLETE" | "REAL-SIGNAL PIPELINE SUPPORTED" | "SIGNAL VALID, ACTION TRANSFER FAILED" | "ACTION TRANSFERRED, SIGNAL DID NOT VALIDATE" | "REAL-SIGNAL PIPELINE NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

export function realSignalOrder(seed: number): readonly RealSignalArm[] {
  const index = REAL_SIGNAL_SEEDS.indexOf(seed as (typeof REAL_SIGNAL_SEEDS)[number]);
  if (index < 0) throw new Error(`unexpected real-signal seed ${seed}`);
  return ORDERS[index % ORDERS.length]!;
}

export function signalFromEarlyTrades(earlyTrades: number): RealSignalLabel {
  if (!Number.isInteger(earlyTrades) || earlyTrades < 0) throw new Error("invalid early trade count");
  return earlyTrades === 0 ? "NO_EARLY_TRADE" : "EARLY_TRADE";
}

export function posteriorForSignal(signal: RealSignalLabel): number {
  return signal === "NO_EARLY_TRADE" ? POSTERIOR_NO_EARLY : POSTERIOR_EARLY;
}

export function signalLikelihoods(signal: RealSignalLabel): { y1: number; y0: number } {
  return signal === "NO_EARLY_TRADE" ? { y1: 51 / 63, y0: 6 / 27 } : { y1: 12 / 63, y0: 21 / 27 };
}

export function realSignalDecisionObject(arm: RealSignalArm, signal: RealSignalLabel): RealSignalDecisionObject {
  const typed = arm === "typed-posterior";
  const likelihoods = typed ? signalLikelihoods(signal) : { y1: 1, y0: 1 };
  const probabilityY = typed ? posteriorForSignal(signal) : PRIOR_Y;
  return {
    probabilitySource: arm,
    evidenceStatus: typed ? "verified-real-signal-posterior" : arm === "noninformative-control" ? "matched-signal-lr-1" : "current-signal-withheld",
    signalLabel: arm === "prior-only" ? "WITHHELD" : signal,
    calibrationRuns: 90,
    priorProbabilityY: PRIOR_Y,
    likelihoodSignalGivenY1: likelihoods.y1,
    likelihoodSignalGivenY0: likelihoods.y0,
    likelihoodRatio: likelihoods.y1 / likelihoods.y0,
    probabilityY,
    publicationCost: 2,
    grossIfFutureTrade: 3,
    grossIfNoFutureTrade: 0,
    expectedNetPublish: CONTRACT_GROSS_IF_Y * probabilityY - CONTRACT_COST,
    silenceNet: 0,
  };
}

export function optimalRealSignalPublish(object: RealSignalDecisionObject): boolean {
  if (Math.abs(object.expectedNetPublish) < 1e-12) throw new Error("real-signal action tie");
  return object.expectedNetPublish > object.silenceNet;
}

export function realSignalPrompt(arm: RealSignalArm, signal: RealSignalLabel): string {
  const object = realSignalDecisionObject(arm, signal);
  return `SEALED ROUND-5 POLICY-MAINTENANCE DECISION. A public one-mark-per-check policy was externally displayed during rounds 1-4 of a 24-round VBE run. You maximize only your own expected score. Buying the maintenance/authorship contract costs 2 points now and pays gross 3 at the end if at least one qualifying mark-for-check trade occurs in rounds 5-23; otherwise gross is 0. Silence costs and pays 0. The rollout will remain forced-public only to measure that potential outcome, so this sealed answer cannot change the evidence. There is no discounting, liquidity constraint, default, or other payoff. The verified object contains no action recommendation.\nCANONICAL DECISION OBJECT:\n${JSON.stringify(object)}\nChoose the action with higher expected net payoff. Return JSON only: {"publish":true|false}`;
}

export function parseRealSignalAction(text: string): boolean {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing real-signal action JSON");
  const object = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(object)) !== JSON.stringify(["publish"]) || typeof object.publish !== "boolean") throw new Error("real-signal action fields do not match schema");
  return object.publish;
}

export function sha256RealSignal(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function earlyTradeCountFromMemories(agents: readonly AgentState[]): number {
  const unique = new Set<string>();
  for (const agent of agents) for (const item of agent.memory) {
    if (item.t < 1 || item.t > 4 || item.kind !== "chit-for-check" || !item.gaveCheck || item.partnerType !== "H") continue;
    unique.add(`${item.t}:${Math.min(agent.id, item.partnerId)}:${Math.max(agent.id, item.partnerId)}`);
  }
  return unique.size;
}

export function isQualifyingTrade(meeting: RunResult["rounds"][number]["meetings"][number]): boolean {
  return meeting.kind === "chit-for-check" && ((meeting.iType === "E" && meeting.jType === "H" && meeting.seller === meeting.i) || (meeting.iType === "H" && meeting.jType === "E" && meeting.seller === meeting.j));
}

export function qualifyingTradeCount(result: RunResult, firstRound: number, lastRound: number): number {
  return result.rounds.filter((round) => round.t >= firstRound && round.t <= lastRound).reduce((sum, round) => sum + round.meetings.filter(isQualifyingTrade).length, 0);
}

export function realSignalPriorSeedOverlap(): number {
  const prior = new Set<number>([
    ...PRIOR_LLM_EXPERIMENT_SEEDS,
    ...REACTIVITY_CONFIRMATORY_SEEDS,
    ...DISASSEMBLY_SEEDS,
    ...REWARD_CONFIRMATORY_SEEDS,
    ...FOUNDER_SEEDS,
    ...FOUNDER_RENT_SEEDS,
    ...FOUNDER_ROYALTY_SEEDS,
    ...SANITIZED_ROYALTY_SEEDS,
    ...HIDDEN_FORECAST_SEEDS,
    ...FORECAST_SCAFFOLD_SEEDS,
  ]);
  return REAL_SIGNAL_SEEDS.filter((seed) => prior.has(seed)).length;
}

function average(xs: readonly number[]): number { return xs.reduce((sum, value) => sum + value, 0) / xs.length; }
function median(xs: readonly number[]): number { const values = [...xs].sort((a, b) => a - b); const middle = Math.floor(values.length / 2); return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2; }
function paired(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }
function observation(run: RealSignalRun, arm: RealSignalArm): RealSignalObservation { const found = run.observations.find((item) => item.arm === arm); if (!found) throw new Error(`missing ${arm} seed=${run.seed}`); return found; }
function binaryBrier(probability: number, outcome: number): number { return (probability - outcome) ** 2; }
function expectedActionCalls(run: RealSignalRun): number { return run.result.rounds.reduce((sum, round) => sum + 2 * round.meetings.length, 0); }

function validateDecisionObject(stored: RealSignalDecisionObject, arm: RealSignalArm, signal: RealSignalLabel): void {
  const expected = realSignalDecisionObject(arm, signal);
  for (const key of Object.keys(expected) as Array<keyof RealSignalDecisionObject>) {
    const left = stored[key], right = expected[key];
    if (typeof left === "number" && typeof right === "number" ? Math.abs(left - right) > 1e-12 : left !== right) throw new Error(`real-signal object mismatch ${arm}:${key}`);
  }
  if (Math.abs(stored.expectedNetPublish - (3 * stored.probabilityY - 2)) > 1e-12) throw new Error("real-signal payoff arithmetic mismatch");
  optimalRealSignalPublish(stored);
}

function validateRun(run: RealSignalRun): void {
  if (!REAL_SIGNAL_SEEDS.includes(run.seed as (typeof REAL_SIGNAL_SEEDS)[number])) throw new Error(`unexpected real-signal seed ${run.seed}`);
  if (run.speakerId !== run.seed % 8 || run.decisionRound !== 5 || run.decisionCalls !== 3 || run.apiFails || run.parseFails) throw new Error(`real-signal call invariant failed seed=${run.seed}`);
  if (run.actionCalls !== expectedActionCalls(run)) throw new Error(`real-signal action-call count failed seed=${run.seed}`);
  if (run.result.rounds.length !== 24 || run.observations.length !== 3 || new Set(run.observations.map((item) => item.arm)).size !== 3) throw new Error(`real-signal structure failed seed=${run.seed}`);
  if (run.earlyTrades !== qualifyingTradeCount(run.result, 1, 4) || run.signal !== signalFromEarlyTrades(run.earlyTrades)) throw new Error(`real-signal early trace mismatch seed=${run.seed}`);
  if (run.futureTrades !== qualifyingTradeCount(run.result, 5, 23) || run.outcomeY !== Number(run.futureTrades >= 1)) throw new Error(`real-signal future trace mismatch seed=${run.seed}`);
  if (run.early.trades !== run.earlyTrades || run.future.trades !== run.futureTrades || Math.abs(run.meanScore - run.result.meanScore) > 1e-12) throw new Error(`real-signal summary mismatch seed=${run.seed}`);
  if (JSON.stringify(run.order) !== JSON.stringify(realSignalOrder(run.seed))) throw new Error(`real-signal order mismatch seed=${run.seed}`);
  if (!/^[0-9a-f]{8}$/.test(run.scheduleHash)) throw new Error(`real-signal schedule hash failed seed=${run.seed}`);
  run.observations.forEach((item, index) => {
    if (item.arm !== run.order[index] || item.position !== index + 1 || !/^[0-9a-f]{64}$/.test(item.promptHash)) throw new Error(`real-signal position/hash failed seed=${run.seed}`);
    validateDecisionObject(item.decisionObject, item.arm, run.signal);
    parseRealSignalAction(JSON.stringify({ publish: item.publish }));
  });
}

export function buildRealSignalReport(rawRuns: RealSignalRun[], model: string): RealSignalReport {
  const priorSeedOverlap = realSignalPriorSeedOverlap();
  const seen = new Set<number>();
  for (const run of rawRuns) { validateRun(run); if (seen.has(run.seed)) throw new Error(`duplicate real-signal seed ${run.seed}`); seen.add(run.seed); }
  if (priorSeedOverlap) throw new Error("real-signal seeds overlap prior experiments");
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed);
  const complete = runs.length === REAL_SIGNAL_SEEDS.length;
  const bySignal: RealSignalReport["signal"]["bySignal"] = {};
  let priorBrier: number | null = null, posteriorBrier: number | null = null, priorMinusPosterior: PairedEffect | null = null, freshDirection: number | null = null;
  if (runs.length) {
    for (const signal of ["NO_EARLY_TRADE", "EARLY_TRADE"] as const) {
      const rows = runs.filter((run) => run.signal === signal);
      if (rows.length) bySignal[signal] = { n: rows.length, y1: rows.filter((run) => run.outcomeY === 1).length, yRate: average(rows.map((run) => run.outcomeY)), frozenPosterior: posteriorForSignal(signal) };
    }
    const priorLosses = runs.map((run) => binaryBrier(PRIOR_Y, run.outcomeY));
    const posteriorLosses = runs.map((run) => binaryBrier(posteriorForSignal(run.signal), run.outcomeY));
    priorBrier = average(priorLosses); posteriorBrier = average(posteriorLosses);
    priorMinusPosterior = paired(runs.map((run, index) => priorLosses[index]! - posteriorLosses[index]!));
    if (bySignal.NO_EARLY_TRADE && bySignal.EARLY_TRADE) freshDirection = bySignal.NO_EARLY_TRADE.yRate - bySignal.EARLY_TRADE.yRate;
  }
  const signalGates = {
    complete,
    strata: Boolean(bySignal.NO_EARLY_TRADE && bySignal.EARLY_TRADE && bySignal.NO_EARLY_TRADE.n >= MIN_SIGNAL_STRATUM && bySignal.EARLY_TRADE.n >= MIN_SIGNAL_STRATUM),
    effect: Boolean(priorMinusPosterior && priorMinusPosterior.mean >= BRIER_IMPROVEMENT_FLOOR),
    bootstrap: Boolean(priorMinusPosterior?.bootstrap95 && priorMinusPosterior.bootstrap95[0] > 0),
    direction: Boolean(freshDirection !== null && freshDirection >= FRESH_DIRECTION_FLOOR),
  };
  const signalPass = Object.values(signalGates).every(Boolean);

  const byArm: RealSignalReport["action"]["byArm"] = {};
  for (const arm of REAL_SIGNAL_ARMS) if (runs.length) {
    const rows = runs.map((run) => observation(run, arm));
    byArm[arm] = { n: rows.length, accuracy: average(rows.map((item) => Number(item.publish === optimalRealSignalPublish(item.decisionObject)))), publishRate: average(rows.map((item) => Number(item.publish))) };
  }
  const earlyRuns = runs.filter((run) => run.signal === "EARLY_TRADE");
  const noEarlyRuns = runs.filter((run) => run.signal === "NO_EARLY_TRADE");
  const earlyTypedFlip = earlyRuns.length ? average(earlyRuns.map((run) => Number(observation(run, "typed-posterior").publish !== observation(run, "prior-only").publish))) : null;
  const noEarlyTypedStability = noEarlyRuns.length ? average(noEarlyRuns.map((run) => Number(observation(run, "typed-posterior").publish === observation(run, "prior-only").publish))) : null;
  const controlStability = runs.length ? average(runs.map((run) => Number(observation(run, "noninformative-control").publish === observation(run, "prior-only").publish))) : null;
  const actionGates = {
    priorAccuracy: Boolean(complete && byArm["prior-only"] && byArm["prior-only"]!.accuracy >= ACTION_ACCURACY_FLOOR),
    typedAccuracy: Boolean(complete && byArm["typed-posterior"] && byArm["typed-posterior"]!.accuracy >= ACTION_ACCURACY_FLOOR),
    controlAccuracy: Boolean(complete && byArm["noninformative-control"] && byArm["noninformative-control"]!.accuracy >= ACTION_ACCURACY_FLOOR),
    earlyFlip: Boolean(complete && earlyTypedFlip !== null && earlyTypedFlip >= EARLY_FLIP_FLOOR),
    noEarlyStability: Boolean(complete && noEarlyTypedStability !== null && noEarlyTypedStability >= NO_EARLY_STABILITY_FLOOR),
    controlStability: Boolean(complete && controlStability !== null && controlStability >= CONTROL_STABILITY_FLOOR),
  };
  const actionPass = Object.values(actionGates).every(Boolean);
  const orderBalanced = complete && REAL_SIGNAL_ARMS.every((arm) => [0, 1, 2].every((position) => runs.filter((run) => run.order[position] === arm).length === 12));
  let verdict: RealSignalReport["verdict"] = "INCOMPLETE";
  if (complete) verdict = signalPass && actionPass ? "REAL-SIGNAL PIPELINE SUPPORTED" : signalPass ? "SIGNAL VALID, ACTION TRANSFER FAILED" : actionPass ? "ACTION TRANSFERRED, SIGNAL DID NOT VALIDATE" : "REAL-SIGNAL PIPELINE NOT SUPPORTED";
  return {
    study: "VBE-I-TPUE-REAL-SIGNAL-TRANSFER",
    status: "PROJECT-INTERNAL PROSPECTIVE ENVIRONMENT TRANSFER — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-real-signal-transfer-protocol.md",
    model,
    seeds: [...REAL_SIGNAL_SEEDS],
    calibration: { n: CALIBRATION_N, priorY: PRIOR_Y, counts: CALIBRATION_COUNTS, posteriorNoEarly: POSTERIOR_NO_EARLY, posteriorEarly: POSTERIOR_EARLY },
    runs,
    completeSeeds: runs.length,
    signal: { bySignal, priorBrier, posteriorBrier, priorMinusPosterior, freshDirection, gates: signalGates, pass: signalPass },
    action: { byArm, earlyTypedFlip, noEarlyTypedStability, controlStability, gates: actionGates, pass: actionPass },
    integrity: { expectedSealedCalls: 108, retainedSealedCalls: runs.reduce((sum, run) => sum + run.decisionCalls, 0), failedCallsRetained: 0, seedOverlap: priorSeedOverlap, casesValid: true, tracesValid: true, objectsValid: true, orderBalanced },
    verdict,
    caveat: "The early-trade signal was selected and calibrated on 90 completed prior VBE runs, then evaluated only on the 36 fresh seeds for this verdict. It is predictive, not causally identified. The policy remains forced-public after the sealed decision, and posterior plus expected payoff are externally compiled. Results do not establish autonomous signal learning, causal policy renewal, participant-funded finance, welfare improvement, reinforcement learning, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
