import { mulberry32 } from "./rng.ts";
import type { EpistemicPairDelta, EpistemicReport } from "./epistemic.ts";

export const EPISTEMIC_METRICS = [
  "sellerIntentRate",
  "buyerIntentRate",
  "tradeRate",
  "pAccept",
  "pSecond",
  "meanScore",
] as const;

export type EpistemicMetric = (typeof EPISTEMIC_METRICS)[number];

export type PairedEffect = {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  positiveShare: number;
  signFlipP: number | null;
  bootstrap95: [number, number] | null;
};

export type EpistemicInference = {
  estimand: "public-minus-private paired seed effect";
  effects: Record<EpistemicMetric, PairedEffect>;
  pilotComplete: boolean;
  confirmatoryReady: boolean;
  warning: string;
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Exact two-sided paired randomization test under sign symmetry. */
export function exactSignFlipP(xs: number[]): number | null {
  if (!xs.length) return null;
  if (xs.length > 20) {
    throw new Error("exact sign-flip enumeration is capped at 20 pairs");
  }
  const observed = Math.abs(mean(xs));
  const total = 2 ** xs.length;
  let extreme = 0;
  for (let mask = 0; mask < total; mask++) {
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
      sum += ((mask >> i) & 1 ? 1 : -1) * Math.abs(xs[i]!);
    }
    if (Math.abs(sum / xs.length) >= observed - 1e-12) extreme += 1;
  }
  return extreme / total;
}

export function bootstrapMean95(
  xs: number[],
  samples = 20_000,
  seed = 20_260_903,
): [number, number] | null {
  if (!xs.length) return null;
  if (!Number.isInteger(samples) || samples < 100) {
    throw new Error("bootstrap samples must be an integer >= 100");
  }
  const rng = mulberry32(seed);
  const means: number[] = new Array(samples);
  for (let b = 0; b < samples; b++) {
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
      sum += xs[Math.floor(rng() * xs.length)]!;
    }
    means[b] = sum / xs.length;
  }
  means.sort((a, b) => a - b);
  const low = means[Math.floor(0.025 * (samples - 1))]!;
  const high = means[Math.floor(0.975 * (samples - 1))]!;
  return [low, high];
}

export function pairedEffect(xs: number[]): PairedEffect {
  return {
    n: xs.length,
    mean: mean(xs),
    median: median(xs),
    min: xs.length ? Math.min(...xs) : 0,
    max: xs.length ? Math.max(...xs) : 0,
    positiveShare: xs.length ? xs.filter((x) => x > 0).length / xs.length : 0,
    signFlipP: exactSignFlipP(xs),
    bootstrap95: bootstrapMean95(xs),
  };
}

export function analyzeEpistemicReport(report: EpistemicReport): EpistemicInference {
  const effects = Object.fromEntries(
    EPISTEMIC_METRICS.map((metric) => [
      metric,
      pairedEffect(report.pairedDeltas.map((delta) => delta[metric])),
    ]),
  ) as Record<EpistemicMetric, PairedEffect>;
  const n = report.pairedDeltas.length;
  return {
    estimand: "public-minus-private paired seed effect",
    effects,
    pilotComplete: n >= 12,
    confirmatoryReady: false,
    warning:
      n < 12
        ? `Only ${n} paired seeds: the variance pilot is incomplete.`
        : "Variance pilot complete. Freeze a confirmatory sample size before adding new seeds; pilot effects are not confirmatory evidence.",
  };
}

export function pairDeltas(
  values: Array<{ seed: number; publicValue: number; privateValue: number }>,
): EpistemicPairDelta[] {
  return values.map(({ seed, publicValue, privateValue }) => {
    const delta = publicValue - privateValue;
    return {
      seed,
      sellerIntentRate: delta,
      buyerIntentRate: delta,
      tradeRate: delta,
      pAccept: delta,
      pSecond: delta,
      meanScore: delta,
    };
  });
}
