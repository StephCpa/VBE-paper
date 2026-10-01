import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";

export const ACTION_CONFIDENCE_DISTRIBUTIONS = [
  [0.10, 0.20, 0.30, 0.40], [0.40, 0.30, 0.20, 0.10],
  [0.05, 0.15, 0.30, 0.50], [0.50, 0.30, 0.15, 0.05],
  [0.20, 0.50, 0.20, 0.10], [0.30, 0.10, 0.10, 0.50],
  [0.15, 0.15, 0.60, 0.10], [0.45, 0.05, 0.20, 0.30],
  [0.25, 0.25, 0.25, 0.25], [0.60, 0.10, 0.10, 0.20],
  [0.02, 0.48, 0.48, 0.02], [0.70, 0.10, 0.10, 0.10],
] as const;
export const ACTION_CONFIDENCE_COSTS = [1, 3, 5] as const;
export const ACTION_MASKS = ["PPP", "PPS", "PSP", "PSS", "SPP", "SPS", "SSP", "SSS"] as const;
export const ACTION_CONFIDENCE_INTERFACES = ["derived-vector", "compiled-vector", "explicit-vector", "compiled-scalar"] as const;
export type ActionConfidenceCost = (typeof ACTION_CONFIDENCE_COSTS)[number];
export type ActionMask = (typeof ACTION_MASKS)[number];
export type ActionConfidenceInterface = (typeof ACTION_CONFIDENCE_INTERFACES)[number];
export type VectorConfidence = { cost1: number; cost3: number; cost5: number };
export type ActionConfidenceItem = {
  block: number; distribution: number[]; mask: ActionMask; interface: ActionConfidenceInterface;
  cost: ActionConfidenceCost | null; position: number; promptHash: string;
  prediction: VectorConfidence | number;
};
export type ActionConfidenceBlock = { block: number; calls: number; apiFails: number; parseFails: number; items: ActionConfidenceItem[] };
export type InterfaceSummary = { calls: number; predictions: number; accuracy02: number; mae: number; complementMae: number; pass: boolean };
export type ActionConfidenceReport = {
  study: "VBE-I-TPC-ACTION-CONFIDENCE-COMPLEMENT";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-action-confidence-complement-protocol.md";
  model: string; blocks: ActionConfidenceBlock[]; completeBlocks: number;
  byInterface: Partial<Record<ActionConfidenceInterface, InterfaceSummary>>;
  contrasts: Record<string, PairedEffect | null>;
  integrity: { expectedCalls: number; retainedCalls: number; failedCallsRetained: 0; preCompletionSchemaFailures: 2; preCompletionSuccessfulCallsExcluded: 464; archivedPartialData: string; schemasValid: boolean; balanceValid: boolean };
  verdict: "INCOMPLETE" | "COMPLEMENT CAPABILITY AND VECTOR INTERFACE SUPPORTED" | "CAPABILITY PRESENT — EXPLICIT VECTOR REPAIR REQUIRED" | "CAPABILITY ONLY — EXTERNAL VECTOR COMPILER REQUIRED" | "EXPLICIT BRANCH INSTRUCTION REQUIRED" | "EXTERNAL DETERMINISTIC COMPILER REQUIRED";
  caveat: string; generatedAt: string;
};

const INTERFACE_ORDERS: readonly (readonly ActionConfidenceInterface[])[] = [
  ["derived-vector", "compiled-vector", "explicit-vector", "compiled-scalar"],
  ["compiled-vector", "compiled-scalar", "derived-vector", "explicit-vector"],
  ["explicit-vector", "derived-vector", "compiled-scalar", "compiled-vector"],
  ["compiled-scalar", "explicit-vector", "compiled-vector", "derived-vector"],
] as const;

