import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";

export const POSTERIOR_PRIORS = [0.10, 0.20, 0.35, 0.50, 0.65, 0.80] as const;
export const POSTERIOR_SIGNAL_MODELS = [
  { name: "strong", greenGivenH: 0.80, greenGivenL: 0.20 },
  { name: "moderate", greenGivenH: 0.65, greenGivenL: 0.35 },
] as const;
export const POSTERIOR_SIGNALS = ["GREEN", "RED"] as const;
export const POSTERIOR_INTERFACES = ["conditional-table", "compiled-likelihood", "explicit-odds"] as const;
export type PosteriorInterface = (typeof POSTERIOR_INTERFACES)[number];
export type PosteriorSignal = (typeof POSTERIOR_SIGNALS)[number];
export type PosteriorCase = {
  caseId: number;
  prior: number;
  signalModel: (typeof POSTERIOR_SIGNAL_MODELS)[number]["name"];
  greenGivenH: number;
  greenGivenL: number;
  observed: PosteriorSignal;
};
export type PosteriorObservation = {
  interface: PosteriorInterface;
  position: number;
  promptHash: string;
  prediction: number;
};
export type PosteriorCaseResult = {
  caseId: number;
  case: PosteriorCase;
  calls: 3;
  apiFails: number;
  parseFails: number;
  order: PosteriorInterface[];
  observations: PosteriorObservation[];
};
export type PosteriorInterfaceSummary = {
  n: number;
  accuracy02: number;
  mae: number;
  directionAccuracy: number;
  priorCopyRate: number;
  priorCopyGain: PairedEffect;
  pass: boolean;
};
export type PosteriorUpdateReport = {
  study: "VBE-I-TPU-POSTERIOR-UPDATE";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-posterior-update-protocol.md";
  model: string;
  cases: PosteriorCaseResult[];
  completeCases: number;
  byInterface: Partial<Record<PosteriorInterface, PosteriorInterfaceSummary>>;
  contrasts: Record<string, PairedEffect | null>;
  integrity: {
    expectedCalls: 72;
    retainedCalls: number;
    failedCallsRetained: 0;
    casesValid: boolean;
    schemasValid: boolean;
    orderBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "POSTERIOR UPDATE CAPABILITY SUPPORTED" | "COMPILED LIKELIHOOD REQUIRED" | "EXPLICIT ODDS REPAIR REQUIRED" | "EXTERNAL BAYES COMPILER REQUIRED";
  caveat: string;
  generatedAt: string;
};

const INTERFACE_ORDERS: readonly (readonly PosteriorInterface[])[] = [
  ["conditional-table", "compiled-likelihood", "explicit-odds"],
  ["conditional-table", "explicit-odds", "compiled-likelihood"],
  ["compiled-likelihood", "conditional-table", "explicit-odds"],
  ["compiled-likelihood", "explicit-odds", "conditional-table"],
  ["explicit-odds", "conditional-table", "compiled-likelihood"],
  ["explicit-odds", "compiled-likelihood", "conditional-table"],
] as const;

export const POSTERIOR_CASES: readonly PosteriorCase[] = POSTERIOR_PRIORS.flatMap((prior) =>
  POSTERIOR_SIGNAL_MODELS.flatMap((model) =>
    POSTERIOR_SIGNALS.map((observed) => ({
      caseId: 0,
      prior,
      signalModel: model.name,
      greenGivenH: model.greenGivenH,
      greenGivenL: model.greenGivenL,
      observed,
    })),
  ),
).map((item, index) => ({ ...item, caseId: index + 1 }));

export const TABLE_ACCURACY_FLOOR = 0.90;
export const TABLE_MAE_CEILING = 0.03;
export const COMPILED_ACCURACY_FLOOR = 0.95;
export const COMPILED_MAE_CEILING = 0.02;
export const DIRECTION_FLOOR = 0.95;
export const TABLE_COPY_CEILING = 0.10;
export const COMPILED_COPY_CEILING = 0.05;
export const PRIOR_GAIN_FLOOR = 0.10;
export const PRIOR_GAIN_LOWER_FLOOR = 0.05;

export function posteriorOrder(caseId: number): readonly PosteriorInterface[] {
  if (!Number.isInteger(caseId) || caseId < 1 || caseId > POSTERIOR_CASES.length) throw new Error(`invalid posterior case ${caseId}`);
  return INTERFACE_ORDERS[(caseId - 1) % INTERFACE_ORDERS.length]!;
}

export function likelihoodRatio(item: PosteriorCase): number {
  const h = item.observed === "GREEN" ? item.greenGivenH : 1 - item.greenGivenH;
  const l = item.observed === "GREEN" ? item.greenGivenL : 1 - item.greenGivenL;
  return h / l;
}

export function posteriorTruth(item: PosteriorCase): number {
  const odds = (item.prior / (1 - item.prior)) * likelihoodRatio(item);
  return odds / (1 + odds);
}

export function sha256Posterior(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function posteriorPrompt(kind: PosteriorInterface, item: PosteriorCase): string {
  const intro = `A future deployment has one latent state: HIGH-ADOPTION H or LOW-ADOPTION L. Before seeing a public sensor, P(H)=${item.prior.toFixed(2)} and P(L)=${(1 - item.prior).toFixed(2)}. The public sensor report is ${item.observed}. Estimate P(H | observed report).`;
  const table = `The validated sensor mechanism is P(GREEN|H)=${item.greenGivenH.toFixed(2)} and P(GREEN|L)=${item.greenGivenL.toFixed(2)}. RED is the complement in each state.`;
  const lr = likelihoodRatio(item).toFixed(8);
  let evidence: string;
  if (kind === "conditional-table") evidence = table;
  else if (kind === "compiled-likelihood") evidence = `A verified external compiler used the sensor table and reports the likelihood ratio for the observed ${item.observed}: P(${item.observed}|H)/P(${item.observed}|L)=${lr}. Update the prior using this evidence.`;
  else evidence = `A verified external compiler reports likelihood ratio LR=P(${item.observed}|H)/P(${item.observed}|L)=${lr}. Use exactly: prior_odds=P(H)/(1-P(H)); posterior_odds=prior_odds*LR; posterior=posterior_odds/(1+posterior_odds).`;
  return `${intro}\n${evidence}\nReturn JSON only: {"posterior":number}`;
}

export function parsePosterior(text: string): number {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing posterior JSON object");
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(obj)) !== JSON.stringify(["posterior"])) throw new Error("posterior fields do not match schema");
  const value = Number(obj.posterior);
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("posterior must be in [0,1]");
  return value;
}

