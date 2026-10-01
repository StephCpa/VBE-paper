import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import type { CoordinationSlice, EpistemicKind } from "./epistemic.ts";
import {
  SHADOW_CHECKPOINTS,
  SHADOW_K,
  SHADOW_LLM_IDS,
  SHADOW_ROBOT_IDS,
  type ShadowProbeRecord,
  type ShadowSummary,
} from "./epistemic-shadow.ts";
import type { RunResult } from "./types.ts";

/**
 * Exploratory seeds declared before the first shadow Study E run. They are the
 * next eight primes above 197, the largest persistence-confirmatory seed, and
 * do not overlap any earlier VBE LLM study.
 */
export const SHADOW_PILOT_SEEDS = [199, 211, 223, 227, 229, 233, 239, 241] as const;
export const SHADOW_PRIMARY_ROUNDS = { first: 5, last: 21 } as const;
export const SHADOW_SIGNAL_THRESHOLD = 0.1;

export const SHADOW_METRICS = [
  "sellerIntentRate",
  "buyerIntentRate",
  "tradeRate",
  "selfSellRate",
  "firstShare",
  "secondShare",
  "firstMae",
  "secondMae",
  "meanScore",
] as const;

export type ShadowMetric = (typeof SHADOW_METRICS)[number];

export type ShadowStudyRun = {
  kind: EpistemicKind;
  seed: number;
  actionCalls: number;
  probeCalls: number;
  parseFails: number;
  apiFails: number;
  actionBeliefFields: number;
  robotIds: number[];
  scheduleHash: string;
  primaryRounds: { first: number; last: number };
  checkpoints: number[];
  meanScore: number;
  llmSeller: CoordinationSlice;
  llmBuyer: CoordinationSlice;
  llmLlm: CoordinationSlice;
  shadowRecords: ShadowProbeRecord[];
  shadow: ShadowSummary;
  shadowByCheckpoint: Record<string, ShadowSummary>;
  result: RunResult;
};

export type ShadowArmSummary = {
  nSeeds: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  selfSellRate: number;
  firstShare: number;
  secondShare: number;
  firstMae: number;
  secondMae: number;
  meanScore: number;
};

export type ShadowPairDelta = { seed: number } & Record<ShadowMetric, number>;

export type ShadowGateEvidence = {
  study: string;
  model: string;
  exact: number;
  n: number;
  pass: boolean;
  verdict: string;
};

export type ShadowStudyReport = {
  study: "VBE-E-SHADOW-PILOT";
  status: "EXPLORATORY VARIANCE/MECHANISM PILOT — NOT CONFIRMATORY";
  model: string;
  k: number;
  robotIds: number[];
  llmIds: number[];
  seeds: number[];
  arms: EpistemicKind[];
  primaryRounds: { first: number; last: number };
  checkpoints: number[];
  instrumentGate: ShadowGateEvidence;
  nonReactivityAudit: {
    actionPromptAskedBeliefs: false;
    shadowVisibleToAgents: false;
    shadowWrittenToMemory: false;
    actionBeliefFieldsObserved: number;
  };
  estimand: string;
  signalThreshold: number;
  runs: ShadowStudyRun[];
  byKind: Partial<Record<EpistemicKind, ShadowArmSummary>>;
  pairedDeltas: ShadowPairDelta[];
  effects: Partial<Record<ShadowMetric, PairedEffect>>;
  completePairs: number;
  verdict:
    | "INCOMPLETE"
    | "EXPLORATORY ACTION + HIGHER-ORDER SIGNAL"
    | "EXPLORATORY ACTION WITHOUT HIGHER-ORDER SIGNAL"
    | "EXPLORATORY HIGHER-ORDER WITHOUT ACTION SIGNAL"
    | "NO LARGE POSITIVE EXPLORATORY SIGNAL";
  postHocDiagnostic: {
    status: "POST-HOC — HYPOTHESIS GENERATING ONLY";
    publicBuyerSuppressionCandidate: boolean;
    buyerEffect: number | null;
    tradeEffect: number | null;
    note: string;
  };
  caveat: string;
  generatedAt: string;
};

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function metricValue(run: ShadowStudyRun, metric: ShadowMetric): number {
  if (metric === "sellerIntentRate") return run.llmSeller.sellerIntentPerHe;
  if (metric === "buyerIntentRate") return run.llmBuyer.buyerIntentPerHe;
  if (metric === "tradeRate") return run.llmLlm.tradePerHe;
  if (metric === "meanScore") return run.meanScore;
  return run.shadow[metric];
}

