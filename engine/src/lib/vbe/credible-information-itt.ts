import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export const CREDIBLE_INFO_SEEDS = [
  12007, 12011, 12037, 12041, 12043, 12049,
  12071, 12073, 12097, 12101, 12107, 12109,
  12113, 12119, 12143, 12149, 12157, 12161,
] as const;
export const CREDIBLE_INFO_LEVELS = [0, 2, 4] as const;
export type CredibleInfoLevel = (typeof CREDIBLE_INFO_LEVELS)[number];
export const CREDIBLE_INFO_ROBOT_IDS = [0, 1, 2, 3] as const;
export const CREDIBLE_INFO_WINDOW = { first: 5, last: 21 } as const;
export const CREDIBLE_INFO_MRES = 0.10;
export const CREDIBLE_INFO_ALPHA = 0.025;
export const CREDIBLE_INFO_DOSE_TOLERANCE = 0.05;

export const CREDIBLE_INFO_ORDERS: readonly (readonly CredibleInfoLevel[])[] = [
  [0, 2, 4],
  [0, 4, 2],
  [2, 0, 4],
  [2, 4, 0],
  [4, 0, 2],
  [4, 2, 0],
] as const;

export const CREDIBLE_INFO_METRICS = [
  "sellerIntentRate",
  "buyerIntentRate",
  "tradeRate",
  "meanScore",
] as const;
export type CredibleInfoMetric = (typeof CREDIBLE_INFO_METRICS)[number];

export type CredibleInfoRun = {
  seed: number;
  level: CredibleInfoLevel;
  calls: number;
  apiFails: number;
  parseFails: number;
  actionBeliefFields: number;
  robotIds: number[];
  scheduleHash: string;
  primaryRounds: { first: number; last: number };
  notice: string;
  llmSeller: CoordinationSlice;
  llmBuyer: CoordinationSlice;
  llmLlm: CoordinationSlice;
  meanScore: number;
  result: RunResult;
};

export type CredibleInfoSummary = {
  nSeeds: number;
  calls: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  meanScore: number;
};

export type CredibleInfoSeedEffect = {
  seed: number;
  lowToMid: Record<CredibleInfoMetric, number>;
  midToHigh: Record<CredibleInfoMetric, number>;
  lowToHigh: Record<CredibleInfoMetric, number>;
};

