import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import type { CoordinationSlice, EpistemicKind } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export const REACTIVITY_SEEDS = [251, 257, 263, 269, 271, 277, 281, 283] as const;
export const REACTIVITY_MODES = ["inline", "sealed-replay"] as const;
export type ReactivityMode = (typeof REACTIVITY_MODES)[number];

export type ReactivityCell = {
  delivery: EpistemicKind;
  mode: ReactivityMode;
};

const PI: ReactivityCell = { delivery: "private", mode: "inline" };
const UI: ReactivityCell = { delivery: "public", mode: "inline" };
const PS: ReactivityCell = { delivery: "private", mode: "sealed-replay" };
const US: ReactivityCell = { delivery: "public", mode: "sealed-replay" };

/** Four Williams/Latin orders, repeated twice over the eight declared seeds. */
export const REACTIVITY_ORDERS: readonly (readonly ReactivityCell[])[] = [
  [PI, UI, US, PS],
  [UI, PS, PI, US],
  [PS, US, UI, PI],
  [US, PI, PS, UI],
] as const;

export const REACTIVITY_PRIMARY_ROUNDS = { first: 5, last: 21 } as const;
export const REACTIVITY_MRES = 0.15;

export const REACTIVITY_METRICS = [
  "sellerIntentRate",
  "buyerIntentRate",
  "tradeRate",
  "meanScore",
  "pAccept",
  "pSecond",
] as const;
export type ReactivityMetric = (typeof REACTIVITY_METRICS)[number];

export type ReactivityBeliefRecord = {
  t: number;
  agentId: number;
  pAccept: number;
  pSecond: number;
  source: ReactivityMode;
};

export type ReactivityRun = {
  delivery: EpistemicKind;
  mode: ReactivityMode;
  seed: number;
  actionCalls: number;
  replayCalls: number;
  apiFails: number;
  parseFails: number;
  actionBeliefFields: number;
  replayStartedAfterEnvironment: boolean;
  robotIds: number[];
  scheduleHash: string;
  primaryRounds: { first: number; last: number };
  llmSeller: CoordinationSlice;
  llmBuyer: CoordinationSlice;
  llmLlm: CoordinationSlice;
  beliefRecords: ReactivityBeliefRecord[];
  belief: { n: number; pAccept: number; pSecond: number };
  meanScore: number;
  result: RunResult;
};

export type ReactivityCellSummary = {
  nSeeds: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  meanScore: number;
  pAccept: number;
  pSecond: number;
  actionCalls: number;
  replayCalls: number;
};

export type ReactivitySeedEffect = { seed: number } & Record<ReactivityMetric, number>;

export type ReactivityReport = {
  study: "VBE-E-REACTIVITY-PILOT";
  status: "EXPLORATORY 2x2 MECHANISM/VARIANCE PILOT — NOT CONFIRMATORY";
  frozenProtocol: "VBE-elicitation-reactivity-protocol.md";
  model: string;
  k: 2;
  robotIds: [0, 1];
  seeds: number[];
  primaryRounds: { first: number; last: number };
  minimumRelevantInteraction: number;
  cells: ReactivityCell[];
  orders: ReactivityCell[][];
  runs: ReactivityRun[];
  byCell: Partial<Record<string, ReactivityCellSummary>>;
  publicEffectsByMode: Partial<Record<ReactivityMode, ReactivitySeedEffect[]>>;
  publicEffectInference: Partial<
    Record<ReactivityMode, Partial<Record<ReactivityMetric, PairedEffect>>>
  >;
  interactions: ReactivitySeedEffect[];
  interactionInference: Partial<Record<ReactivityMetric, PairedEffect>>;
  completeBlocks: number;
  integrity: {
    failedCallsRetained: 0;
    sealedActionBeliefFields: number;
    sealedReplayCountMatchesActions: boolean;
    sealedReplayAfterEnvironment: boolean;
    scheduleMatchedBlocks: number;
  };
  verdict:
    | "INCOMPLETE"
    | "ELICITATION-REACTIVITY CANDIDATE"
    | "PUBLIC EFFECT ROBUST TO ELICITATION TIMING"
    | "INLINE ELICITATION SUPPRESSES PUBLIC EFFECT"
    | "NO LARGE REACTIVITY SIGNAL";
  caveat: string;
  generatedAt: string;
};

