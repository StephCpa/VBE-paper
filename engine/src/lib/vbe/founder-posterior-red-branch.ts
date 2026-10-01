import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import { POSTERIOR_CASES, parsePosterior, posteriorTruth, type PosteriorCase } from "./founder-posterior-update.ts";

export const RED_BRANCH_CASES = POSTERIOR_CASES.filter((item) => item.observed === "RED");
export const RED_BRANCH_INTERFACES = ["implicit-complement", "explicit-two-row", "observed-row-only"] as const;
export type RedBranchInterface = (typeof RED_BRANCH_INTERFACES)[number];
export type RedBranchObservation = { interface: RedBranchInterface; position: number; promptHash: string; prediction: number };
export type RedBranchCaseResult = { caseIndex: number; sourceCaseId: number; case: PosteriorCase; calls: 3; apiFails: number; parseFails: number; order: RedBranchInterface[]; observations: RedBranchObservation[] };
export type RedBranchSummary = { n: number; accuracy02: number; mae: number; directionAccuracy: number; priorCopyRate: number; priorCopyGain: PairedEffect; pass: boolean };
export type RedBranchReport = {
  study: "VBE-I-TPUR-RED-BRANCH";
  status: "PROJECT-INTERNAL PROSPECTIVE ABLATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-posterior-red-branch-protocol.md";
  model: string;
  cases: RedBranchCaseResult[];
  completeCases: number;
  byInterface: Partial<Record<RedBranchInterface, RedBranchSummary>>;
  explicitRescue: PairedEffect | null;
  rescuePass: boolean;
  integrity: { expectedCalls: 36; retainedCalls: number; failedCallsRetained: 0; casesValid: boolean; schemasValid: boolean; orderBalanced: boolean };
  verdict: "INCOMPLETE" | "BASELINE REPLICATION SHIFT — NO LOCALIZATION" | "COMPLEMENT MATERIALIZATION REQUIRED" | "OBSERVED-ROW ISOLATION REQUIRED" | "EXPLICIT TWO-ROW REPAIR ONLY" | "EXTERNAL LIKELIHOOD COMPILER REQUIRED";
  caveat: string;
  generatedAt: string;
};

export const RED_ACCURACY_FLOOR = 0.90;
export const RED_MAE_CEILING = 0.03;
export const RED_DIRECTION_FLOOR = 0.90;
export const RED_COPY_CEILING = 0.10;
export const RED_GAIN_FLOOR = 0.10;
export const RED_GAIN_LOWER_FLOOR = 0.05;
export const RED_RESCUE_FLOOR = 0.50;
export const RED_RESCUE_LOWER_FLOOR = 0.25;

const ORDERS: readonly (readonly RedBranchInterface[])[] = [
  ["implicit-complement", "explicit-two-row", "observed-row-only"],
  ["implicit-complement", "observed-row-only", "explicit-two-row"],
  ["explicit-two-row", "implicit-complement", "observed-row-only"],
  ["explicit-two-row", "observed-row-only", "implicit-complement"],
  ["observed-row-only", "implicit-complement", "explicit-two-row"],
  ["observed-row-only", "explicit-two-row", "implicit-complement"],
] as const;

export function redBranchOrder(caseIndex: number): readonly RedBranchInterface[] {
  if (!Number.isInteger(caseIndex) || caseIndex < 1 || caseIndex > RED_BRANCH_CASES.length) throw new Error(`invalid red-branch case ${caseIndex}`);
  return ORDERS[(caseIndex - 1) % ORDERS.length]!;
}

export function sha256RedBranch(text: string): string { return createHash("sha256").update(text).digest("hex"); }

export function redBranchPrompt(kind: RedBranchInterface, item: PosteriorCase): string {
  if (item.observed !== "RED") throw new Error("red-branch prompt requires RED observation");
  const intro = `A future deployment has one latent state: HIGH-ADOPTION H or LOW-ADOPTION L. Before seeing a public sensor, P(H)=${item.prior.toFixed(2)} and P(L)=${(1 - item.prior).toFixed(2)}. The public sensor report is RED. Estimate P(H | RED).`;
  const redH = 1 - item.greenGivenH, redL = 1 - item.greenGivenL;
  let evidence: string;
  if (kind === "implicit-complement") evidence = `The validated sensor mechanism is P(GREEN|H)=${item.greenGivenH.toFixed(2)} and P(GREEN|L)=${item.greenGivenL.toFixed(2)}. RED is the complement in each state.`;
  else if (kind === "explicit-two-row") evidence = `The validated sensor mechanism is P(GREEN|H)=${item.greenGivenH.toFixed(2)}, P(GREEN|L)=${item.greenGivenL.toFixed(2)}, P(RED|H)=${redH.toFixed(2)}, and P(RED|L)=${redL.toFixed(2)}.`;
  else evidence = `For the observed RED report, the validated sensor mechanism is P(RED|H)=${redH.toFixed(2)} and P(RED|L)=${redL.toFixed(2)}.`;
  return `${intro}\n${evidence}\nReturn JSON only: {"posterior":number}`;
}

function average(xs: readonly number[]): number { return xs.reduce((sum, x) => sum + x, 0) / xs.length; }
function median(xs: readonly number[]): number { const sorted = [...xs].sort((a, b) => a - b); const m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2; }
function paired(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }
function observationFor(result: RedBranchCaseResult, kind: RedBranchInterface): RedBranchObservation { const found = result.observations.find((item) => item.interface === kind); if (!found) throw new Error(`missing ${kind} case=${result.caseIndex}`); return found; }

