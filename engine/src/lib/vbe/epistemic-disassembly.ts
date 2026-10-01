import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import {
  PRIOR_LLM_EXPERIMENT_SEEDS,
  REACTIVITY_CONFIRMATORY_SEEDS,
} from "./epistemic-reactivity-confirmatory.ts";
import { REACTIVITY_PRIMARY_ROUNDS } from "./epistemic-reactivity.ts";
import type { CoordinationSlice, EpistemicKind } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export const DISASSEMBLY_SEEDS = [397, 401, 409, 419, 421, 431, 433, 439] as const;
export const DISASSEMBLY_MODES = [
  "action-only",
  "schema-control",
  "belief-unrewarded",
  "belief-rewarded",
] as const;
export type DisassemblyMode = (typeof DISASSEMBLY_MODES)[number];

export type DisassemblyCell = {
  delivery: EpistemicKind;
  mode: DisassemblyMode;
};

export function disassemblyCellKey(cell: DisassemblyCell): string {
  return `${cell.delivery}:${cell.mode}`;
}

const BASE_ORDER: readonly DisassemblyCell[] = [
  { delivery: "private", mode: "action-only" },
  { delivery: "public", mode: "belief-rewarded" },
  { delivery: "private", mode: "schema-control" },
  { delivery: "public", mode: "belief-unrewarded" },
  { delivery: "private", mode: "belief-rewarded" },
  { delivery: "public", mode: "action-only" },
  { delivery: "private", mode: "belief-unrewarded" },
  { delivery: "public", mode: "schema-control" },
] as const;

/** Eight cyclic Latin orders: every cell occupies every sequential position once. */
export const DISASSEMBLY_ORDERS: readonly (readonly DisassemblyCell[])[] = BASE_ORDER.map(
  (_cell, shift) => [...BASE_ORDER.slice(shift), ...BASE_ORDER.slice(0, shift)],
);

export const DISASSEMBLY_MRES = 0.15;
export const DISASSEMBLY_REWARDED_FLOOR = 0.15;
export const DISASSEMBLY_CONTROL_CEILING = 0.10;
export const DISASSEMBLY_DIRECTION_COUNT = 6;

export const DISASSEMBLY_METRICS = [
  "sellerIntentRate",
  "buyerIntentRate",
  "tradeRate",
  "meanScore",
  "totalMeanScore",
  "fieldA",
  "fieldB",
] as const;
export type DisassemblyMetric = (typeof DISASSEMBLY_METRICS)[number];

export type DisassemblyAuxRecord = {
  t: number;
  agentId: number;
  fieldA: number;
  fieldB: number;
};

export type DisassemblyRun = {
  delivery: EpistemicKind;
  mode: DisassemblyMode;
  seed: number;
  calls: number;
  apiFails: number;
  parseFails: number;
  beliefFieldCount: number;
  formatFieldCount: number;
  robotIds: number[];
  scheduleHash: string;
  primaryRounds: { first: number; last: number };
  llmSeller: CoordinationSlice;
  llmBuyer: CoordinationSlice;
  llmLlm: CoordinationSlice;
  auxRecords: DisassemblyAuxRecord[];
  aux: { n: number; fieldA: number; fieldB: number };
  beliefBonus: number;
  meanScore: number;
  totalMeanScore: number;
  result: RunResult;
};

export type DisassemblyCellSummary = {
  nSeeds: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  meanScore: number;
  totalMeanScore: number;
  fieldA: number;
  fieldB: number;
  calls: number;
};

export type DisassemblySeedEffect = { seed: number } & Record<DisassemblyMetric, number>;

export const DISASSEMBLY_COMPONENTS = [
  "schema-output",
  "belief-semantics",
  "reward-text",
  "total-package",
] as const;
export type DisassemblyComponent = (typeof DISASSEMBLY_COMPONENTS)[number];

const COMPONENT_TRANSITIONS: Record<
  DisassemblyComponent,
  { from: DisassemblyMode; to: DisassemblyMode }
> = {
  "schema-output": { from: "action-only", to: "schema-control" },
  "belief-semantics": { from: "schema-control", to: "belief-unrewarded" },
  "reward-text": { from: "belief-unrewarded", to: "belief-rewarded" },
  "total-package": { from: "action-only", to: "belief-rewarded" },
};