export function reactivityCellKey(cell: ReactivityCell): string {
  return `${cell.delivery}:${cell.mode}`;
}

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function metricValue(run: ReactivityRun, metric: ReactivityMetric): number {
  if (metric === "sellerIntentRate") return run.llmSeller.sellerIntentPerHe;
  if (metric === "buyerIntentRate") return run.llmBuyer.buyerIntentPerHe;
  if (metric === "tradeRate") return run.llmLlm.tradePerHe;
  if (metric === "meanScore") return run.meanScore;
  return run.belief[metric];
}

function summarize(runs: ReactivityRun[]): ReactivityCellSummary {
  return {
    nSeeds: runs.length,
    sellerIntentRate: average(runs.map((run) => run.llmSeller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.llmBuyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.llmLlm.tradePerHe)),
    meanScore: average(runs.map((run) => run.meanScore)),
    pAccept: average(runs.map((run) => run.belief.pAccept)),
    pSecond: average(runs.map((run) => run.belief.pSecond)),
    actionCalls: runs.reduce((sum, run) => sum + run.actionCalls, 0),
    replayCalls: runs.reduce((sum, run) => sum + run.replayCalls, 0),
  };
}

function validateRun(run: ReactivityRun): void {
  if (!REACTIVITY_SEEDS.includes(run.seed as (typeof REACTIVITY_SEEDS)[number])) {
    throw new Error(`unexpected reactivity seed ${run.seed}`);
  }
  if (!REACTIVITY_MODES.includes(run.mode)) throw new Error(`unexpected mode ${run.mode}`);
  if (run.delivery !== "private" && run.delivery !== "public") {
    throw new Error(`unexpected delivery ${run.delivery}`);
  }
  if (run.apiFails || run.parseFails) {
    throw new Error(`retained failed run ${reactivityCellKey(run)}:${run.seed}`);
  }
  if (run.beliefRecords.length !== run.actionCalls) {
    throw new Error(`belief/action count mismatch ${reactivityCellKey(run)}:${run.seed}`);
  }
  if (run.mode === "inline") {
    if (run.replayCalls !== 0) throw new Error("inline run contains replay calls");
    if (run.actionBeliefFields !== 2 * run.actionCalls) {
      throw new Error("inline action did not retain both belief fields");
    }
  } else {
    if (run.actionBeliefFields !== 0) throw new Error("sealed action contains belief fields");
    if (run.replayCalls !== run.actionCalls) throw new Error("sealed replay count mismatch");
    if (!run.replayStartedAfterEnvironment) {
      throw new Error("sealed replay started before environment completion");
    }
  }
}