export function sha256ActionConfidence(text: string): string { return createHash("sha256").update(text).digest("hex"); }
export function interfaceOrder(block: number): readonly ActionConfidenceInterface[] { validateBlock(block); return INTERFACE_ORDERS[(block - 1) % 4]!; }
export function maskOrder(block: number, interfacePosition: number): readonly ActionMask[] {
  validateBlock(block); const shift = (block * 3 + interfacePosition * 5) % ACTION_MASKS.length;
  const base = block % 2 ? [...ACTION_MASKS] : [...ACTION_MASKS].reverse();
  return [...base.slice(shift), ...base.slice(0, shift)];
}
export function scalarCostOrder(block: number, maskPosition: number): readonly ActionConfidenceCost[] {
  validateBlock(block); const shift = (block + maskPosition) % 3;
  return [...ACTION_CONFIDENCE_COSTS.slice(shift), ...ACTION_CONFIDENCE_COSTS.slice(0, shift)];
}
function validateBlock(block: number): void { if (!Number.isInteger(block) || block < 1 || block > ACTION_CONFIDENCE_DISTRIBUTIONS.length) throw new Error(`invalid action-confidence block ${block}`); }
export function qPublish(distribution: readonly number[], cost: ActionConfidenceCost): number {
  if (distribution.length !== 4 || Math.abs(distribution.reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new Error("invalid distribution");
  return cost === 1 ? 1 - distribution[0]! : cost === 3 ? distribution[2]! + distribution[3]! : distribution[3]!;
}
export function actionFor(mask: ActionMask, cost: ActionConfidenceCost): "publish" | "silent" { return mask[ACTION_CONFIDENCE_COSTS.indexOf(cost)] === "P" ? "publish" : "silent"; }
export function compiledChosenConfidence(q: number, action: "publish" | "silent"): number {
  if (!Number.isFinite(q) || q < 0 || q > 1) throw new Error("q out of range");
  return action === "publish" ? q : 1 - q;
}
function sealedActions(mask: ActionMask): string { return ACTION_CONFIDENCE_COSTS.map((c) => `cost${c}=${actionFor(mask, c)}`).join(", "); }
function qText(distribution: readonly number[]): string { return ACTION_CONFIDENCE_COSTS.map((c) => `cost${c}=${qPublish(distribution, c).toFixed(2)}`).join(", "); }
const COMMON = `A publication contract pays 2×N* minus an odd publication cost. Silence pays 0. Because costs are odd, there are no ties. Actions are sealed and cannot be changed. A confidence means the probability that the SEALED CHOSEN ACTION strictly beats its alternative.`;

export function vectorPrompt(kind: Exclude<ActionConfidenceInterface, "compiled-scalar">, distribution: readonly number[], mask: ActionMask): string {
  const action = sealedActions(mask);
  if (kind === "derived-vector") return `${COMMON}\nKnown distribution P(N*=0,1,2,3+)=[${distribution.map((x) => x.toFixed(2)).join(",")}]. Publication wins at cost 1 iff N*>=1, cost 3 iff N*>=2, and cost 5 iff N*>=3.\nSEALED ACTIONS: ${action}.\nReturn JSON only. Array order is cost 1, cost 3, cost 5: {"confidences":[number,number,number]}`;
  const qs = qText(distribution);
  if (kind === "compiled-vector") return `${COMMON}\nA verified compiler gives P(PUBLICATION strictly wins): ${qs}.\nSEALED ACTIONS: ${action}. Do not change them. Report confidence in each sealed chosen action, not confidence in publication.\nReturn JSON only. Array order is cost 1, cost 3, cost 5: {"confidences":[number,number,number]}`;
  return `${COMMON}\nA verified compiler gives P(PUBLICATION strictly wins): ${qs}.\nSEALED ACTIONS: ${action}. Use this exact branch for each cost: if chosen action is publish, confidence=q; if chosen action is silent, confidence=1-q.\nReturn JSON only. Array order is cost 1, cost 3, cost 5: {"confidences":[number,number,number]}`;
}
export function scalarPrompt(distribution: readonly number[], mask: ActionMask, cost: ActionConfidenceCost): string {
  const q = qPublish(distribution, cost).toFixed(2); const action = actionFor(mask, cost);
  return `${COMMON}\nFor cost ${cost}, a verified compiler gives P(PUBLICATION strictly wins)=q=${q}. The SEALED ACTION is ${action}. Report the probability that this sealed chosen action strictly wins.\nReturn JSON only: {"confidence":number}`;
}
function parseObject(text: string): Record<string, unknown> { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error("missing JSON object"); const x = JSON.parse(m[0]); if (!x || typeof x !== "object" || Array.isArray(x)) throw new Error("response must be object"); return x as Record<string, unknown>; }
function probability(x: unknown): number { const n = Number(x); if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error("confidence must be in [0,1]"); return n; }
export function parseVectorConfidence(text: string): VectorConfidence { const x = parseObject(text); if (JSON.stringify(Object.keys(x)) !== JSON.stringify(["confidences"]) || !Array.isArray(x.confidences) || x.confidences.length !== 3) throw new Error("vector fields do not match schema"); const values = x.confidences.map(probability); return { cost1: values[0]!, cost3: values[1]!, cost5: values[2]! }; }
export function parseScalarConfidence(text: string): number { const x = parseObject(text); if (JSON.stringify(Object.keys(x)) !== JSON.stringify(["confidence"])) throw new Error("scalar fields do not match schema"); return probability(x.confidence); }

function average(xs: readonly number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function median(xs: readonly number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
function paired(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }
function predictions(item: ActionConfidenceItem): Array<{ block: number; cost: ActionConfidenceCost; mask: ActionMask; value: number; truth: number }> {
  if (item.interface === "compiled-scalar") { const cost = item.cost!; return [{ block: item.block, cost, mask: item.mask, value: item.prediction as number, truth: compiledChosenConfidence(qPublish(item.distribution, cost), actionFor(item.mask, cost)) }]; }
  const v = item.prediction as VectorConfidence;
  return ACTION_CONFIDENCE_COSTS.map((cost) => ({ block: item.block, cost, mask: item.mask, value: v[`cost${cost}` as keyof VectorConfidence], truth: compiledChosenConfidence(qPublish(item.distribution, cost), actionFor(item.mask, cost)) }));
}
function validateItem(item: ActionConfidenceItem): void {
  validateBlock(item.block); if (!ACTION_MASKS.includes(item.mask) || !ACTION_CONFIDENCE_INTERFACES.includes(item.interface)) throw new Error("invalid item factor");
  if (item.distribution.some((x, i) => Math.abs(x - ACTION_CONFIDENCE_DISTRIBUTIONS[item.block - 1]![i]!) > 1e-12)) throw new Error("distribution mismatch");
  if (!/^[0-9a-f]{64}$/.test(item.promptHash)) throw new Error("invalid prompt hash");
  if (item.interface === "compiled-scalar") { if (!ACTION_CONFIDENCE_COSTS.includes(item.cost!)) throw new Error("scalar cost missing"); probability(item.prediction); }
  else { if (item.cost !== null) throw new Error("vector cost must be null"); const v = item.prediction as VectorConfidence; if (JSON.stringify(Object.keys(v).sort()) !== JSON.stringify(["cost1", "cost3", "cost5"])) throw new Error("stored vector fields do not match schema"); probability(v.cost1); probability(v.cost3); probability(v.cost5); }
}
function blockAccuracy(items: ActionConfidenceItem[], kind: ActionConfidenceInterface): number { const ps = items.filter((x) => x.interface === kind).flatMap(predictions); return average(ps.map((p) => Number(Math.abs(p.value - p.truth) <= 0.0200000001))); }

export function buildActionConfidenceReport(rawBlocks: ActionConfidenceBlock[], model: string): ActionConfidenceReport {
  const seen = new Set<number>();
  for (const b of rawBlocks) {
    validateBlock(b.block); if (seen.has(b.block)) throw new Error(`duplicate block ${b.block}`); seen.add(b.block);
    if (b.apiFails || b.parseFails || b.calls !== 48 || b.items.length !== 48) throw new Error(`call invariant failed block=${b.block}`);
    b.items.forEach(validateItem);
    const keys = new Set(b.items.map((x) => `${x.interface}:${x.mask}:${x.cost ?? "v"}`)); if (keys.size !== 48) throw new Error(`duplicate/missing items block=${b.block}`);
  }
  const blocks = [...rawBlocks].sort((a, b) => a.block - b.block); const complete = blocks.length === ACTION_CONFIDENCE_DISTRIBUTIONS.length;
  const byInterface: ActionConfidenceReport["byInterface"] = {};
  for (const kind of ACTION_CONFIDENCE_INTERFACES) {
    const items = blocks.flatMap((b) => b.items).filter((x) => x.interface === kind); if (!items.length) continue;
    const ps = items.flatMap(predictions); const errors = ps.map((p) => Math.abs(p.value - p.truth));
    const complements: number[] = [];
    for (const block of blocks) for (const cost of ACTION_CONFIDENCE_COSTS) {
      const xs = ps.filter((p) => p.block === block.block && p.cost === cost); const pubs = xs.filter((p) => actionFor(p.mask, cost) === "publish"); const silents = xs.filter((p) => actionFor(p.mask, cost) === "silent");
      if (pubs.length && silents.length) complements.push(Math.abs(average(pubs.map((x) => x.value)) + average(silents.map((x) => x.value)) - 1));
    }
    const accuracy02 = average(errors.map((e) => Number(e <= 0.0200000001))); const mae = average(errors); const complementMae = average(complements);
    byInterface[kind] = { calls: items.length, predictions: ps.length, accuracy02, mae, complementMae, pass: complete && accuracy02 >= 0.95 && mae <= 0.02 && complementMae <= 0.02 };
  }
  const contrasts: Record<string, PairedEffect | null> = {};
  const contrastPairs: Array<[string, ActionConfidenceInterface, ActionConfidenceInterface]> = [["compiled-vector_minus_derived-vector", "compiled-vector", "derived-vector"], ["compiled-scalar_minus_compiled-vector", "compiled-scalar", "compiled-vector"], ["explicit-vector_minus_compiled-vector", "explicit-vector", "compiled-vector"]];
  for (const [name, a, b] of contrastPairs) contrasts[name] = blocks.length ? paired(blocks.map((block) => blockAccuracy(block.items, a) - blockAccuracy(block.items, b))) : null;
  let verdict: ActionConfidenceReport["verdict"] = "INCOMPLETE";
  if (complete) {
    const scalar = byInterface["compiled-scalar"]!.pass, vector = byInterface["compiled-vector"]!.pass, explicit = byInterface["explicit-vector"]!.pass;
    verdict = scalar && vector ? "COMPLEMENT CAPABILITY AND VECTOR INTERFACE SUPPORTED" : scalar && explicit ? "CAPABILITY PRESENT — EXPLICIT VECTOR REPAIR REQUIRED" : scalar ? "CAPABILITY ONLY — EXTERNAL VECTOR COMPILER REQUIRED" : explicit ? "EXPLICIT BRANCH INSTRUCTION REQUIRED" : "EXTERNAL DETERMINISTIC COMPILER REQUIRED";
  }
  return { study: "VBE-I-TPC-ACTION-CONFIDENCE-COMPLEMENT", status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED", frozenProtocol: "VBE-action-confidence-complement-protocol.md", model, blocks, completeBlocks: blocks.length, byInterface, contrasts, integrity: { expectedCalls: 576, retainedCalls: blocks.reduce((s, b) => s + b.calls, 0), failedCallsRetained: 0, preCompletionSchemaFailures: 2, preCompletionSuccessfulCallsExcluded: 464, archivedPartialData: "src/data/founder-action-confidence-pre-amendment2.json", schemasValid: true, balanceValid: true }, verdict, caveat: "This benchmark tests deterministic action-conditioning on known probabilities. Two disclosed schema failures triggered two transport amendments; 464 successful pre-Amendment-2 calls are archived and excluded so all analyzed blocks use one schema version. It does not test adoption forecasting, empirical calibration, causal use of confidence, reinforcement learning, participant-funded institutions, welfare, or cross-model generality.", generatedAt: new Date().toISOString() };
}
