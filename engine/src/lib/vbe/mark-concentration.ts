import { createHash } from "node:crypto";
import { bootstrapMean95, type PairedEffect } from "./epistemic-analysis.ts";

export const MARK_CONCENTRATION_SEEDS = Array.from({ length: 512 }, (_, index) => 10001 + index);
export const CONCENTRATION_MRES = 0.5;

export type MarkAllocation = {
  kind: "diffuse" | "concentrated";
  recipientIndex: number | null;
  donorIndex: number | null;
  allocation: [number, number, number, number];
};

export const DIFFUSE_ALLOCATION: MarkAllocation = {
  kind: "diffuse",
  recipientIndex: null,
  donorIndex: null,
  allocation: [1, 1, 1, 1],
};

export const CONCENTRATED_ALLOCATIONS: MarkAllocation[] = Array.from({ length: 4 }, (_, recipientIndex) =>
  Array.from({ length: 4 }, (_, donorIndex) => ({ recipientIndex, donorIndex }))
    .filter(({ donorIndex }) => donorIndex !== recipientIndex)
    .map(({ recipientIndex, donorIndex }) => {
      const allocation: [number, number, number, number] = [1, 1, 1, 1];
      allocation[recipientIndex] = 2;
      allocation[donorIndex] = 0;
      return { kind: "concentrated" as const, recipientIndex, donorIndex, allocation };
    }),
).flat();

export type MarkConcentrationRun = {
  seed: number;
  allocation: MarkAllocation;
  supportIds: number[];
  interventionChits: number[];
  scheduleHash: string;
  preHistoryHash: string;
  futureHeMeetings: number;
  futureEligibleOpportunities: number;
  futureTrades: number;
  velocityPerMark: number;
  meanHolderCount: number;
  meanScore: number;
  markSupplyInvariant: boolean;
  mechanicalFidelity: boolean;
};

export type MarkConcentrationBlock = {
  seed: number;
  diffuse: MarkConcentrationRun;
  concentrated: MarkConcentrationRun[];
};

type MetricSummary = {
  diffuseMean: number;
  concentratedMean: number;
  effect: PairedEffect;
};