function pairedPublicEffects(
  runs: ReactivityRun[],
  mode: ReactivityMode,
): ReactivitySeedEffect[] {
  const privateBySeed = new Map(
    runs
      .filter((run) => run.mode === mode && run.delivery === "private")
      .map((run) => [run.seed, run]),
  );
  return runs
    .filter(
      (run) => run.mode === mode && run.delivery === "public" && privateBySeed.has(run.seed),
    )
    .map((publicRun) => {
      const privateRun = privateBySeed.get(publicRun.seed)!;
      if (publicRun.scheduleHash !== privateRun.scheduleHash) {
        throw new Error(`public/private schedule mismatch mode=${mode} seed=${publicRun.seed}`);
      }
      const values = Object.fromEntries(
        REACTIVITY_METRICS.map((metric) => [
          metric,
          metricValue(publicRun, metric) - metricValue(privateRun, metric),
        ]),
      ) as Record<ReactivityMetric, number>;
      return { seed: publicRun.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);
}

function inference(
  effects: ReactivitySeedEffect[],
): Partial<Record<ReactivityMetric, PairedEffect>> {
  return Object.fromEntries(
    REACTIVITY_METRICS.map((metric) => [
      metric,
      effects.length ? pairedEffect(effects.map((effect) => effect[metric])) : undefined,
    ]).filter((entry) => entry[1] !== undefined),
  ) as Partial<Record<ReactivityMetric, PairedEffect>>;
}

export function buildReactivityReport(
  rawRuns: ReactivityRun[],
  model: string,
): ReactivityReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${reactivityCellKey(run)}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate reactivity run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || reactivityCellKey(a).localeCompare(reactivityCellKey(b)),
  );
  const cells: ReactivityCell[] = [PI, UI, PS, US];
  const byCell: ReactivityReport["byCell"] = {};
  for (const cell of cells) {
    const selected = runs.filter(
      (run) => run.delivery === cell.delivery && run.mode === cell.mode,
    );
    if (selected.length) byCell[reactivityCellKey(cell)] = summarize(selected);
  }

  const publicEffectsByMode: ReactivityReport["publicEffectsByMode"] = {};
  const publicEffectInference: ReactivityReport["publicEffectInference"] = {};
  for (const mode of REACTIVITY_MODES) {
    const effects = pairedPublicEffects(runs, mode);
    if (effects.length) {
      publicEffectsByMode[mode] = effects;
      publicEffectInference[mode] = inference(effects);
    }
  }

  const inlineBySeed = new Map(
    (publicEffectsByMode.inline ?? []).map((effect) => [effect.seed, effect]),
  );
  const interactions = (publicEffectsByMode["sealed-replay"] ?? [])
    .filter((sealed) => inlineBySeed.has(sealed.seed))
    .map((sealed) => {
      const inline = inlineBySeed.get(sealed.seed)!;
      const values = Object.fromEntries(
        REACTIVITY_METRICS.map((metric) => [metric, inline[metric] - sealed[metric]]),
      ) as Record<ReactivityMetric, number>;
      return { seed: sealed.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);
  const interactionInference = inference(interactions);
  const completeBlocks = interactions.length;
  for (const seed of interactions.map((item) => item.seed)) {
    const block = runs.filter((run) => run.seed === seed);
    const hashes = new Set(block.map((run) => run.scheduleHash));
    if (block.length !== 4 || hashes.size !== 1) {
      throw new Error(`four-cell schedule mismatch seed=${seed}`);
    }
  }

  let verdict: ReactivityReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === REACTIVITY_SEEDS.length) {
    const inlinePublic = publicEffectInference.inline?.buyerIntentRate?.mean ?? 0;
    const sealedPublic =
      publicEffectInference["sealed-replay"]?.buyerIntentRate?.mean ?? 0;
    const interaction = interactionInference.buyerIntentRate?.mean ?? 0;
    if (
      inlinePublic >= REACTIVITY_MRES &&
      sealedPublic < 0.1 &&
      interaction >= REACTIVITY_MRES
    ) {
      verdict = "ELICITATION-REACTIVITY CANDIDATE";
    } else if (inlinePublic >= REACTIVITY_MRES && sealedPublic >= REACTIVITY_MRES) {
      verdict = "PUBLIC EFFECT ROBUST TO ELICITATION TIMING";
    } else if (interaction <= -REACTIVITY_MRES) {
      verdict = "INLINE ELICITATION SUPPRESSES PUBLIC EFFECT";
    } else {
      verdict = "NO LARGE REACTIVITY SIGNAL";
    }
  }

  const sealedRuns = runs.filter((run) => run.mode === "sealed-replay");
  return {
    study: "VBE-E-REACTIVITY-PILOT",
    status: "EXPLORATORY 2x2 MECHANISM/VARIANCE PILOT — NOT CONFIRMATORY",
    frozenProtocol: "VBE-elicitation-reactivity-protocol.md",
    model,
    k: 2,
    robotIds: [0, 1],
    seeds: [...REACTIVITY_SEEDS],
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    minimumRelevantInteraction: REACTIVITY_MRES,
    cells,
    orders: REACTIVITY_ORDERS.map((order) => order.map((cell) => ({ ...cell }))),
    runs,
    byCell,
    publicEffectsByMode,
    publicEffectInference,
    interactions,
    interactionInference,
    completeBlocks,
    integrity: {
      failedCallsRetained: 0,
      sealedActionBeliefFields: sealedRuns.reduce(
        (sum, run) => sum + run.actionBeliefFields,
        0,
      ),
      sealedReplayCountMatchesActions: sealedRuns.every(
        (run) => run.replayCalls === run.actionCalls,
      ),
      sealedReplayAfterEnvironment: sealedRuns.every(
        (run) => run.replayStartedAfterEnvironment,
      ),
      scheduleMatchedBlocks: completeBlocks,
    },
    verdict,
    caveat:
      "The primary outcome is action reactivity, not belief validity. pAccept and pSecond reproduce the known midpoint-prone interface and are diagnostic only. This internally frozen eight-seed pilot is not externally preregistered and cannot confirm the selected mechanism.",
    generatedAt: new Date().toISOString(),
  };
}