function summarize(runs: ShadowStudyRun[]): ShadowArmSummary {
  return {
    nSeeds: runs.length,
    sellerIntentRate: average(runs.map((run) => run.llmSeller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.llmBuyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.llmLlm.tradePerHe)),
    selfSellRate: average(runs.map((run) => run.shadow.selfSellRate)),
    firstShare: average(runs.map((run) => run.shadow.firstShare)),
    secondShare: average(runs.map((run) => run.shadow.secondShare)),
    firstMae: average(runs.map((run) => run.shadow.firstMae)),
    secondMae: average(runs.map((run) => run.shadow.secondMae)),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

function validateRun(run: ShadowStudyRun): void {
  if (!SHADOW_PILOT_SEEDS.includes(run.seed as (typeof SHADOW_PILOT_SEEDS)[number])) {
    throw new Error(`unexpected shadow-pilot seed ${run.seed}`);
  }
  if (run.kind !== "private" && run.kind !== "public") {
    throw new Error(`unexpected shadow-pilot arm ${run.kind}`);
  }
  if (run.apiFails || run.parseFails) {
    throw new Error(`retained failed shadow run ${run.kind}:${run.seed}`);
  }
  if (run.actionBeliefFields !== 0) {
    throw new Error(`action/belief contamination in ${run.kind}:${run.seed}`);
  }
  if (run.shadowRecords.length !== SHADOW_CHECKPOINTS.length * SHADOW_LLM_IDS.length) {
    throw new Error(`incomplete shadow probes in ${run.kind}:${run.seed}`);
  }
  if (run.shadow.n !== run.shadowRecords.length) {
    throw new Error(`shadow summary mismatch in ${run.kind}:${run.seed}`);
  }
}

export function buildShadowStudyReport(
  rawRuns: ShadowStudyRun[],
  model: string,
  instrumentGate: ShadowGateEvidence,
): ShadowStudyReport {
  if (!instrumentGate.pass || instrumentGate.exact !== instrumentGate.n) {
    throw new Error("shadow instrument gate did not pass exactly; pilot is blocked");
  }
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${run.kind}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate shadow run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || a.kind.localeCompare(b.kind),
  );
  const privateBySeed = new Map(
    runs.filter((run) => run.kind === "private").map((run) => [run.seed, run]),
  );
  const pairedDeltas = runs
    .filter((run) => run.kind === "public" && privateBySeed.has(run.seed))
    .map((publicRun) => {
      const privateRun = privateBySeed.get(publicRun.seed)!;
      if (publicRun.scheduleHash !== privateRun.scheduleHash) {
        throw new Error(`shadow schedule mismatch for seed ${publicRun.seed}`);
      }
      const values = Object.fromEntries(
        SHADOW_METRICS.map((metric) => [
          metric,
          metricValue(publicRun, metric) - metricValue(privateRun, metric),
        ]),
      ) as Record<ShadowMetric, number>;
      return { seed: publicRun.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);

  const byKind: ShadowStudyReport["byKind"] = {};
  for (const kind of ["private", "public"] as const) {
    const selected = runs.filter((run) => run.kind === kind);
    if (selected.length) byKind[kind] = summarize(selected);
  }
  const effects = Object.fromEntries(
    SHADOW_METRICS.map((metric) => {
      const xs = pairedDeltas.map((delta) => delta[metric]);
      return xs.length ? [metric, pairedEffect(xs)] : [metric, undefined];
    }).filter((entry) => entry[1] !== undefined),
  ) as Partial<Record<ShadowMetric, PairedEffect>>;

  const completePairs = pairedDeltas.length;
  let verdict: ShadowStudyReport["verdict"] = "INCOMPLETE";
  if (completePairs === SHADOW_PILOT_SEEDS.length) {
    const actionSignal = Math.max(
      effects.buyerIntentRate?.mean ?? 0,
      effects.tradeRate?.mean ?? 0,
    ) >= SHADOW_SIGNAL_THRESHOLD;
    const higherOrderSignal =
      (effects.secondShare?.mean ?? 0) >= SHADOW_SIGNAL_THRESHOLD;
    if (actionSignal && higherOrderSignal) {
      verdict = "EXPLORATORY ACTION + HIGHER-ORDER SIGNAL";
    } else if (actionSignal) {
      verdict = "EXPLORATORY ACTION WITHOUT HIGHER-ORDER SIGNAL";
    } else if (higherOrderSignal) {
      verdict = "EXPLORATORY HIGHER-ORDER WITHOUT ACTION SIGNAL";
    } else {
      verdict = "NO LARGE POSITIVE EXPLORATORY SIGNAL";
    }
  }

  return {
    study: "VBE-E-SHADOW-PILOT",
    status: "EXPLORATORY VARIANCE/MECHANISM PILOT — NOT CONFIRMATORY",
    model,
    k: SHADOW_K,
    robotIds: [...SHADOW_ROBOT_IDS],
    llmIds: [...SHADOW_LLM_IDS],
    seeds: [...SHADOW_PILOT_SEEDS],
    arms: ["private", "public"],
    primaryRounds: { ...SHADOW_PRIMARY_ROUNDS },
    checkpoints: [...SHADOW_CHECKPOINTS],
    instrumentGate,
    nonReactivityAudit: {
      actionPromptAskedBeliefs: false,
      shadowVisibleToAgents: false,
      shadowWrittenToMemory: false,
      actionBeliefFieldsObserved: runs.reduce(
        (sum, run) => sum + run.actionBeliefFields,
        0,
      ),
    },
    estimand:
      "paired seed-level public-minus-private effect; every outcome is averaged within seed, never pooled by meeting or probe",
    signalThreshold: SHADOW_SIGNAL_THRESHOLD,
    runs,
    byKind,
    pairedDeltas,
    effects,
    completePairs,
    verdict,
    postHocDiagnostic: {
      status: "POST-HOC — HYPOTHESIS GENERATING ONLY",
      publicBuyerSuppressionCandidate:
        completePairs === SHADOW_PILOT_SEEDS.length &&
        (effects.buyerIntentRate?.mean ?? 0) <= -SHADOW_SIGNAL_THRESHOLD,
      buyerEffect: effects.buyerIntentRate?.mean ?? null,
      tradeEffect: effects.tradeRate?.mean ?? null,
      note:
        "The negative-effect label was added after inspecting this pilot and must be tested on new seeds or in a frozen elicitation-reactivity factorial before receiving evidential weight.",
    },
    caveat:
      "This eight-pair run was designed after the original Study E belief measure failed. Its intervals and sign-flip p-values are descriptive pilot diagnostics, not preregistered confirmatory tests. The secondShare measure is a finite second-order majority forecast, not proof of infinite common knowledge or mediation.",
    generatedAt: new Date().toISOString(),
  };
}
