import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { runPopulation } from "./env.ts";
import { STRATEGIES } from "./robots.ts";
import type { StrategyFn, StrategyName } from "./types.ts";

export type InvasionCell = {
  name: string;
  nRuns: number;
  mutantName: StrategyName;
  mutantMean: number;
  majorityMean: number;
  mutantBeatsMajority: number;
  majorityName: StrategyName;
};

export type KPayoffCell = {
  k: number;
  nRuns: number;
  kwMean: number;
  restMean: number;
  kwBeatsRest: number;
  restName: StrategyName;
};

export type InvasionReport = {
  nRuns: number;
  cells: InvasionCell[];
  kPayoff: KPayoffCell[];
  kStar: number | null;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function mean(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
}

function mixDecide(majority: StrategyFn, mutant: StrategyFn, mutantId = 0): StrategyFn {
  return (me, partner, t, T) =>
    (me.id === mutantId ? mutant : majority)(me, partner, t, T);
}

export function invasionCell(
  majorityName: StrategyName,
  mutantName: StrategyName,
  nRuns = 80,
  params: VbeParams = DEFAULT_PARAMS,
): InvasionCell {
  const mutantScores: number[] = [];
  const majScores: number[] = [];
  let beats = 0;
  for (let seed = 0; seed < nRuns; seed++) {
    const result = runPopulation(
      seed + 1000,
      mixDecide(STRATEGIES[majorityName], STRATEGIES[mutantName], 0),
      params,
      true,
    );
    const mutant = result.scores[0]!;
    const rest = result.scores.filter((_, i) => i !== 0);
    const restMean = mean(rest);
    mutantScores.push(mutant);
    majScores.push(restMean);
    if (mutant > restMean) beats += 1;
  }
  return {
    name: `7 ${majorityName} + 1 ${mutantName}`,
    nRuns,
    mutantName,
    mutantMean: mean(mutantScores),
    majorityMean: mean(majScores),
    mutantBeatsMajority: beats / nRuns,
    majorityName,
  };
}

export function kPayoffCell(
  k: number,
  restName: StrategyName = "barter",
  nRuns = 80,
  params: VbeParams = DEFAULT_PARAMS,
): KPayoffCell {
  const robotIds = new Set(Array.from({ length: k }, (_, i) => i));
  const kwScores: number[] = [];
  const restScores: number[] = [];
  let beats = 0;
  for (let seed = 0; seed < nRuns; seed++) {
    const decide: StrategyFn = (me, partner, t, T) =>
      (robotIds.has(me.id) ? STRATEGIES.kw : STRATEGIES[restName])(me, partner, t, T);
    const result = runPopulation(seed + 2000, decide, params, true);
    const kw = mean(result.scores.filter((_, i) => robotIds.has(i)));
    const rest = mean(result.scores.filter((_, i) => !robotIds.has(i)));
    kwScores.push(kw);
    restScores.push(rest);
    if (kw > rest) beats += 1;
  }
  return {
    k,
    nRuns,
    kwMean: mean(kwScores),
    restMean: mean(restScores),
    kwBeatsRest: beats / nRuns,
    restName,
  };
}

export function buildInvasionReport(nRuns = 80, params: VbeParams = DEFAULT_PARAMS): InvasionReport {
  const cells = [
    invasionCell("altruist", "never", nRuns, params),
    invasionCell("altruist", "kw", nRuns, params),
    invasionCell("kw", "never", nRuns, params),
    invasionCell("altruist", "barter", nRuns, params),
  ];
  const kPayoff = [1, 2, 3, 4].map((k) => kPayoffCell(k, "barter", nRuns, params));
  const kStar = kPayoff.find((c) => c.kwMean > c.restMean)?.k ?? null;

  const a = cells[0]!;
  const notes = [
    `7 altruists + 1 Never: Never ${a.mutantMean.toFixed(2)} vs altruists ${a.majorityMean.toFixed(2)}, Never wins ${Math.round(a.mutantBeatsMajority * 100)}% of seeds.`,
    `k-payoff (KW among barter): ${kPayoff.map((c) => `k=${c.k} KW ${c.kwMean.toFixed(2)} vs rest ${c.restMean.toFixed(2)}`).join("; ")}.`,
  ];

  let verdict: string;
  if (a.mutantMean > a.majorityMean) {
    verdict =
      "GIFTING UNSTABLE — Never invades altruists; money is second-best and invasion-resistant, gifting is first-best and not";
  } else {
    verdict =
      "GIFTING HOLDS — Never does not outscore altruists in 7+1; the welfare ranking is also incentive-compatible here";
  }
  if (kStar === null) {
    verdict += `. k=1..4 KW does not outscore barter partners — k=2 seed-arm is below the adoption threshold`;
  } else if (kStar > 2) {
    verdict += `. KW only outscores barter at k≥${kStar}; k=2 seed-arm was below break-even`;
  } else {
    verdict += `. KW outscores barter at k=${kStar}; k=2 seed-arm was above break-even and 0/16 is about contagion`;
  }

  return {
    nRuns,
    cells,
    kPayoff,
    kStar,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