export type MarkConcentrationReport = {
  study: "VBE-C-M-MARK-CONCENTRATION";
  status: "PROJECT-INTERNAL ROBOT CAUSAL INTERVENTION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-mark-concentration-protocol.md";
  seeds: number[];
  blocks: MarkConcentrationBlock[];
  completeSeeds: number;
  metrics: {
    futureTrades: MetricSummary | null;
    velocityPerMark: MetricSummary | null;
    futureEligibleOpportunities: MetricSummary | null;
    meanHolderCount: MetricSummary | null;
    meanScore: MetricSummary | null;
  };
  integrity: {
    allocationsValid: boolean;
    schedulePaired: boolean;
    preHistoryPaired: boolean;
    markSupplyInvariant: boolean;
    mechanicalFidelity: boolean;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    magnitude: boolean;
    bootstrap: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "MARK CONCENTRATION CAUSALLY REDUCES VELOCITY" | "NO MATERIAL CONCENTRATION EFFECT";
  caveat: string;
  generatedAt: string;
};

export function markAllocationKey(allocation: MarkAllocation): string {
  return allocation.kind === "diffuse"
    ? "diffuse"
    : `concentrated:r${allocation.recipientIndex}:d${allocation.donorIndex}`;
}

export function sha256MarkConcentration(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function effect(values: number[]): PairedEffect {
  return {
    n: values.length,
    mean: average(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    positiveShare: values.filter((value) => value > 0).length / values.length,
    signFlipP: null,
    bootstrap95: bootstrapMean95(values),
  };
}

function validateAllocation(allocation: MarkAllocation): boolean {
  if (allocation.allocation.reduce((sum, value) => sum + value, 0) !== 4) return false;
  if (allocation.kind === "diffuse") return JSON.stringify(allocation.allocation) === JSON.stringify([1, 1, 1, 1]);
  return allocation.allocation.filter((value) => value === 2).length === 1
    && allocation.allocation.filter((value) => value === 1).length === 2
    && allocation.allocation.filter((value) => value === 0).length === 1
    && allocation.recipientIndex !== allocation.donorIndex;
}

function validateBlock(block: MarkConcentrationBlock): MarkConcentrationReport["integrity"] {
  const expectedKeys = new Set(CONCENTRATED_ALLOCATIONS.map(markAllocationKey));
  const actualKeys = new Set(block.concentrated.map((run) => markAllocationKey(run.allocation)));
  const runs = [block.diffuse, ...block.concentrated];
  const allocationsValid = block.seed === block.diffuse.seed
    && block.concentrated.length === 12
    && actualKeys.size === 12
    && [...expectedKeys].every((key) => actualKeys.has(key))
    && runs.every((run) => run.seed === block.seed && validateAllocation(run.allocation))
    && runs.every((run) => run.supportIds.length === 4 && new Set(run.supportIds).size === 4)
    && runs.every((run) => run.interventionChits.reduce((sum, value) => sum + value, 0) === 4);
  return {
    allocationsValid,
    schedulePaired: runs.every((run) => run.scheduleHash === block.diffuse.scheduleHash),
    preHistoryPaired: runs.every((run) => run.preHistoryHash === block.diffuse.preHistoryHash),
    markSupplyInvariant: runs.every((run) => run.markSupplyInvariant),
    mechanicalFidelity: runs.every((run) => run.mechanicalFidelity),
  };
}

function metricSummary(
  blocks: MarkConcentrationBlock[],
  metric: keyof Pick<MarkConcentrationRun, "futureTrades" | "velocityPerMark" | "futureEligibleOpportunities" | "meanHolderCount" | "meanScore">,
): MetricSummary {
  const diffuse = blocks.map((block) => block.diffuse[metric]);
  const concentrated = blocks.map((block) => average(block.concentrated.map((run) => run[metric])));
  return {
    diffuseMean: average(diffuse),
    concentratedMean: average(concentrated),
    effect: effect(concentrated.map((value, index) => value - diffuse[index]!)),
  };
}

export function buildMarkConcentrationReport(rawBlocks: MarkConcentrationBlock[]): MarkConcentrationReport {
  const seen = new Set<number>();
  for (const block of rawBlocks) {
    if (!MARK_CONCENTRATION_SEEDS.includes(block.seed)) throw new Error(`unexpected concentration seed ${block.seed}`);
    if (seen.has(block.seed)) throw new Error(`duplicate concentration seed ${block.seed}`);
    seen.add(block.seed);
  }
  const blocks = [...rawBlocks].sort((left, right) => left.seed - right.seed);
  const integrityByBlock = blocks.map(validateBlock);
  const integrity = {
    allocationsValid: integrityByBlock.every((item) => item.allocationsValid),
    schedulePaired: integrityByBlock.every((item) => item.schedulePaired),
    preHistoryPaired: integrityByBlock.every((item) => item.preHistoryPaired),
    markSupplyInvariant: integrityByBlock.every((item) => item.markSupplyInvariant),
    mechanicalFidelity: integrityByBlock.every((item) => item.mechanicalFidelity),
  };
  const complete = blocks.length === MARK_CONCENTRATION_SEEDS.length
    && MARK_CONCENTRATION_SEEDS.every((seed) => seen.has(seed));
  const metrics = blocks.length ? {
    futureTrades: metricSummary(blocks, "futureTrades"),
    velocityPerMark: metricSummary(blocks, "velocityPerMark"),
    futureEligibleOpportunities: metricSummary(blocks, "futureEligibleOpportunities"),
    meanHolderCount: metricSummary(blocks, "meanHolderCount"),
    meanScore: metricSummary(blocks, "meanScore"),
  } : {
    futureTrades: null,
    velocityPerMark: null,
    futureEligibleOpportunities: null,
    meanHolderCount: null,
    meanScore: null,
  };
  const integrityPass = Object.values(integrity).every(Boolean);
  const gates = {
    complete,
    integrity: integrityPass,
    magnitude: Boolean(metrics.futureTrades && metrics.futureTrades.effect.mean <= -CONCENTRATION_MRES),
    bootstrap: Boolean(metrics.futureTrades?.effect.bootstrap95 && metrics.futureTrades.effect.bootstrap95[1] < 0),
  };
  let verdict: MarkConcentrationReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!integrityPass) verdict = "INVALID";
    else if (gates.magnitude && gates.bootstrap) verdict = "MARK CONCENTRATION CAUSALLY REDUCES VELOCITY";
    else verdict = "NO MATERIAL CONCENTRATION EFFECT";
  }
  return {
    study: "VBE-C-M-MARK-CONCENTRATION",
    status: "PROJECT-INTERNAL ROBOT CAUSAL INTERVENTION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-mark-concentration-protocol.md",
    seeds: [...MARK_CONCENTRATION_SEEDS],
    blocks,
    completeSeeds: blocks.length,
    metrics,
    integrity,
    gates,
    verdict,
    caveat: "The population-run is the causal unit. The intervention identifies the effect of one fixed redistribution under the frozen KW robot policy, not the causal effect of early trade, an agent-level effect, an LLM mechanism, or a general monetary equilibrium.",
    generatedAt: new Date().toISOString(),
  };
}
