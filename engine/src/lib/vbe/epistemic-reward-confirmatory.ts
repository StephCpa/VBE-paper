import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";
import {
  DISASSEMBLY_METRICS,
  DISASSEMBLY_SEEDS,
  disassemblyCellKey,
  type DisassemblyCell,
  type DisassemblyCellSummary,
  type DisassemblyMetric,
  type DisassemblyMode,
  type DisassemblyRun,
  type DisassemblySeedEffect,
} from "./epistemic-disassembly.ts";
import {
  PRIOR_LLM_EXPERIMENT_SEEDS,
  REACTIVITY_CONFIRMATORY_SEEDS,
} from "./epistemic-reactivity-confirmatory.ts";
import { REACTIVITY_PRIMARY_ROUNDS } from "./epistemic-reactivity.ts";

export const REWARD_CONFIRMATORY_SEEDS = [
  443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523,
  541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617,
] as const;

export const REWARD_CONFIRMATORY_MODES = [
  "belief-unrewarded",
  "belief-rewarded",
] as const;
export type RewardConfirmatoryMode = (typeof REWARD_CONFIRMATORY_MODES)[number];

const PU: DisassemblyCell = { delivery: "private", mode: "belief-unrewarded" };
const UU: DisassemblyCell = { delivery: "public", mode: "belief-unrewarded" };
const PR: DisassemblyCell = { delivery: "private", mode: "belief-rewarded" };
const UR: DisassemblyCell = { delivery: "public", mode: "belief-rewarded" };

/** Four Williams orders, repeated seven times across the 28 frozen seeds. */
export const REWARD_CONFIRMATORY_ORDERS: readonly (readonly DisassemblyCell[])[] = [
  [PU, UU, UR, PR],
  [UU, PR, PU, UR],
  [PR, UR, UU, PU],
  [UR, PU, PR, UU],
] as const;

export const REWARD_CONFIRMATORY_MRES = 0.1;
export const REWARD_CONFIRMATORY_ALPHA = 0.025;
export const REWARD_CONFIRMATORY_REWARDED_FLOOR = 0.15;
export const REWARD_CONFIRMATORY_UNREWARDED_CEILING = 0.15;

