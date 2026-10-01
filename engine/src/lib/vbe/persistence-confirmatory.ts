import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import {
  POST_FIRST_ROUND,
  POST_LAST_ROUND,
  type PersistenceArm,
  type PersistenceRun,
} from "./persistence.ts";

export const PERSISTENCE_CONFIRMATORY_SEEDS = [
  113, 127, 131, 137, 139, 149, 151, 157,
  163, 167, 173, 179, 181, 191, 193, 197,
] as const;

export const PERSISTENCE_CONFIRMATORY_ARMS = ["transient", "public-ledger"] as const;
export type PersistenceConfirmatoryArm = (typeof PERSISTENCE_CONFIRMATORY_ARMS)[number];

export const PERSISTENCE_CONFIRMATORY_MRES = 0.25;
export const PERSISTENCE_CONFIRMATORY_ALPHA = 0.025;

export type ConfirmatoryMetric = "seller" | "buyer" | "trade" | "asymmetry" | "meanScore";

export type ConfirmatoryEffect = PairedEffect & {
  minimumRelevantEffect: number;
  centeredOneSidedP: number | null;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type ConfirmatoryArmSummary = {
  n: number;
  postSeller: number;
  postBuyer: number;
  postTrade: number;
  meanScore: number;
};

export type PersistenceConfirmatoryReport = {
  study: "VBE-P-CONFIRMATORY";
  frozenProtocol: "VBE-persistence-confirmatory-protocol.md";
  model: string;
  seeds: number[];
  arms: PersistenceConfirmatoryArm[];
  primaryWindow: { first: number; last: number };
  minimumRelevantEffect: number;
  alphaPerCoPrimary: number;
  runs: PersistenceRun[];
  byArm: Partial<Record<PersistenceConfirmatoryArm, ConfirmatoryArmSummary>>;
  effects: Partial<Record<ConfirmatoryMetric, ConfirmatoryEffect>>;
  completePairs: number;
  verdict:
    | "INCOMPLETE"
    | "SUPPORTED"
    | "SEMANTIC EFFECT WITHOUT CONFIRMED ASYMMETRY"
    | "NO CONFIRMED SEMANTIC PERSISTENCE";
  generatedAt: string;
};

function average(xs: number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

/** Exact upper-tail sign-flip test for a paired location null centered at `nullValue`. */
export function exactUpperSignFlipP(xs: number[], nullValue = 0): number | null {
  if (!xs.length) return null;
  if (xs.length > 20) throw new Error("exact sign-flip enumeration is capped at 20 pairs");
  const centered = xs.map((x) => x - nullValue);
  const magnitudes = centered.map(Math.abs);
  const observed = average(centered);
  const total = 2 ** xs.length;
  let upper = 0;
  for (let mask = 0; mask < total; mask++) {
    let sum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      sum += ((mask >> i) & 1 ? 1 : -1) * magnitudes[i]!;
    }
    if (sum / xs.length >= observed - 1e-12) upper += 1;
  }
  return upper / total;
}

function isConfirmatoryArm(arm: PersistenceArm): arm is PersistenceConfirmatoryArm {
  return arm === "transient" || arm === "public-ledger";
}

function metricValue(run: PersistenceRun, metric: Exclude<ConfirmatoryMetric, "asymmetry">): number {
  if (metric === "seller") return run.windows.postReplacement.sellerIntentPerHe;
  if (metric === "buyer") return run.windows.postReplacement.buyerIntentPerHe;
  if (metric === "trade") return run.windows.postReplacement.tradePerHe;
  return run.meanScore;
}

function summarize(runs: PersistenceRun[]): ConfirmatoryArmSummary {
  return {
    n: runs.length,
    postSeller: average(runs.map((run) => run.windows.postReplacement.sellerIntentPerHe)),
    postBuyer: average(runs.map((run) => run.windows.postReplacement.buyerIntentPerHe)),
    postTrade: average(runs.map((run) => run.windows.postReplacement.tradePerHe)),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

function pairedValues(
  runs: PersistenceRun[],
  metric: ConfirmatoryMetric,
): Array<{ seed: number; delta: number }> {
  const transientBySeed = new Map(
    runs.filter((run) => run.arm === "transient").map((run) => [run.seed, run]),
  );
  return runs
    .filter((run) => run.arm === "public-ledger" && transientBySeed.has(run.seed))
    .sort((a, b) => a.seed - b.seed)
    .map((ledger) => {
      const transient = transientBySeed.get(ledger.seed)!;
      if (ledger.scheduleHash !== transient.scheduleHash) {
        throw new Error(`confirmatory schedule mismatch for seed ${ledger.seed}`);
      }
      const delta =
        metric === "asymmetry"
          ? (metricValue(ledger, "seller") - metricValue(transient, "seller")) -
            (metricValue(ledger, "trade") - metricValue(transient, "trade"))
          : metricValue(ledger, metric) - metricValue(transient, metric);
      return { seed: ledger.seed, delta };
    });
}

function effect(
  values: Array<{ seed: number; delta: number }>,
  minimumRelevantEffect: number,
): ConfirmatoryEffect {
  const deltas = values.map((item) => item.delta);
  const summary = pairedEffect(deltas);
  const centeredOneSidedP = exactUpperSignFlipP(deltas, minimumRelevantEffect);
  return {
    ...summary,
    minimumRelevantEffect,
    centeredOneSidedP,
    passes:
      summary.mean > minimumRelevantEffect &&
      centeredOneSidedP !== null &&
      centeredOneSidedP <= PERSISTENCE_CONFIRMATORY_ALPHA,
    values,
  };
}

export function buildPersistenceConfirmatoryReport(
  rawRuns: PersistenceRun[],
  model: string,
): PersistenceConfirmatoryReport {
  const expectedSeeds = new Set<number>(PERSISTENCE_CONFIRMATORY_SEEDS);
  const seen = new Set<string>();
  const runs = rawRuns.filter((run) => {
    if (!isConfirmatoryArm(run.arm)) {
      throw new Error(`unexpected confirmatory arm ${run.arm}`);
    }
    if (!expectedSeeds.has(run.seed)) {
      throw new Error(`unexpected confirmatory seed ${run.seed}`);
    }
    if (run.apiFails || run.parseFails) {
      throw new Error(`retained failed confirmatory run ${run.arm}:${run.seed}`);
    }
    const key = `${run.arm}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate confirmatory run ${key}`);
    seen.add(key);
    return true;
  });

  const byArm: PersistenceConfirmatoryReport["byArm"] = {};
  for (const arm of PERSISTENCE_CONFIRMATORY_ARMS) {
    const selected = runs.filter((run) => run.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }

  const effects: PersistenceConfirmatoryReport["effects"] = {};
  for (const metric of ["seller", "buyer", "trade", "asymmetry", "meanScore"] as const) {
    const values = pairedValues(runs, metric);
    if (!values.length) continue;
    const threshold = metric === "seller" || metric === "asymmetry"
      ? PERSISTENCE_CONFIRMATORY_MRES
      : 0;
    effects[metric] = effect(values, threshold);
  }

  const completePairs = effects.seller?.n ?? 0;
  let verdict: PersistenceConfirmatoryReport["verdict"] = "INCOMPLETE";
  if (completePairs === PERSISTENCE_CONFIRMATORY_SEEDS.length) {
    if (!effects.seller?.passes) {
      verdict = "NO CONFIRMED SEMANTIC PERSISTENCE";
    } else if (!effects.asymmetry?.passes) {
      verdict = "SEMANTIC EFFECT WITHOUT CONFIRMED ASYMMETRY";
    } else {
      verdict = "SUPPORTED";
    }
  }

  return {
    study: "VBE-P-CONFIRMATORY",
    frozenProtocol: "VBE-persistence-confirmatory-protocol.md",
    model,
    seeds: [...PERSISTENCE_CONFIRMATORY_SEEDS],
    arms: [...PERSISTENCE_CONFIRMATORY_ARMS],
    primaryWindow: { first: POST_FIRST_ROUND, last: POST_LAST_ROUND },
    minimumRelevantEffect: PERSISTENCE_CONFIRMATORY_MRES,
    alphaPerCoPrimary: PERSISTENCE_CONFIRMATORY_ALPHA,
    runs,
    byArm,
    effects,
    completePairs,
    verdict,
    generatedAt: new Date().toISOString(),
  };
}