export type ComponentScreen = {
  component: DisassemblyComponent;
  from: DisassemblyMode;
  to: DisassemblyMode;
  mean: number | null;
  nonnegativeSeeds: number;
  nonpositiveSeeds: number;
  positiveCandidate: boolean;
  negativeOffset: boolean;
};

export type DisassemblyReport = {
  study: "VBE-E-DISASSEMBLY-PILOT";
  status: "EXPLORATORY COMPONENT PILOT — PROJECT-INTERNAL FREEZE, NOT CONFIRMATORY";
  frozenProtocol: "VBE-elicitation-disassembly-protocol.md";
  model: string;
  k: 2;
  robotIds: [0, 1];
  seeds: number[];
  modes: DisassemblyMode[];
  primaryRounds: { first: number; last: number };
  minimumRelevantInteraction: number;
  runs: DisassemblyRun[];
  byCell: Partial<Record<string, DisassemblyCellSummary>>;
  publicEffectsByMode: Partial<Record<DisassemblyMode, DisassemblySeedEffect[]>>;
  publicEffectInference: Partial<
    Record<DisassemblyMode, Partial<Record<DisassemblyMetric, PairedEffect>>>
  >;
  componentEffects: Partial<Record<DisassemblyComponent, DisassemblySeedEffect[]>>;
  componentInference: Partial<
    Record<DisassemblyComponent, Partial<Record<DisassemblyMetric, PairedEffect>>>
  >;
  componentScreen: ComponentScreen[];
  bridge: {
    totalObserved: number | null;
    rewardedPublicEffect: number | null;
    controlPublicEffect: number | null;
    pass: boolean;
  };
  completeBlocks: number;
  integrity: {
    failedCallsRetained: 0;
    scheduleMatchedBlocks: number;
    priorSeedOverlap: number;
    actionOnlyExtraFields: number;
    schemaBeliefFields: number;
    beliefFormatFields: number;
  };
  verdict: string;
  caveat: string;
  generatedAt: string;
};