function average(xs: readonly number[]): number { return xs.reduce((sum, x) => sum + x, 0) / xs.length; }
function median(xs: readonly number[]): number { const sorted = [...xs].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2; }
function paired(xs: number[]): PairedEffect { return { n: xs.length, mean: average(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs), positiveShare: xs.filter((x) => x > 0).length / xs.length, signFlipP: null, bootstrap95: bootstrapMean95(xs) }; }

function validateCase(result: PosteriorCaseResult): void {
  const expected = POSTERIOR_CASES[result.caseId - 1];
  if (!expected || JSON.stringify(result.case) !== JSON.stringify(expected)) throw new Error(`case mismatch ${result.caseId}`);
  if (result.calls !== 3 || result.apiFails || result.parseFails || result.observations.length !== 3) throw new Error(`call invariant failed case=${result.caseId}`);
  if (JSON.stringify(result.order) !== JSON.stringify(posteriorOrder(result.caseId))) throw new Error(`order mismatch case=${result.caseId}`);
  if (new Set(result.observations.map((x) => x.interface)).size !== 3) throw new Error(`interface coverage failed case=${result.caseId}`);
  result.observations.forEach((observation, index) => {
    if (observation.interface !== result.order[index] || observation.position !== index + 1) throw new Error(`position mismatch case=${result.caseId}`);
    if (!/^[0-9a-f]{64}$/.test(observation.promptHash)) throw new Error(`prompt hash failed case=${result.caseId}`);
    parsePosterior(JSON.stringify({ posterior: observation.prediction }));
  });
}

function observationFor(result: PosteriorCaseResult, kind: PosteriorInterface): PosteriorObservation {
  const observation = result.observations.find((x) => x.interface === kind);
  if (!observation) throw new Error(`missing ${kind} in case=${result.caseId}`);
  return observation;
}

