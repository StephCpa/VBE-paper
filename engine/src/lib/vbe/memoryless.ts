import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { finiteMean, finiteStd, runPopulation } from "./env.ts";
import { STRATEGIES, type StrategyName } from "./robots.ts";
import { saleSlice, giftSlice, type SaleSlice } from "./minority.ts";
import { invasionCell, type InvasionCell } from "./invasion.ts";
import type { RunResult } from "./types.ts";

export const MEMORYLESS: VbeParams = { ...DEFAULT_PARAMS, K: 0 };

export const K4_LABEL_MEAN = 57.02;
export const K4_ANNOUNCE_MEAN = 57.83;
export const K4_KW_MEAN = 59.32;
export const K4_ALTRUIST_MEAN = 62.27;

export type RobotRow = {
  mean: number;
  std: number;
  accInterior: number;
  accEnd: number;
};

export type MemorylessRun = {
  kind: "label" | "announce";
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  sales: SaleSlice;
  gifts: SaleSlice;
  result: RunResult;
};

export type MemorylessReport = {
  params: VbeParams;
  robot: Record<StrategyName, RobotRow>;
  invasion: InvasionCell;
  k4: { labelMean: number; announceMean: number; kwMean: number; altruistMean: number };
  runs: MemorylessRun[];
  label: { n: number; mean: number; sales: SaleSlice; gifts: SaleSlice } | null;
  announce: { n: number; mean: number; sales: SaleSlice; gifts: SaleSlice } | null;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function robotMemoryless(nRuns = 80, params: VbeParams = MEMORYLESS) {
  const out = {} as Record<StrategyName, RobotRow>;
  for (const name of ["never", "barter", "reciprocity", "kw", "altruist"] as StrategyName[]) {
    const scores: number[] = [];
    const accI: number[] = [];
    const accE: number[] = [];
    for (let seed = 0; seed < nRuns; seed++) {
      const r = runPopulation(seed + 3000, STRATEGIES[name], params, true);
      scores.push(r.meanScore);
      accI.push(r.accInterior);
      accE.push(r.accEnd);
    }
    out[name] = {
      mean: finiteMean(scores),
      std: finiteStd(scores),
      accInterior: finiteMean(accI),
      accEnd: finiteMean(accE),
    };
  }
  return out;
}

export function buildMemorylessReport(
  runs: MemorylessRun[],
  robot: Record<StrategyName, RobotRow>,
  invasion: InvasionCell,
): MemorylessReport {
  const labelRuns = runs.filter((r) => r.kind === "label");
  const announceRuns = runs.filter((r) => r.kind === "announce");
  const summarize = (xs: MemorylessRun[]) =>
    xs.length
      ? {
          n: xs.length,
          mean: xs.reduce((s, r) => s + r.meanScore, 0) / xs.length,
          sales: pool(xs.map((r) => r.sales)),
          gifts: pool(xs.map((r) => r.gifts)),
        }
      : null;
  const label = summarize(labelRuns);
  const announce = summarize(announceRuns);

  const notes = [
    "K=0: memory wiped each meeting. Frozen q,R,n otherwise. Seed is the unit.",
    `Robots K=0: never ${robot.never.mean.toFixed(2)}, barter ${robot.barter.mean.toFixed(2)}, reciprocity ${robot.reciprocity.mean.toFixed(2)}, KW ${robot.kw.mean.toFixed(2)} (acc ${robot.kw.accInterior.toFixed(2)}), altruist ${robot.altruist.mean.toFixed(2)}.`,
    `K=4 robots KW ${K4_KW_MEAN} altruist ${K4_ALTRUIST_MEAN}.`,
    `7 altruist + 1 Never at K=0: Never ${invasion.mutantMean.toFixed(2)} vs maj ${invasion.majorityMean.toFixed(2)}.`,
  ];
  if (label) {
    notes.push(
      `Label K=0 mean ${label.mean.toFixed(2)} sales ${label.sales.accepts}/${label.sales.offers} gifts ${label.gifts.accepts}/${label.gifts.offers} (K=4 mean ${K4_LABEL_MEAN}). Per-seed ${labelRuns.map((r) => `${r.seed}:${r.meanScore.toFixed(1)}`).join(", ")}.`,
    );
  }
  if (announce) {
    notes.push(
      `Announce K=0 mean ${announce.mean.toFixed(2)} sales ${announce.sales.accepts}/${announce.sales.offers} (K=4 mean ${K4_ANNOUNCE_MEAN}). Per-seed ${announceRuns.map((r) => `${r.seed}:${r.sales.accepts}/${r.sales.offers}`).join(", ")}.`,
    );
  }

  let verdict = "incomplete";
  if (label && announce) {
    const salesHold = announceRuns.filter((r) => r.sales.acc >= 0.3).length >= 2;
    const pieFlip = announce.mean - label.mean > 1.5 && announce.mean - label.mean > 0.5;
    const pieSame = Math.abs(announce.mean - label.mean) < 1.2;
    if (salesHold && pieFlip) {
      verdict =
        "MONEY EARNS ITS KEEP — at K=0 the announcement still installs marks and now outscores the label arm";
    } else if (salesHold && pieSame) {
      verdict =
        "STILL SECOND-BEST — marks install without memory, but still do not grow the pie vs label";
    } else if (!salesHold) {
      verdict = "INSTALL NEEDS MEMORY — cheap talk does not produce mark trade when K=0";
    } else {
      verdict = "WEAK K=0 — mixed seed-level pattern";
    }
    if (robot.altruist.mean > robot.kw.mean) {
      notes.push("Unconditional gifting still tops KW without memory (altruism does not need K).");
    }
    if (Math.abs(robot.reciprocity.mean - robot.barter.mean) < 0.3) {
      notes.push("Reciprocity collapses to barter at K=0, as required.");
    }
  }

  return {
    params: MEMORYLESS,
    robot,
    invasion,
    k4: {
      labelMean: K4_LABEL_MEAN,
      announceMean: K4_ANNOUNCE_MEAN,
      kwMean: K4_KW_MEAN,
      altruistMean: K4_ALTRUIST_MEAN,
    },
    runs,
    label,
    announce,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