export type RewardConfirmatoryEffect = PairedEffect & {
  minimumRelevantEffect: number;
  exactUpperP: number | null;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type BeliefDiagnostic = {
  n: number;
  fieldAMean: number;
  fieldAVariance: number;
  fieldANonHalfShare: number;
  fieldBMean: number;
  fieldBVariance: number;
  fieldBNonHalfShare: number;
};

export type RewardConfirmatoryReport = {
  study: "VBE-E-REWARD-TRANSITION-CONFIRMATORY";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-reward-transition-confirmatory-protocol.md";
  model: string;
  k: 2;
  robotIds: [0, 1];
  seeds: number[];
  modes: RewardConfirmatoryMode[];
  primaryRounds: { first: number; last: number };
  minimumRelevantInteraction: number;
  alpha: number;
  runs: DisassemblyRun[];
  byCell: Partial<Record<string, DisassemblyCellSummary>>;
  beliefDiagnostics: Partial<Record<string, BeliefDiagnostic>>;
  publicEffectsByMode: Partial<Record<RewardConfirmatoryMode, DisassemblySeedEffect[]>>;
  publicEffectInference: Partial<
    Record<RewardConfirmatoryMode, Partial<Record<DisassemblyMetric, PairedEffect>>>
  >;
  interactions: DisassemblySeedEffect[];
  interactionInference: Partial<Record<DisassemblyMetric, PairedEffect>>;
  primary: RewardConfirmatoryEffect | null;
  directionGuardrails: {
    rewardedPublicEffectFloor: number;
    unrewardedPublicEffectCeiling: number;
    rewardedObserved: number | null;
    unrewardedObserved: number | null;
    pass: boolean;
  };
  completeBlocks: number;
  integrity: {
    failedCallsRetained: 0;
    scheduleMatchedBlocks: number;
    priorSeedOverlap: number;
    beliefFieldCountMatches: boolean;
    formatFieldCount: number;
    unrewardedBonus: number;
  };
  verdict:
    | "INCOMPLETE"
    | "SUPPORTED"
    | "POSITIVE INCREMENT WITHOUT DIRECTIONAL FIDELITY"
    | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function lowerBound(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid]! <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function signedSums(magnitudes: readonly number[]): number[] {
  let sums = [0];
  for (const magnitude of magnitudes) {
    const next = new Array<number>(sums.length * 2);
    for (let index = 0; index < sums.length; index++) {
      next[2 * index] = sums[index]! - magnitude;
      next[2 * index + 1] = sums[index]! + magnitude;
    }
    sums = next;
  }
  return sums;
}

function splitSignedSums(centered: readonly number[]): {
  left: number[];
  right: number[];
  observedSum: number;
  tolerance: number;
} {
  if (!centered.length) throw new Error("sign-flip test requires at least one pair");
  if (centered.length > 40) throw new Error("exact MITM sign-flip is capped at 40 pairs");
  const magnitudes = centered.map(Math.abs);
  const split = Math.floor(magnitudes.length / 2);
  const left = signedSums(magnitudes.slice(0, split));
  const right = signedSums(magnitudes.slice(split)).sort((a, b) => a - b);
  return {
    left,
    right,
    observedSum: centered.reduce((sum, value) => sum + value, 0),
    tolerance: 1e-12 * centered.length,
  };
}

/** Exact upper-tail paired sign-flip p-value using meet-in-the-middle enumeration. */
export function exactUpperSignFlipMitm(
  xs: readonly number[],
  nullValue = 0,
): number | null {
  if (!xs.length) return null;
  const { left, right, observedSum, tolerance } = splitSignedSums(
    xs.map((x) => x - nullValue),
  );
  let extreme = 0;
  for (const leftSum of left) {
    const firstExtreme = lowerBound(right, observedSum - leftSum - tolerance);
    extreme += right.length - firstExtreme;
  }
  return extreme / 2 ** xs.length;
}

/** Exact two-sided paired sign-flip p-value using meet-in-the-middle enumeration. */
export function exactTwoSidedSignFlipMitm(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const { left, right, observedSum, tolerance } = splitSignedSums(xs);
  const threshold = Math.abs(observedSum) - tolerance;
  if (threshold <= 0) return 1;
  let extreme = 0;
  for (const leftSum of left) {
    extreme += upperBound(right, -threshold - leftSum);
    extreme += right.length - lowerBound(right, threshold - leftSum);
  }
  return extreme / 2 ** xs.length;
}

export function pairedEffectMitm(xs: readonly number[]): PairedEffect {
  return {
    n: xs.length,
    mean: average(xs),
    median: median(xs),
    min: xs.length ? Math.min(...xs) : 0,
    max: xs.length ? Math.max(...xs) : 0,
    positiveShare: xs.length ? xs.filter((x) => x > 0).length / xs.length : 0,
    signFlipP: exactTwoSidedSignFlipMitm(xs),
    bootstrap95: bootstrapMean95([...xs]),
  };
}

function metricValue(run: DisassemblyRun, metric: DisassemblyMetric): number {
  if (metric === "sellerIntentRate") return run.llmSeller.sellerIntentPerHe;
  if (metric === "buyerIntentRate") return run.llmBuyer.buyerIntentPerHe;
  if (metric === "tradeRate") return run.llmLlm.tradePerHe;
  if (metric === "meanScore") return run.meanScore;
  if (metric === "totalMeanScore") return run.totalMeanScore;
  return run.aux[metric];
}

function validateRun(run: DisassemblyRun): void {
  if (!REWARD_CONFIRMATORY_SEEDS.includes(
    run.seed as (typeof REWARD_CONFIRMATORY_SEEDS)[number],
  )) throw new Error(`unexpected reward-confirmatory seed ${run.seed}`);
  if (!REWARD_CONFIRMATORY_MODES.includes(run.mode as RewardConfirmatoryMode)) {
    throw new Error(`unexpected reward-confirmatory mode ${run.mode}`);
  }
  if (run.delivery !== "private" && run.delivery !== "public") {
    throw new Error(`unexpected delivery ${run.delivery}`);
  }
  if (run.apiFails || run.parseFails) {
    throw new Error(`retained failed reward-confirmatory run ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.primaryRounds.first !== 5 || run.primaryRounds.last !== 21) {
    throw new Error(`primary window mismatch ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (JSON.stringify(run.robotIds) !== JSON.stringify([0, 1])) {
    throw new Error(`robot set mismatch ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.auxRecords.length !== run.calls || run.beliefFieldCount !== 2 * run.calls) {
    throw new Error(`belief field count mismatch ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.formatFieldCount !== 0) {
    throw new Error(`belief run contains format fields ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.mode === "belief-unrewarded" && run.beliefBonus !== 0) {
    throw new Error("unrewarded run contains belief bonus");
  }
}

function summarize(runs: DisassemblyRun[]): DisassemblyCellSummary {
  return {
    nSeeds: runs.length,
    sellerIntentRate: average(runs.map((run) => run.llmSeller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.llmBuyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.llmLlm.tradePerHe)),
    meanScore: average(runs.map((run) => run.meanScore)),
    totalMeanScore: average(runs.map((run) => run.totalMeanScore)),
    fieldA: average(runs.map((run) => run.aux.fieldA)),
    fieldB: average(runs.map((run) => run.aux.fieldB)),
    calls: runs.reduce((sum, run) => sum + run.calls, 0),
  };
}

function sampleVariance(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const center = average(xs);
  return xs.reduce((sum, x) => sum + (x - center) ** 2, 0) / (xs.length - 1);
}

function beliefDiagnostic(runs: readonly DisassemblyRun[]): BeliefDiagnostic {
  const fieldA = runs.flatMap((run) => run.auxRecords.map((record) => record.fieldA));
  const fieldB = runs.flatMap((run) => run.auxRecords.map((record) => record.fieldB));
  return {
    n: fieldA.length,
    fieldAMean: average(fieldA),
    fieldAVariance: sampleVariance(fieldA),
    fieldANonHalfShare: fieldA.length
      ? fieldA.filter((value) => Math.abs(value - 0.5) > 1e-12).length / fieldA.length
      : 0,
    fieldBMean: average(fieldB),
    fieldBVariance: sampleVariance(fieldB),
    fieldBNonHalfShare: fieldB.length
      ? fieldB.filter((value) => Math.abs(value - 0.5) > 1e-12).length / fieldB.length
      : 0,
  };
}

function pairedPublicEffects(
  runs: DisassemblyRun[],
  mode: RewardConfirmatoryMode,
): DisassemblySeedEffect[] {
  const privateBySeed = new Map(
    runs
      .filter((run) => run.mode === mode && run.delivery === "private")
      .map((run) => [run.seed, run]),
  );
  return runs
    .filter((run) => run.mode === mode && run.delivery === "public" && privateBySeed.has(run.seed))
    .map((publicRun) => {
      const privateRun = privateBySeed.get(publicRun.seed)!;
      if (publicRun.scheduleHash !== privateRun.scheduleHash) {
        throw new Error(`public/private schedule mismatch mode=${mode} seed=${publicRun.seed}`);
      }
      const values = Object.fromEntries(
        DISASSEMBLY_METRICS.map((metric) => [
          metric,
          metricValue(publicRun, metric) - metricValue(privateRun, metric),
        ]),
      ) as Record<DisassemblyMetric, number>;
      return { seed: publicRun.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);
}

function inference(
  effects: DisassemblySeedEffect[],
): Partial<Record<DisassemblyMetric, PairedEffect>> {
  return Object.fromEntries(
    DISASSEMBLY_METRICS.map((metric) => [
      metric,
      effects.length ? pairedEffectMitm(effects.map((effect) => effect[metric])) : undefined,
    ]).filter((entry) => entry[1] !== undefined),
  ) as Partial<Record<DisassemblyMetric, PairedEffect>>;
}

function primaryEffect(interactions: DisassemblySeedEffect[]): RewardConfirmatoryEffect | null {
  if (!interactions.length) return null;
  const values = interactions.map((item) => ({ seed: item.seed, delta: item.buyerIntentRate }));
  const deltas = values.map((item) => item.delta);
  const summary = pairedEffectMitm(deltas);
  const exactUpperP = exactUpperSignFlipMitm(deltas, 0);
  return {
    ...summary,
    minimumRelevantEffect: REWARD_CONFIRMATORY_MRES,
    exactUpperP,
    passes:
      summary.mean >= REWARD_CONFIRMATORY_MRES &&
      exactUpperP !== null &&
      exactUpperP <= REWARD_CONFIRMATORY_ALPHA,
    values,
  };
}

export function buildRewardConfirmatoryReport(
  rawRuns: DisassemblyRun[],
  model: string,
): RewardConfirmatoryReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${disassemblyCellKey(run)}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate reward-confirmatory run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || disassemblyCellKey(a).localeCompare(disassemblyCellKey(b)),
  );
  const cells = REWARD_CONFIRMATORY_MODES.flatMap((mode) => [
    { delivery: "private" as const, mode },
    { delivery: "public" as const, mode },
  ]);
  const byCell: RewardConfirmatoryReport["byCell"] = {};
  const beliefDiagnostics: RewardConfirmatoryReport["beliefDiagnostics"] = {};
  for (const cell of cells) {
    const selected = runs.filter(
      (run) => run.delivery === cell.delivery && run.mode === cell.mode,
    );
    if (selected.length) {
      byCell[disassemblyCellKey(cell)] = summarize(selected);
      beliefDiagnostics[disassemblyCellKey(cell)] = beliefDiagnostic(selected);
    }
  }

  const publicEffectsByMode: RewardConfirmatoryReport["publicEffectsByMode"] = {};
  const publicEffectInference: RewardConfirmatoryReport["publicEffectInference"] = {};
  for (const mode of REWARD_CONFIRMATORY_MODES) {
    const effects = pairedPublicEffects(runs, mode);
    if (effects.length) {
      publicEffectsByMode[mode] = effects;
      publicEffectInference[mode] = inference(effects);
    }
  }

  const unrewardedBySeed = new Map(
    (publicEffectsByMode["belief-unrewarded"] ?? []).map((effect) => [effect.seed, effect]),
  );
  const interactions = (publicEffectsByMode["belief-rewarded"] ?? [])
    .filter((rewarded) => unrewardedBySeed.has(rewarded.seed))
    .map((rewarded) => {
      const unrewarded = unrewardedBySeed.get(rewarded.seed)!;
      const values = Object.fromEntries(
        DISASSEMBLY_METRICS.map((metric) => [metric, rewarded[metric] - unrewarded[metric]]),
      ) as Record<DisassemblyMetric, number>;
      return { seed: rewarded.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);
  const interactionInference = inference(interactions);
  const primary = primaryEffect(interactions);

  let completeBlocks = 0;
  for (const seed of REWARD_CONFIRMATORY_SEEDS) {
    const block = runs.filter((run) => run.seed === seed);
    if (block.length === 4) {
      const keys = new Set(block.map((run) => disassemblyCellKey(run)));
      const hashes = new Set(block.map((run) => run.scheduleHash));
      if (keys.size !== 4 || hashes.size !== 1) {
        throw new Error(`four-cell schedule mismatch seed=${seed}`);
      }
      completeBlocks += 1;
    }
  }

  const rewardedObserved =
    publicEffectInference["belief-rewarded"]?.buyerIntentRate?.mean ?? null;
  const unrewardedObserved =
    publicEffectInference["belief-unrewarded"]?.buyerIntentRate?.mean ?? null;
  const guardrailPass =
    rewardedObserved !== null &&
    unrewardedObserved !== null &&
    rewardedObserved >= REWARD_CONFIRMATORY_REWARDED_FLOOR &&
    unrewardedObserved < REWARD_CONFIRMATORY_UNREWARDED_CEILING;

  let verdict: RewardConfirmatoryReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === REWARD_CONFIRMATORY_SEEDS.length) {
    if (!primary?.passes) verdict = "NOT SUPPORTED";
    else if (!guardrailPass) verdict = "POSITIVE INCREMENT WITHOUT DIRECTIONAL FIDELITY";
    else verdict = "SUPPORTED";
  }

  const priorSeeds = new Set<number>([
    ...PRIOR_LLM_EXPERIMENT_SEEDS,
    ...REACTIVITY_CONFIRMATORY_SEEDS,
    ...DISASSEMBLY_SEEDS,
  ]);
  const priorSeedOverlap = REWARD_CONFIRMATORY_SEEDS.filter((seed) => priorSeeds.has(seed)).length;
  if (priorSeedOverlap) throw new Error("reward-confirmatory seed set overlaps a prior LLM experiment");

  return {
    study: "VBE-E-REWARD-TRANSITION-CONFIRMATORY",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-reward-transition-confirmatory-protocol.md",
    model,
    k: 2,
    robotIds: [0, 1],
    seeds: [...REWARD_CONFIRMATORY_SEEDS],
    modes: [...REWARD_CONFIRMATORY_MODES],
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    minimumRelevantInteraction: REWARD_CONFIRMATORY_MRES,
    alpha: REWARD_CONFIRMATORY_ALPHA,
    runs,
    byCell,
    beliefDiagnostics,
    publicEffectsByMode,
    publicEffectInference,
    interactions,
    interactionInference,
    primary,
    directionGuardrails: {
      rewardedPublicEffectFloor: REWARD_CONFIRMATORY_REWARDED_FLOOR,
      unrewardedPublicEffectCeiling: REWARD_CONFIRMATORY_UNREWARDED_CEILING,
      rewardedObserved,
      unrewardedObserved,
      pass: guardrailPass,
    },
    completeBlocks,
    integrity: {
      failedCallsRetained: 0,
      scheduleMatchedBlocks: completeBlocks,
      priorSeedOverlap,
      beliefFieldCountMatches: runs.every(
        (run) => run.beliefFieldCount === 2 * run.calls && run.auxRecords.length === run.calls,
      ),
      formatFieldCount: runs.reduce((sum, run) => sum + run.formatFieldCount, 0),
      unrewardedBonus: runs
        .filter((run) => run.mode === "belief-unrewarded")
        .reduce((sum, run) => sum + run.beliefBonus, 0),
    },
    verdict,
    caveat:
      "This confirmation isolates the rewarded-versus-unrewarded prompt transition within one mutable provider alias. A positive result supports reward-framing reactivity, not belief truthfulness, a unique mechanism, or an effect lower bound of 0.10.",
    generatedAt: new Date().toISOString(),
  };
}