function average(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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
  if (!DISASSEMBLY_SEEDS.includes(run.seed as (typeof DISASSEMBLY_SEEDS)[number])) {
    throw new Error(`unexpected disassembly seed ${run.seed}`);
  }
  if (!DISASSEMBLY_MODES.includes(run.mode)) throw new Error(`unexpected mode ${run.mode}`);
  if (run.delivery !== "private" && run.delivery !== "public") {
    throw new Error(`unexpected delivery ${run.delivery}`);
  }
  if (run.apiFails || run.parseFails) {
    throw new Error(`retained failed disassembly run ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.primaryRounds.first !== 5 || run.primaryRounds.last !== 21) {
    throw new Error(`primary window mismatch ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (JSON.stringify(run.robotIds) !== JSON.stringify([0, 1])) {
    throw new Error(`robot set mismatch ${disassemblyCellKey(run)}:${run.seed}`);
  }
  if (run.mode === "action-only") {
    if (run.auxRecords.length || run.beliefFieldCount || run.formatFieldCount) {
      throw new Error("action-only run contains extra fields");
    }
  } else if (run.mode === "schema-control") {
    if (run.auxRecords.length !== run.calls || run.formatFieldCount !== 2 * run.calls) {
      throw new Error("schema-control field count mismatch");
    }
    if (run.beliefFieldCount) throw new Error("schema-control run contains belief fields");
  } else {
    if (run.auxRecords.length !== run.calls || run.beliefFieldCount !== 2 * run.calls) {
      throw new Error("belief-mode field count mismatch");
    }
    if (run.formatFieldCount) throw new Error("belief-mode run contains format fields");
  }
  if (run.mode !== "belief-rewarded" && run.beliefBonus !== 0) {
    throw new Error("non-rewarded mode contains belief bonus");
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

function pairedPublicEffects(
  runs: DisassemblyRun[],
  mode: DisassemblyMode,
): DisassemblySeedEffect[] {
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
      effects.length ? pairedEffect(effects.map((effect) => effect[metric])) : undefined,
    ]).filter((entry) => entry[1] !== undefined),
  ) as Partial<Record<DisassemblyMetric, PairedEffect>>;
}

function incrementalEffects(
  byMode: DisassemblyReport["publicEffectsByMode"],
  component: DisassemblyComponent,
): DisassemblySeedEffect[] {
  const { from, to } = COMPONENT_TRANSITIONS[component];
  const fromBySeed = new Map((byMode[from] ?? []).map((effect) => [effect.seed, effect]));
  return (byMode[to] ?? [])
    .filter((effect) => fromBySeed.has(effect.seed))
    .map((toEffect) => {
      const fromEffect = fromBySeed.get(toEffect.seed)!;
      const values = Object.fromEntries(
        DISASSEMBLY_METRICS.map((metric) => [metric, toEffect[metric] - fromEffect[metric]]),
      ) as Record<DisassemblyMetric, number>;
      return { seed: toEffect.seed, ...values };
    })
    .sort((a, b) => a.seed - b.seed);
}

export function buildDisassemblyReport(
  rawRuns: DisassemblyRun[],
  model: string,
): DisassemblyReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${disassemblyCellKey(run)}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate disassembly run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || disassemblyCellKey(a).localeCompare(disassemblyCellKey(b)),
  );
  const cells = DISASSEMBLY_MODES.flatMap((mode) => [
    { delivery: "private" as const, mode },
    { delivery: "public" as const, mode },
  ]);
  const byCell: DisassemblyReport["byCell"] = {};
  for (const cell of cells) {
    const selected = runs.filter(
      (run) => run.delivery === cell.delivery && run.mode === cell.mode,
    );
    if (selected.length) byCell[disassemblyCellKey(cell)] = summarize(selected);
  }

  const publicEffectsByMode: DisassemblyReport["publicEffectsByMode"] = {};
  const publicEffectInference: DisassemblyReport["publicEffectInference"] = {};
  for (const mode of DISASSEMBLY_MODES) {
    const effects = pairedPublicEffects(runs, mode);
    if (effects.length) {
      publicEffectsByMode[mode] = effects;
      publicEffectInference[mode] = inference(effects);
    }
  }

  const componentEffects: DisassemblyReport["componentEffects"] = {};
  const componentInference: DisassemblyReport["componentInference"] = {};
  for (const component of DISASSEMBLY_COMPONENTS) {
    const effects = incrementalEffects(publicEffectsByMode, component);
    if (effects.length) {
      componentEffects[component] = effects;
      componentInference[component] = inference(effects);
    }
  }

  const componentScreen = DISASSEMBLY_COMPONENTS.map((component) => {
    const values = (componentEffects[component] ?? []).map((effect) => effect.buyerIntentRate);
    const mean = values.length ? average(values) : null;
    const nonnegativeSeeds = values.filter((value) => value >= 0).length;
    const nonpositiveSeeds = values.filter((value) => value <= 0).length;
    const { from, to } = COMPONENT_TRANSITIONS[component];
    return {
      component,
      from,
      to,
      mean,
      nonnegativeSeeds,
      nonpositiveSeeds,
      positiveCandidate:
        component !== "total-package" &&
        values.length === DISASSEMBLY_SEEDS.length &&
        mean !== null &&
        mean >= DISASSEMBLY_MRES &&
        nonnegativeSeeds >= DISASSEMBLY_DIRECTION_COUNT,
      negativeOffset:
        component !== "total-package" &&
        values.length === DISASSEMBLY_SEEDS.length &&
        mean !== null &&
        mean <= -DISASSEMBLY_MRES &&
        nonpositiveSeeds >= DISASSEMBLY_DIRECTION_COUNT,
    };
  });

  const completeSeeds = DISASSEMBLY_SEEDS.filter((seed) => {
    const block = runs.filter((run) => run.seed === seed);
    if (block.length !== cells.length) return false;
    const hashes = new Set(block.map((run) => run.scheduleHash));
    if (hashes.size !== 1) throw new Error(`eight-cell schedule mismatch seed=${seed}`);
    return true;
  });
  const completeBlocks = completeSeeds.length;

  const totalObserved = componentInference["total-package"]?.buyerIntentRate?.mean ?? null;
  const rewardedPublicEffect =
    publicEffectInference["belief-rewarded"]?.buyerIntentRate?.mean ?? null;
  const controlPublicEffect = publicEffectInference["action-only"]?.buyerIntentRate?.mean ?? null;
  const bridgePass =
    completeBlocks === DISASSEMBLY_SEEDS.length &&
    totalObserved !== null &&
    rewardedPublicEffect !== null &&
    controlPublicEffect !== null &&
    totalObserved >= DISASSEMBLY_MRES &&
    rewardedPublicEffect >= DISASSEMBLY_REWARDED_FLOOR &&
    controlPublicEffect < DISASSEMBLY_CONTROL_CEILING;

  let verdict = "INCOMPLETE";
  if (completeBlocks === DISASSEMBLY_SEEDS.length) {
    if (!bridgePass) {
      verdict = "PACKAGE EFFECT NOT RECOVERED";
    } else {
      const positive = componentScreen.filter((screen) => screen.positiveCandidate);
      const negative = componentScreen.filter((screen) => screen.negativeOffset);
      if (positive.length > 1) verdict = "DISTRIBUTED COMPONENT CANDIDATE";
      else if (positive.length === 1) {
        const label: Record<DisassemblyComponent, string> = {
          "schema-output": "SCHEMA/OUTPUT CANDIDATE",
          "belief-semantics": "BELIEF-SEMANTICS CANDIDATE",
          "reward-text": "REWARD-TEXT CANDIDATE",
          "total-package": "TOTAL-PACKAGE CANDIDATE",
        };
        verdict = label[positive[0]!.component];
      } else {
        verdict = "DIFFUSE SUBTHRESHOLD COMPONENTS";
      }
      if (negative.length) verdict += " WITH OFFSETTING COMPONENT";
    }
  }

  const priorSeeds = new Set<number>([
    ...PRIOR_LLM_EXPERIMENT_SEEDS,
    ...REACTIVITY_CONFIRMATORY_SEEDS,
  ]);
  const priorSeedOverlap = DISASSEMBLY_SEEDS.filter((seed) => priorSeeds.has(seed)).length;
  if (priorSeedOverlap) throw new Error("disassembly seed set overlaps a prior LLM experiment");

  return {
    study: "VBE-E-DISASSEMBLY-PILOT",
    status: "EXPLORATORY COMPONENT PILOT — PROJECT-INTERNAL FREEZE, NOT CONFIRMATORY",
    frozenProtocol: "VBE-elicitation-disassembly-protocol.md",
    model,
    k: 2,
    robotIds: [0, 1],
    seeds: [...DISASSEMBLY_SEEDS],
    modes: [...DISASSEMBLY_MODES],
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    minimumRelevantInteraction: DISASSEMBLY_MRES,
    runs,
    byCell,
    publicEffectsByMode,
    publicEffectInference,
    componentEffects,
    componentInference,
    componentScreen,
    bridge: {
      totalObserved,
      rewardedPublicEffect,
      controlPublicEffect,
      pass: bridgePass,
    },
    completeBlocks,
    integrity: {
      failedCallsRetained: 0,
      scheduleMatchedBlocks: completeBlocks,
      priorSeedOverlap,
      actionOnlyExtraFields: runs
        .filter((run) => run.mode === "action-only")
        .reduce((sum, run) => sum + run.beliefFieldCount + run.formatFieldCount, 0),
      schemaBeliefFields: runs
        .filter((run) => run.mode === "schema-control")
        .reduce((sum, run) => sum + run.beliefFieldCount, 0),
      beliefFormatFields: runs
        .filter((run) => run.mode.startsWith("belief-"))
        .reduce((sum, run) => sum + run.formatFieldCount, 0),
    },
    verdict,
    caveat:
      "This eight-seed mechanism pilot screens nested package components. It is not an independent component confirmation; the increments depend on the A→B→C→D order, and the schema control cannot exactly match provider tokenization while remaining semantically neutral.",
    generatedAt: new Date().toISOString(),
  };
}