function validateCase(result: RedBranchCaseResult): void {
  const expected = RED_BRANCH_CASES[result.caseIndex - 1];
  if (!expected || result.sourceCaseId !== expected.caseId || JSON.stringify(result.case) !== JSON.stringify(expected)) throw new Error(`case mismatch ${result.caseIndex}`);
  if (result.calls !== 3 || result.apiFails || result.parseFails || result.observations.length !== 3) throw new Error(`call invariant failed case=${result.caseIndex}`);
  if (JSON.stringify(result.order) !== JSON.stringify(redBranchOrder(result.caseIndex))) throw new Error(`order mismatch case=${result.caseIndex}`);
  if (new Set(result.observations.map((item) => item.interface)).size !== 3) throw new Error(`interface coverage failed case=${result.caseIndex}`);
  result.observations.forEach((observation, index) => { if (observation.interface !== result.order[index] || observation.position !== index + 1) throw new Error(`position mismatch case=${result.caseIndex}`); if (!/^[0-9a-f]{64}$/.test(observation.promptHash)) throw new Error(`prompt hash failed case=${result.caseIndex}`); parsePosterior(JSON.stringify({ posterior: observation.prediction })); });
}

function summarize(cases: RedBranchCaseResult[], kind: RedBranchInterface): RedBranchSummary {
  const rows = cases.map((result) => {
    const prediction = observationFor(result, kind).prediction, truth = posteriorTruth(result.case), prior = result.case.prior;
    const error = Math.abs(prediction - truth), priorError = Math.abs(prior - truth);
    return { error, direction: Number(Math.sign(prediction - prior) === Math.sign(truth - prior)), copy: Number(Math.abs(prediction - prior) <= 0.0200000001), gain: priorError - error };
  });
  const accuracy02 = average(rows.map((row) => Number(row.error <= 0.0200000001))), mae = average(rows.map((row) => row.error),), directionAccuracy = average(rows.map((row) => row.direction)), priorCopyRate = average(rows.map((row) => row.copy)), priorCopyGain = paired(rows.map((row) => row.gain));
  const pass = accuracy02 >= RED_ACCURACY_FLOOR && mae <= RED_MAE_CEILING && directionAccuracy >= RED_DIRECTION_FLOOR && priorCopyRate <= RED_COPY_CEILING && priorCopyGain.mean >= RED_GAIN_FLOOR && priorCopyGain.bootstrap95![0] > RED_GAIN_LOWER_FLOOR;
  return { n: rows.length, accuracy02, mae, directionAccuracy, priorCopyRate, priorCopyGain, pass };
}

export function buildRedBranchReport(rawCases: RedBranchCaseResult[], model: string): RedBranchReport {
  const seen = new Set<number>(); for (const result of rawCases) { validateCase(result); if (seen.has(result.caseIndex)) throw new Error(`duplicate case ${result.caseIndex}`); seen.add(result.caseIndex); }
  const cases = [...rawCases].sort((a, b) => a.caseIndex - b.caseIndex), complete = cases.length === RED_BRANCH_CASES.length;
  const byInterface: RedBranchReport["byInterface"] = {}; if (cases.length) for (const kind of RED_BRANCH_INTERFACES) byInterface[kind] = summarize(cases, kind);
  const explicitRescue = cases.length ? paired(cases.map((result) => Number(Math.abs(observationFor(result, "explicit-two-row").prediction - posteriorTruth(result.case)) <= 0.0200000001) - Number(Math.abs(observationFor(result, "implicit-complement").prediction - posteriorTruth(result.case)) <= 0.0200000001))) : null;
  const rescuePass = Boolean(complete && explicitRescue && explicitRescue.mean >= RED_RESCUE_FLOOR && explicitRescue.bootstrap95![0] > RED_RESCUE_LOWER_FLOOR);
  const orderBalanced = RED_BRANCH_INTERFACES.every((kind) => [0, 1, 2].every((position) => cases.filter((result) => result.order[position] === kind).length === (complete ? 4 : cases.filter((result) => result.order[position] === kind).length)));
  let verdict: RedBranchReport["verdict"] = "INCOMPLETE";
  if (complete) {
    const implicit = byInterface["implicit-complement"]!.pass, two = byInterface["explicit-two-row"]!.pass, observed = byInterface["observed-row-only"]!.pass;
    verdict = implicit ? "BASELINE REPLICATION SHIFT — NO LOCALIZATION" : two && observed && rescuePass ? "COMPLEMENT MATERIALIZATION REQUIRED" : !two && observed ? "OBSERVED-ROW ISOLATION REQUIRED" : two && rescuePass ? "EXPLICIT TWO-ROW REPAIR ONLY" : "EXTERNAL LIKELIHOOD COMPILER REQUIRED";
  }
  return { study: "VBE-I-TPUR-RED-BRANCH", status: "PROJECT-INTERNAL PROSPECTIVE ABLATION — NOT EXTERNALLY REGISTERED", frozenProtocol: "VBE-posterior-red-branch-protocol.md", model, cases, completeCases: cases.length, byInterface, explicitRescue, rescuePass, integrity: { expectedCalls: 36, retainedCalls: cases.reduce((sum, result) => sum + result.calls, 0), failedCallsRetained: 0, casesValid: true, schemasValid: true, orderBalanced }, verdict, caveat: "This ablation uses only the 12 synthetic RED cases from I-TPU. It distinguishes complement materialization from observed-row isolation under one hosted model alias, but does not test learned signal models, real adoption forecasting, multiple dependent signals, action use, reinforcement learning, welfare, or cross-model generality.", generatedAt: new Date().toISOString() };
}
