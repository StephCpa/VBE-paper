import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import {
  REACTIVITY_METRICS,
  REACTIVITY_MODES,
  REACTIVITY_PRIMARY_ROUNDS,
  REACTIVITY_SEEDS,
  reactivityCellKey,
  type ReactivityCell,
  type ReactivityCellSummary,
  type ReactivityMetric,
  type ReactivityMode,
  type ReactivityRun,
  type ReactivitySeedEffect,
} from "./epistemic-reactivity.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";

export const REACTIVITY_CONFIRMATORY_SEEDS = [
  293, 307, 311, 313, 317, 331, 337, 347,
  349, 353, 359, 367, 373, 379, 383, 389,
] as const;

export const PRIOR_LLM_EXPERIMENT_SEEDS = [
  17, 29, 41, 53, 67, 71, 83, 97, 101, 103, 107, 109,
  113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197,
  199, 211, 223, 227, 229, 233, 239, 241,
  ...REACTIVITY_SEEDS,
] as const;

export const REACTIVITY_CONFIRMATORY_MRES = 0.15;
export const REACTIVITY_CONFIRMATORY_ALPHA = 0.025;
export const REACTIVITY_CONFIRMATORY_INLINE_FLOOR = 0.15;
export const REACTIVITY_CONFIRMATORY_SEALED_CEILING = 0.10;

