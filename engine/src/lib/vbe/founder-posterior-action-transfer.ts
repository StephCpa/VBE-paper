import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import { POSTERIOR_CASES, posteriorTruth, type PosteriorCase } from "./founder-posterior-update.ts";

export const ACTION_TRANSFER_ARMS = ["prior-only", "typed-posterior", "noninformative-control"] as const;
export type ActionTransferArm = (typeof ACTION_TRANSFER_ARMS)[number];
export type ActionTransferObject = { probabilitySource: string; evidenceStatus: string; observedSignal: string | null; probabilityH: number; publicationCost: number; grossIfH: 2; grossIfL: 0; expectedNetPublish: number; silenceNet: 0 };
export type ActionTransferObservation = { arm: ActionTransferArm; position: number; promptHash: string; decisionObject: ActionTransferObject; publish: boolean };
export type ActionTransferCaseResult = { caseId: number; case: PosteriorCase; calls: 3; apiFails: number; parseFails: number; order: ActionTransferArm[]; observations: ActionTransferObservation[] };
export type ActionTransferArmSummary = { n: number; accuracy: number; publishRate: number };
export type ActionTransferReport = {
  study: "VBE-I-TPUD-POSTERIOR-ACTION-TRANSFER";
  status: "PROJECT-INTERNAL PROSPECTIVE TRANSFER TEST — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-posterior-action-transfer-protocol.md";
  model: string;
  cases: ActionTransferCaseResult[];
  completeCases: number;
  byArm: Partial<Record<ActionTransferArm, ActionTransferArmSummary>>;
  typedFlipRate: number | null;
  noninformativeStability: number | null;
  posteriorTargetGain: PairedEffect | null;
  gates: { priorAccuracy: boolean; typedAccuracy: boolean; controlAccuracy: boolean; typedFlip: boolean; controlStability: boolean; posteriorTargetGain: boolean };
  integrity: { expectedCalls: 72; retainedCalls: number; failedCallsRetained: 0; casesValid: boolean; objectsValid: boolean; schemasValid: boolean; orderBalanced: boolean };
  verdict: "INCOMPLETE" | "POSTERIOR-TO-ACTION TRANSFER SUPPORTED" | "POSTERIOR IGNORED OR MISAPPLIED" | "FORMAT OR CONTROL INSTABILITY" | "POSTERIOR-TO-ACTION TRANSFER NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

const ORDERS: readonly (readonly ActionTransferArm[])[] = [
  ["prior-only", "typed-posterior", "noninformative-control"], ["prior-only", "noninformative-control", "typed-posterior"],
  ["typed-posterior", "prior-only", "noninformative-control"], ["typed-posterior", "noninformative-control", "prior-only"],
  ["noninformative-control", "prior-only", "typed-posterior"], ["noninformative-control", "typed-posterior", "prior-only"],
] as const;

export const ACTION_ACCURACY_FLOOR = 0.95;
export const TYPED_FLIP_FLOOR = 0.90;
export const CONTROL_STABILITY_FLOOR = 0.90;
export const POSTERIOR_TARGET_GAIN_FLOOR = 0.80;
export const POSTERIOR_TARGET_GAIN_LOWER_FLOOR = 0.60;

export function actionTransferOrder(caseId: number): readonly ActionTransferArm[] { if (!Number.isInteger(caseId) || caseId < 1 || caseId > POSTERIOR_CASES.length) throw new Error(`invalid action-transfer case ${caseId}`); return ORDERS[(caseId - 1) % ORDERS.length]!; }
export function actionTransferCost(item: PosteriorCase): number { return item.prior + posteriorTruth(item); }
export function actionTransferObject(arm: ActionTransferArm, item: PosteriorCase): ActionTransferObject {
  const typed = arm === "typed-posterior";
  const probabilityH = typed ? posteriorTruth(item) : item.prior;
  const publicationCost = actionTransferCost(item);
  return {
    probabilitySource: arm,
    evidenceStatus: typed ? "verified-informative-posterior" : arm === "noninformative-control" ? "verified-noninformative-posterior-lr-1" : "no-current-signal",
    observedSignal: arm === "prior-only" ? null : item.observed,
    probabilityH,
    publicationCost,
    grossIfH: 2,
    grossIfL: 0,
    expectedNetPublish: 2 * probabilityH - publicationCost,
    silenceNet: 0,
  };
}
export function optimalPublish(object: ActionTransferObject): boolean { if (Math.abs(object.expectedNetPublish) < 1e-12) throw new Error("action-transfer tie"); return object.expectedNetPublish > object.silenceNet; }
export function sha256ActionTransfer(text: string): string { return createHash("sha256").update(text).digest("hex"); }
export function actionTransferPrompt(arm: ActionTransferArm, item: PosteriorCase): string {
  const object = actionTransferObject(arm, item);
  return `You are the sole author deciding whether to publish a nonbinding policy. Maximize your own expected score. Publication pays the stated gross amount in latent state H or L and immediately charges the stated publication cost. Silence has the stated net payoff. There is no discounting, liquidity constraint, default, or other payoff. The object is verified and contains no action recommendation.\nCANONICAL DECISION OBJECT:\n${JSON.stringify(object)}\nChoose the action with higher expected net payoff. Return JSON only: {"publish":true|false}`;
}
export function parseActionTransfer(text: string): boolean { const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error("missing action JSON object"); const obj = JSON.parse(match[0]) as Record<string, unknown>; if (JSON.stringify(Object.keys(obj)) !== JSON.stringify(["publish"]) || typeof obj.publish !== "boolean") throw new Error("action fields do not match schema"); return obj.publish; }
function average(xs: readonly number[]): number { return xs.reduce((sum, x) => sum + x, 0) / xs.length; }
function median(xs: readonly number[]): number { const sorted = [...xs].sort((a, b) => a - b); const m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2; }
function paired(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }
function observationFor(result: ActionTransferCaseResult, arm: ActionTransferArm): ActionTransferObservation { const found = result.observations.find((item) => item.arm === arm); if (!found) throw new Error(`missing ${arm} case=${result.caseId}`); return found; }
function validateObject(stored: ActionTransferObject, arm: ActionTransferArm, item: PosteriorCase): void { const expected = actionTransferObject(arm, item); for (const key of Object.keys(expected) as Array<keyof ActionTransferObject>) { const a = stored[key], b = expected[key]; if (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) > 1e-12 : a !== b) throw new Error(`decision object mismatch ${arm}:${key}`); } if (Math.abs(stored.expectedNetPublish - (2 * stored.probabilityH - stored.publicationCost)) > 1e-12) throw new Error("expected net arithmetic mismatch"); optimalPublish(stored); }
function validateCase(result: ActionTransferCaseResult): void {
  const expected = POSTERIOR_CASES[result.caseId - 1]; if (!expected || JSON.stringify(result.case) !== JSON.stringify(expected)) throw new Error(`case mismatch ${result.caseId}`);
  if (result.calls !== 3 || result.apiFails || result.parseFails || result.observations.length !== 3) throw new Error(`call invariant failed case=${result.caseId}`);
  if (JSON.stringify(result.order) !== JSON.stringify(actionTransferOrder(result.caseId))) throw new Error(`order mismatch case=${result.caseId}`);
  if (new Set(result.observations.map((item) => item.arm)).size !== 3) throw new Error(`arm coverage failed case=${result.caseId}`);
  result.observations.forEach((observation, index) => { if (observation.arm !== result.order[index] || observation.position !== index + 1) throw new Error(`position mismatch case=${result.caseId}`); if (!/^[0-9a-f]{64}$/.test(observation.promptHash)) throw new Error(`prompt hash failed case=${result.caseId}`); validateObject(observation.decisionObject, observation.arm, result.case); parseActionTransfer(JSON.stringify({ publish: observation.publish })); });
}

