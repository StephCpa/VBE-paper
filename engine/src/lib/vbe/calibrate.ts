import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { finiteMean, finiteStd, runPopulation } from "./env.ts";
import { STRATEGIES, altruist, kw, type StrategyName } from "./robots.ts";
import type { StrategyFn } from "./types.ts";

export type CellReport = {
  q: number;
  R: number;
  nRuns: number;
  byStrategy: Record<
    StrategyName,
    { mean: number; std: number; accInterior: number; accEnd: number }
  >;
  mutantGap: number;
  kwBeatsNever: boolean;
  kwBeatsBarter: boolean;
  altruistNotMoney: boolean;
  mutantSucker: boolean;
  kwBeatsReciprocity: boolean;
  endgameClean: boolean;
  pass: boolean;
};

export type CalibrationReport = {
  frozen: VbeParams;
  nRuns: number;
  cells: CellReport[];
  chosen: CellReport;
  gates: { name: string; pass: boolean; detail: string }[];
  verdict: "PASS" | "FAIL";
  generatedAt: string;
};

const STRAT_ORDER: StrategyName[] = [
  "never",
  "barter",
  "reciprocity",
  "kw",
  "altruist",
];

function mixed(table: StrategyFn[]): StrategyFn {
  return (me, partner, t, T) => table[me.id]!(me, partner, t, T);
}

function mutantGap(params: VbeParams, nRuns: number): number {
  const gaps: number[] = [];
  for (let s = 1; s <= nRuns; s++) {
    const table: StrategyFn[] = Array.from({ length: params.n }, (_, i) =>
      i === 0 ? altruist : kw,
    );
    const r = runPopulation(8000 + s, mixed(table), params, false);
    const mutant = r.scores[0] ?? 0;
    const peers = r.scores.slice(1);
    const peerMean = peers.reduce((a, b) => a + b, 0) / Math.max(1, peers.length);
    gaps.push(peerMean - mutant);
  }
  return finiteMean(gaps);
}

export function evaluateCell(
  q: number,
  R: number,
  nRuns: number,
  base: VbeParams = DEFAULT_PARAMS,
): CellReport {
  const params: VbeParams = { ...base, q, R };
  const byStrategy = {} as CellReport["byStrategy"];
  for (const name of STRAT_ORDER) {
    const means: number[] = [];
    const accI: number[] = [];
    const accE: number[] = [];
    for (let s = 1; s <= nRuns; s++) {
      const r = runPopulation(1000 * s + Math.round(q * 100) + R, STRATEGIES[name], params, false);
      means.push(r.meanScore);
      accI.push(r.accInterior);
      accE.push(r.accEnd);
    }
    byStrategy[name] = {
      mean: finiteMean(means),
      std: finiteStd(means),
      accInterior: finiteMean(accI),
      accEnd: finiteMean(accE),
    };
  }
  const kwS = byStrategy.kw;
  const se = (name: StrategyName) =>
    byStrategy[name].std / Math.sqrt(Math.max(1, nRuns));
  const beats = (a: StrategyName, b: StrategyName) =>
    byStrategy[a].mean > byStrategy[b].mean + 1.64 * Math.hypot(se(a), se(b));
  const gap = mutantGap(params, Math.min(nRuns, 40));
  const kwBeatsNever = beats("kw", "never");
  const kwBeatsBarter = beats("kw", "barter");
  const altruistNotMoney = byStrategy.altruist.accInterior <= 0.1;
  const mutantSucker = gap > 0.5;
  const kwBeatsReciprocity = kwS.mean >= byStrategy.reciprocity.mean;
  const endgameClean = kwS.accInterior >= 0.7 && kwS.accEnd <= 0.08;
  const pass =
    kwBeatsNever && kwBeatsBarter && altruistNotMoney && mutantSucker && endgameClean;
  return {
    q,
    R,
    nRuns,
    byStrategy,
    mutantGap: gap,
    kwBeatsNever,
    kwBeatsBarter,
    altruistNotMoney,
    mutantSucker,
    kwBeatsReciprocity,
    endgameClean,
    pass,
  };
}

export function sweep(opts?: {
  nRuns?: number;
  qs?: number[];
  Rs?: number[];
  base?: VbeParams;
}): CalibrationReport {
  const nRuns = opts?.nRuns ?? 80;
  const qs = opts?.qs ?? [0.4, 0.5, 0.6];
  const Rs = opts?.Rs ?? [3, 4];
  const base = opts?.base ?? DEFAULT_PARAMS;
  const cells = qs.flatMap((q) => Rs.map((R) => evaluateCell(q, R, nRuns, base)));
  const passing = cells.filter((c) => c.pass);
  const chosen =
    passing.find((c) => c.q === base.q && c.R === base.R) ??
    passing[0] ??
    cells[0]!;
  const frozen: VbeParams = { ...base, q: chosen.q, R: chosen.R };
  const k = chosen.byStrategy.kw;
  const gates = [
    {
      name: "KW ≻ Never-trade",
      pass: chosen.kwBeatsNever,
      detail: `${k.mean.toFixed(2)} vs ${chosen.byStrategy.never.mean.toFixed(2)}`,
    },
    {
      name: "KW ≻ Barter",
      pass: chosen.kwBeatsBarter,
      detail: `${k.mean.toFixed(2)} vs ${chosen.byStrategy.barter.mean.toFixed(2)}`,
    },
    {
      name: "Altruist is not money",
      pass: chosen.altruistNotMoney,
      detail: `acc_int=${chosen.byStrategy.altruist.accInterior.toFixed(2)} (gifts, no marks)`,
    },
    {
      name: "Altruist mutant is a sucker",
      pass: chosen.mutantSucker,
      detail: `peer − mutant = ${chosen.mutantGap.toFixed(2)}`,
    },
    {
      name: "KW ≥ Reciprocity",
      pass: chosen.kwBeatsReciprocity,
      detail: `${k.mean.toFixed(2)} vs ${chosen.byStrategy.reciprocity.mean.toFixed(2)}`,
    },
    {
      name: "Endgame collapse (last round)",
      pass: chosen.endgameClean,
      detail: `acc_int=${k.accInterior.toFixed(2)} → acc_end=${k.accEnd.toFixed(2)}`,
    },
  ];
  return {
    frozen,
    nRuns,
    cells,
    chosen,
    gates,
    verdict: chosen.pass ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
  };
}