function summarize(results: PosteriorCaseResult[], kind: PosteriorInterface): PosteriorInterfaceSummary {
  const rows = results.map((result) => {
    const prediction = observationFor(result, kind).prediction;
    const truth = posteriorTruth(result.case);
    const error = Math.abs(prediction - truth);
    const priorError = Math.abs(result.case.prior - truth);
    const expectedDirection = Math.sign(truth - result.case.prior);
    const observedDirection = Math.sign(prediction - result.case.prior);
    return { error, priorCopy: Number(Math.abs(prediction - result.case.prior) <= 0.0200000001), direction: Number(observedDirection === expectedDirection), gain: priorError - error };
  });
  const accuracy02 = average(rows.map((row) => Number(row.error <= 0.0200000001)));
  const mae = average(rows.map((row) => row.error));
  const directionAccuracy = average(rows.map((row) => row.direction));
  const priorCopyRate = average(rows.map((row) => row.priorCopy));
  const priorCopyGain = paired(rows.map((row) => row.gain));
  const table = kind === "conditional-table";
  const pass = accuracy02 >= (table ? TABLE_ACCURACY_FLOOR : COMPILED_ACCURACY_FLOOR)
    && mae <= (table ? TABLE_MAE_CEILING : COMPILED_MAE_CEILING)
    && directionAccuracy >= DIRECTION_FLOOR
    && priorCopyRate <= (table ? TABLE_COPY_CEILING : COMPILED_COPY_CEILING)
    && priorCopyGain.mean >= PRIOR_GAIN_FLOOR
    && priorCopyGain.bootstrap95![0] > PRIOR_GAIN_LOWER_FLOOR;
  return { n: rows.length, accuracy02, mae, directionAccuracy, priorCopyRate, priorCopyGain, pass };
}

export function buildPosteriorUpdateReport(rawCases: PosteriorCaseResult[], model: string): PosteriorUpdateReport {
  const seen = new Set<number>();
  for (const result of rawCases) { validateCase(result); if (seen.has(result.caseId)) throw new Error(`duplicate case ${result.caseId}`); seen.add(result.caseId); }
  const cases = [...rawCases].sort((a, b) => a.caseId - b.caseId);
  const complete = cases.length === POSTERIOR_CASES.length;
  const byInterface: PosteriorUpdateReport["byInterface"] = {};
  if (cases.length) for (const kind of POSTERIOR_INTERFACES) byInterface[kind] = summarize(cases, kind);
  const contrasts: Record<string, PairedEffect | null> = {};
  for (const [name, a, b] of [
    ["compiled-minus-table-error", "conditional-table", "compiled-likelihood"],
    ["explicit-minus-compiled-error", "compiled-likelihood", "explicit-odds"],
  ] as const) contrasts[name] = cases.length ? paired(cases.map((result) => Math.abs(observationFor(result, a).prediction - posteriorTruth(result.case)) - Math.abs(observationFor(result, b).prediction - posteriorTruth(result.case)))) : null;
  const orderBalanced = POSTERIOR_INTERFACES.every((kind) => [0, 1, 2].every((position) => cases.filter((result) => result.order[position] === kind).length === (complete ? 8 : cases.filter((result) => result.order[position] === kind).length)));
  let verdict: PosteriorUpdateReport["verdict"] = "INCOMPLETE";
  if (complete) {
    const table = byInterface["conditional-table"]!.pass;
    const compiled = byInterface["compiled-likelihood"]!.pass;
    const explicit = byInterface["explicit-odds"]!.pass;
    verdict = table ? "POSTERIOR UPDATE CAPABILITY SUPPORTED" : compiled ? "COMPILED LIKELIHOOD REQUIRED" : explicit ? "EXPLICIT ODDS REPAIR REQUIRED" : "EXTERNAL BAYES COMPILER REQUIRED";
  }
  return {
    study: "VBE-I-TPU-POSTERIOR-UPDATE",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-posterior-update-protocol.md",
    model,
    cases,
    completeCases: cases.length,
    byInterface,
    contrasts,
    integrity: { expectedCalls: 72, retainedCalls: cases.reduce((sum, item) => sum + item.calls, 0), failedCallsRetained: 0, casesValid: true, schemasValid: true, orderBalanced },
    verdict,
    caveat: "This synthetic benchmark supplies a correct binary prior and stationary signal model. It tests likelihood-to-posterior arithmetic, not real adoption forecasting, prior validity, causal use of a forecast, social belief, reinforcement learning, participant-funded institutions, welfare, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