export function buildActionTransferReport(rawCases: ActionTransferCaseResult[], model: string): ActionTransferReport {
  const seen = new Set<number>(); for (const result of rawCases) { validateCase(result); if (seen.has(result.caseId)) throw new Error(`duplicate case ${result.caseId}`); seen.add(result.caseId); }
  const cases = [...rawCases].sort((a, b) => a.caseId - b.caseId), complete = cases.length === POSTERIOR_CASES.length;
  const byArm: ActionTransferReport["byArm"] = {};
  for (const arm of ACTION_TRANSFER_ARMS) if (cases.length) { const rows = cases.map((result) => observationFor(result, arm)); byArm[arm] = { n: rows.length, accuracy: average(rows.map((row) => Number(row.publish === optimalPublish(row.decisionObject)))), publishRate: average(rows.map((row) => Number(row.publish))) }; }
  const typedFlipRate = cases.length ? average(cases.map((result) => Number(observationFor(result, "typed-posterior").publish !== observationFor(result, "prior-only").publish))) : null;
  const noninformativeStability = cases.length ? average(cases.map((result) => Number(observationFor(result, "noninformative-control").publish === observationFor(result, "prior-only").publish))) : null;
  const posteriorTargetGain = cases.length ? paired(cases.map((result) => { const target = optimalPublish(actionTransferObject("typed-posterior", result.case)); return Number(observationFor(result, "typed-posterior").publish === target) - Number(observationFor(result, "noninformative-control").publish === target); })) : null;
  const gates = { priorAccuracy: Boolean(complete && byArm["prior-only"]!.accuracy >= ACTION_ACCURACY_FLOOR), typedAccuracy: Boolean(complete && byArm["typed-posterior"]!.accuracy >= ACTION_ACCURACY_FLOOR), controlAccuracy: Boolean(complete && byArm["noninformative-control"]!.accuracy >= ACTION_ACCURACY_FLOOR), typedFlip: Boolean(complete && typedFlipRate! >= TYPED_FLIP_FLOOR), controlStability: Boolean(complete && noninformativeStability! >= CONTROL_STABILITY_FLOOR), posteriorTargetGain: Boolean(complete && posteriorTargetGain && posteriorTargetGain.mean >= POSTERIOR_TARGET_GAIN_FLOOR && posteriorTargetGain.bootstrap95![0] > POSTERIOR_TARGET_GAIN_LOWER_FLOOR) };
  const orderBalanced = ACTION_TRANSFER_ARMS.every((arm) => [0, 1, 2].every((position) => cases.filter((result) => result.order[position] === arm).length === (complete ? 8 : cases.filter((result) => result.order[position] === arm).length)));
  let verdict: ActionTransferReport["verdict"] = "INCOMPLETE"; if (complete) verdict = Object.values(gates).every(Boolean) ? "POSTERIOR-TO-ACTION TRANSFER SUPPORTED" : !gates.typedAccuracy || !gates.typedFlip ? "POSTERIOR IGNORED OR MISAPPLIED" : !gates.controlAccuracy || !gates.controlStability ? "FORMAT OR CONTROL INSTABILITY" : "POSTERIOR-TO-ACTION TRANSFER NOT SUPPORTED";
  return { study: "VBE-I-TPUD-POSTERIOR-ACTION-TRANSFER", status: "PROJECT-INTERNAL PROSPECTIVE TRANSFER TEST — NOT EXTERNALLY REGISTERED", frozenProtocol: "VBE-posterior-action-transfer-protocol.md", model, cases, completeCases: cases.length, byArm, typedFlipRate, noninformativeStability, posteriorTargetGain, gates, integrity: { expectedCalls: 72, retainedCalls: cases.reduce((sum, result) => sum + result.calls, 0), failedCallsRetained: 0, casesValid: true, objectsValid: true, schemasValid: true, orderBalanced }, verdict, caveat: "Expected net payoff is externally compiled and the contract threshold is constructed between the prior and informative posterior. This tests use of a trusted canonical posterior/payoff object in sealed binary decisions, not autonomous forecasting, Bayes arithmetic, real environment returns, participant-funded incentives, welfare, reinforcement learning, or cross-model generality.", generatedAt: new Date().toISOString() };
}