export type ReactivityConfirmatoryEffect = PairedEffect & {
  minimumRelevantEffect: number;
  centeredOneSidedP: number | null;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type ReactivityConfirmatoryReport = {
  study: "VBE-E-REACTIVITY-CONFIRMATORY";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-elicitation-reactivity-confirmatory-protocol.md";
  model: string;
  k: 2;
  robotIds: [0, 1];
  seeds: number[];
  primaryRounds: { first: number; last: number };
  minimumRelevantInteraction: number;
  alpha: number;
  directionGuardrails: {
    inlinePublicEffectFloor: number;
    sealedPublicEffectCeiling: number;
    inlineObserved: number | null;
    sealedObserved: number | null;
    pass: boolean;
  };
  runs: ReactivityRun[];
  byCell: Partial<Record<string, ReactivityCellSummary>>;
  publicEffectsByMode: Partial<Record<ReactivityMode, ReactivitySeedEffect[]>>;
  publicEffectInference: Partial<
    Record<ReactivityMode, Partial<Record<ReactivityMetric, PairedEffect>>>
  >;
  interactions: ReactivitySeedEffect[];
  interactionInference: Partial<Record<ReactivityMetric, PairedEffect>>;
  primary: ReactivityConfirmatoryEffect | null;
  completeBlocks: number;
  integrity: {
    failedCallsRetained: 0;
    sealedActionBeliefFields: number;
    sealedReplayCountMatchesActions: boolean;
    sealedReplayAfterEnvironment: boolean;
    scheduleMatchedBlocks: number;
    pilotSeedOverlap: number;
  };
  verdict:
    | "INCOMPLETE"
    | "SUPPORTED"
    | "PRIMARY INTERACTION WITHOUT DIRECTIONAL FIDELITY"
    | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

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

function validateRun(run: ReactivityRun): void {
  if (!REACTIVITY_CONFIRMATORY_SEEDS.includes(
    run.seed as (typeof REACTIVITY_CONFIRMATORY_SEEDS)[number],
  )) {
    throw new Error(`unexpected reactivity-confirmatory seed ${run.seed}`);
  }
  if (!REACTIVITY_MODES.includes(run.mode)) throw new Error(`unexpected mode ${run.mode}`);
  if (run.delivery !== "private" && run.delivery !== "public") {
    throw new Error(`unexpected delivery ${run.delivery}`);
  }
  if (run.apiFails || run.parseFails) {
    throw new Error(`retained failed confirmatory run ${reactivityCellKey(run)}:${run.seed}`);
  }
  if (run.beliefRecords.length !== run.actionCalls) {
    throw new Error(`belief/action count mismatch ${reactivityCellKey(run)}:${run.seed}`);
  }
  if (
    run.primaryRounds.first !== REACTIVITY_PRIMARY_ROUNDS.first ||
    run.primaryRounds.last !== REACTIVITY_PRIMARY_ROUNDS.last
  ) {
    throw new Error(`primary window mismatch ${reactivityCellKey(run)}:${run.seed}`);
  }
  if (JSON.stringify(run.robotIds) !== JSON.stringify([0, 1])) {
    throw new Error(`robot set mismatch ${reactivityCellKey(run)}:${run.seed}`);
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

function primaryEffect(interactions: ReactivitySeedEffect[]): ReactivityConfirmatoryEffect | null {
  if (!interactions.length) return null;
  const values = interactions.map((item) => ({
    seed: item.seed,
    delta: item.buyerIntentRate,
  }));
  const deltas = values.map((item) => item.delta);
  const summary = pairedEffect(deltas);
  const centeredOneSidedP = exactUpperSignFlipP(deltas, REACTIVITY_CONFIRMATORY_MRES);
  return {
    ...summary,
    minimumRelevantEffect: REACTIVITY_CONFIRMATORY_MRES,
    centeredOneSidedP,
    passes:
      summary.mean > REACTIVITY_CONFIRMATORY_MRES &&
      centeredOneSidedP !== null &&
      centeredOneSidedP <= REACTIVITY_CONFIRMATORY_ALPHA,
    values,
  };
}

export function buildReactivityConfirmatoryReport(
  rawRuns: ReactivityRun[],
  model: string,
): ReactivityConfirmatoryReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${reactivityCellKey(run)}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate reactivity-confirmatory run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || reactivityCellKey(a).localeCompare(reactivityCellKey(b)),
  );
  const cells: ReactivityCell[] = [
    { delivery: "private", mode: "inline" },
    { delivery: "public", mode: "inline" },
    { delivery: "private", mode: "sealed-replay" },
    { delivery: "public", mode: "sealed-replay" },
  ];
  const byCell: ReactivityConfirmatoryReport["byCell"] = {};
  for (const cell of cells) {
    const selected = runs.filter(
      (run) => run.delivery === cell.delivery && run.mode === cell.mode,
    );
    if (selected.length) byCell[reactivityCellKey(cell)] = summarize(selected);
  }

  const publicEffectsByMode: ReactivityConfirmatoryReport["publicEffectsByMode"] = {};
  const publicEffectInference: ReactivityConfirmatoryReport["publicEffectInference"] = {};
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
  const primary = primaryEffect(interactions);
  const completeBlocks = interactions.length;
  for (const seed of interactions.map((item) => item.seed)) {
    const block = runs.filter((run) => run.seed === seed);
    const hashes = new Set(block.map((run) => run.scheduleHash));
    if (block.length !== 4 || hashes.size !== 1) {
      throw new Error(`four-cell schedule mismatch seed=${seed}`);
    }
  }

  const inlineObserved = publicEffectInference.inline?.buyerIntentRate?.mean ?? null;
  const sealedObserved =
    publicEffectInference["sealed-replay"]?.buyerIntentRate?.mean ?? null;
  const guardrailPass =
    inlineObserved !== null &&
    sealedObserved !== null &&
    inlineObserved >= REACTIVITY_CONFIRMATORY_INLINE_FLOOR &&
    sealedObserved < REACTIVITY_CONFIRMATORY_SEALED_CEILING;

  let verdict: ReactivityConfirmatoryReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === REACTIVITY_CONFIRMATORY_SEEDS.length) {
    if (!primary?.passes) verdict = "NOT SUPPORTED";
    else if (!guardrailPass) verdict = "PRIMARY INTERACTION WITHOUT DIRECTIONAL FIDELITY";
    else verdict = "SUPPORTED";
  }

  const sealedRuns = runs.filter((run) => run.mode === "sealed-replay");
  const pilotSeedOverlap = REACTIVITY_CONFIRMATORY_SEEDS.filter((seed) =>
    PRIOR_LLM_EXPERIMENT_SEEDS.includes(
      seed as (typeof PRIOR_LLM_EXPERIMENT_SEEDS)[number],
    ),
  ).length;
  if (pilotSeedOverlap) throw new Error("confirmatory seed set overlaps a prior LLM experiment");

  return {
    study: "VBE-E-REACTIVITY-CONFIRMATORY",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-elicitation-reactivity-confirmatory-protocol.md",
    model,
    k: 2,
    robotIds: [0, 1],
    seeds: [...REACTIVITY_CONFIRMATORY_SEEDS],
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    minimumRelevantInteraction: REACTIVITY_CONFIRMATORY_MRES,
    alpha: REACTIVITY_CONFIRMATORY_ALPHA,
    directionGuardrails: {
      inlinePublicEffectFloor: REACTIVITY_CONFIRMATORY_INLINE_FLOOR,
      sealedPublicEffectCeiling: REACTIVITY_CONFIRMATORY_SEALED_CEILING,
      inlineObserved,
      sealedObserved,
      pass: guardrailPass,
    },
    runs,
    byCell,
    publicEffectsByMode,
    publicEffectInference,
    interactions,
    interactionInference,
    primary,
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
      pilotSeedOverlap,
    },
    verdict,
    caveat:
      "This confirmation tests the full inline elicitation package, not belief semantics alone. The protocol is frozen locally before calls but is not externally timestamped, and the mutable provider alias limits temporal and cross-model generalization.",
    generatedAt: new Date().toISOString(),
  };
}