export type CredibleInfoPrimary = PairedEffect & {
  minimumRelevantEffect: number;
  exactUpperP: number | null;
  magnitudePass: boolean;
  exactTestPass: boolean;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type CredibleInformationReport = {
  study: "VBE-E-CREDIBLE-INFORMATION-ITT";
  status: "PROJECT-INTERNAL PROSPECTIVE ITT — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-credible-information-itt-protocol.md";
  model: string;
  seeds: number[];
  levels: number[];
  robotIds: number[];
  primaryRounds: { first: number; last: number };
  runs: CredibleInfoRun[];
  byLevel: Partial<Record<string, CredibleInfoSummary>>;
  seedEffects: CredibleInfoSeedEffect[];
  endpointInference: Partial<Record<CredibleInfoMetric, PairedEffect>>;
  midpointInference: Partial<Record<CredibleInfoMetric, PairedEffect>>;
  highAdjacentInference: Partial<Record<CredibleInfoMetric, PairedEffect>>;
  primary: CredibleInfoPrimary | null;
  completeBlocks: number;
  integrity: {
    noRetainedFailures: boolean;
    actionOnlySchema: boolean;
    scheduleMatchedBlocks: number;
    callCountMatchedBlocks: number;
    robotPolicySetMatched: boolean;
    noticeLengthsMatched: boolean;
    seedOverlap: number;
  };
  doseGuard: {
    tolerance: number;
    lowToMidObserved: number | null;
    midToHighObserved: number | null;
    pass: boolean;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    primary: boolean;
    doseOrder: boolean;
  };
  verdict:
    | "INCOMPLETE"
    | "INVALID"
    | "ACTION ITT WITH ORDERED DISCLOSURE DOSE"
    | "ACTION ITT WITHOUT ORDERED DOSE"
    | "NO MATERIAL ACTION ITT";
  caveat: string;
  generatedAt: string;
};

function average(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function metricValue(run: CredibleInfoRun, metric: CredibleInfoMetric): number {
  if (metric === "sellerIntentRate") return run.llmSeller.sellerIntentPerHe;
  if (metric === "buyerIntentRate") return run.llmBuyer.buyerIntentPerHe;
  if (metric === "tradeRate") return run.llmLlm.tradePerHe;
  return run.meanScore;
}

function summarize(runs: CredibleInfoRun[]): CredibleInfoSummary {
  return {
    nSeeds: runs.length,
    calls: runs.reduce((sum, run) => sum + run.calls, 0),
    sellerIntentRate: average(runs.map((run) => run.llmSeller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.llmBuyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.llmLlm.tradePerHe)),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

function validateRun(run: CredibleInfoRun): void {
  if (!CREDIBLE_INFO_SEEDS.includes(run.seed as (typeof CREDIBLE_INFO_SEEDS)[number])) {
    throw new Error(`unexpected credible-information seed ${run.seed}`);
  }
  if (!CREDIBLE_INFO_LEVELS.includes(run.level)) throw new Error(`unexpected level ${run.level}`);
  if (run.apiFails || run.parseFails) throw new Error(`retained failed run ${run.seed}:${run.level}`);
  if (run.actionBeliefFields !== 0) throw new Error(`belief fields retained ${run.seed}:${run.level}`);
  if (JSON.stringify(run.robotIds) !== JSON.stringify(CREDIBLE_INFO_ROBOT_IDS)) {
    throw new Error(`robot set mismatch ${run.seed}:${run.level}`);
  }
  if (
    run.primaryRounds.first !== CREDIBLE_INFO_WINDOW.first ||
    run.primaryRounds.last !== CREDIBLE_INFO_WINDOW.last
  ) throw new Error(`primary window mismatch ${run.seed}:${run.level}`);
}

function deltas(high: CredibleInfoRun, low: CredibleInfoRun): Record<CredibleInfoMetric, number> {
  return Object.fromEntries(CREDIBLE_INFO_METRICS.map((metric) => [
    metric,
    metricValue(high, metric) - metricValue(low, metric),
  ])) as Record<CredibleInfoMetric, number>;
}

function infer(
  effects: CredibleInfoSeedEffect[],
  edge: "lowToMid" | "midToHigh" | "lowToHigh",
): Partial<Record<CredibleInfoMetric, PairedEffect>> {
  return Object.fromEntries(CREDIBLE_INFO_METRICS.map((metric) => [
    metric,
    effects.length ? pairedEffect(effects.map((effect) => effect[edge][metric])) : undefined,
  ]).filter((entry) => entry[1] !== undefined)) as Partial<Record<CredibleInfoMetric, PairedEffect>>;
}

export function buildCredibleInformationReport(
  rawRuns: CredibleInfoRun[],
  model: string,
): CredibleInformationReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${run.seed}:${run.level}`;
    if (seen.has(key)) throw new Error(`duplicate credible-information run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed || a.level - b.level);
  const byLevel: CredibleInformationReport["byLevel"] = {};
  for (const level of CREDIBLE_INFO_LEVELS) {
    const selected = runs.filter((run) => run.level === level);
    if (selected.length) byLevel[String(level)] = summarize(selected);
  }

  let scheduleMatchedBlocks = 0;
  let callCountMatchedBlocks = 0;
  const seedEffects: CredibleInfoSeedEffect[] = [];
  for (const seed of CREDIBLE_INFO_SEEDS) {
    const block = CREDIBLE_INFO_LEVELS.map((level) =>
      runs.find((run) => run.seed === seed && run.level === level),
    );
    if (block.some((run) => !run)) continue;
    const [low, mid, high] = block as [CredibleInfoRun, CredibleInfoRun, CredibleInfoRun];
    if (new Set(block.map((run) => run!.scheduleHash)).size === 1) scheduleMatchedBlocks += 1;
    else throw new Error(`three-arm schedule mismatch seed=${seed}`);
    if (new Set(block.map((run) => run!.calls)).size === 1) callCountMatchedBlocks += 1;
    else throw new Error(`three-arm call-count mismatch seed=${seed}`);
    seedEffects.push({
      seed,
      lowToMid: deltas(mid, low),
      midToHigh: deltas(high, mid),
      lowToHigh: deltas(high, low),
    });
  }

  const endpointInference = infer(seedEffects, "lowToHigh");
  const midpointInference = infer(seedEffects, "lowToMid");
  const highAdjacentInference = infer(seedEffects, "midToHigh");
  const values = seedEffects.map((effect) => ({
    seed: effect.seed,
    delta: effect.lowToHigh.sellerIntentRate,
  }));
  const primarySummary = values.length ? pairedEffect(values.map((item) => item.delta)) : null;
  const exactUpperP = values.length
    ? exactUpperSignFlipMitm(values.map((item) => item.delta), 0)
    : null;
  const primary = primarySummary ? {
    ...primarySummary,
    minimumRelevantEffect: CREDIBLE_INFO_MRES,
    exactUpperP,
    magnitudePass: primarySummary.mean >= CREDIBLE_INFO_MRES,
    exactTestPass: exactUpperP !== null && exactUpperP <= CREDIBLE_INFO_ALPHA,
    passes:
      primarySummary.mean >= CREDIBLE_INFO_MRES &&
      exactUpperP !== null && exactUpperP <= CREDIBLE_INFO_ALPHA,
    values,
  } : null;

  const lowToMidObserved = midpointInference.sellerIntentRate?.mean ?? null;
  const midToHighObserved = highAdjacentInference.sellerIntentRate?.mean ?? null;
  const dosePass =
    lowToMidObserved !== null && midToHighObserved !== null &&
    lowToMidObserved >= -CREDIBLE_INFO_DOSE_TOLERANCE &&
    midToHighObserved >= -CREDIBLE_INFO_DOSE_TOLERANCE;
  const complete = seedEffects.length === CREDIBLE_INFO_SEEDS.length;
  const integrity = {
    noRetainedFailures: runs.every((run) => run.apiFails === 0 && run.parseFails === 0),
    actionOnlySchema: runs.every((run) => run.actionBeliefFields === 0),
    scheduleMatchedBlocks,
    callCountMatchedBlocks,
    robotPolicySetMatched: runs.every(
      (run) => JSON.stringify(run.robotIds) === JSON.stringify(CREDIBLE_INFO_ROBOT_IDS),
    ),
    noticeLengthsMatched: CREDIBLE_INFO_SEEDS.every((seed) => {
      const lengths = runs.filter((run) => run.seed === seed).map((run) => run.notice.length);
      return lengths.length === 0 || new Set(lengths).size === 1;
    }),
    seedOverlap: 0,
  };
  const integrityPass =
    integrity.noRetainedFailures && integrity.actionOnlySchema &&
    integrity.robotPolicySetMatched && integrity.noticeLengthsMatched &&
    (!complete || (
      scheduleMatchedBlocks === CREDIBLE_INFO_SEEDS.length &&
      callCountMatchedBlocks === CREDIBLE_INFO_SEEDS.length
    ));
  let verdict: CredibleInformationReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!integrityPass) verdict = "INVALID";
    else if (!primary?.passes) verdict = "NO MATERIAL ACTION ITT";
    else if (!dosePass) verdict = "ACTION ITT WITHOUT ORDERED DOSE";
    else verdict = "ACTION ITT WITH ORDERED DISCLOSURE DOSE";
  }

  return {
    study: "VBE-E-CREDIBLE-INFORMATION-ITT",
    status: "PROJECT-INTERNAL PROSPECTIVE ITT — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-credible-information-itt-protocol.md",
    model,
    seeds: [...CREDIBLE_INFO_SEEDS],
    levels: [...CREDIBLE_INFO_LEVELS],
    robotIds: [...CREDIBLE_INFO_ROBOT_IDS],
    primaryRounds: { ...CREDIBLE_INFO_WINDOW },
    runs,
    byLevel,
    seedEffects,
    endpointInference,
    midpointInference,
    highAdjacentInference,
    primary,
    completeBlocks: seedEffects.length,
    integrity,
    doseGuard: {
      tolerance: CREDIBLE_INFO_DOSE_TOLERANCE,
      lowToMidObserved,
      midToHighObserved,
      pass: dosePass,
    },
    gates: {
      complete,
      integrity: integrityPass,
      primary: Boolean(primary?.passes),
      doseOrder: dosePass,
    },
    verdict,
    caveat:
      "This is the ITT of a public audit-disclosure package. It does not identify latent belief, common belief, or belief mediation; framing is an allowed direct treatment path.",
    generatedAt: new Date().toISOString(),
  };
}
