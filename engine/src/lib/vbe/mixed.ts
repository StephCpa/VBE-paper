import { DEFAULT_PARAMS } from "./params.ts";
import { saleSlice, type SaleSlice } from "./minority.ts";
import type { RunResult } from "./types.ts";

export const STORY_IDS = [0, 1, 2, 3];
export const LABEL_IDS = [4, 5, 6, 7];

export type MixedCuts = {
  ss: SaleSlice;
  sl: SaleSlice;
  ls: SaleSlice;
  ll: SaleSlice;
  cross: SaleSlice;
  all: SaleSlice;
};

export type MixedRun = {
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  storyMean: number;
  labelMean: number;
  cuts: MixedCuts;
  result: RunResult;
};

export type MixedReport = {
  model: string;
  storyIds: number[];
  labelIds: number[];
  baselineStory: number;
  baselineLabel: number;
  runs: MixedRun[];
  pooled: MixedCuts | null;
  storyMean: number;
  labelMean: number;
  meanScore: number;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

const storySet = new Set(STORY_IDS);

export function isStory(id: number) {
  return storySet.has(id);
}

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function mixedCuts(result: RunResult, T = DEFAULT_PARAMS.T): MixedCuts {
  const ss = saleSlice(result, T, (easy, hard) => isStory(easy) && isStory(hard));
  const sl = saleSlice(result, T, (easy, hard) => isStory(easy) && !isStory(hard));
  const ls = saleSlice(result, T, (easy, hard) => !isStory(easy) && isStory(hard));
  const ll = saleSlice(result, T, (easy, hard) => !isStory(easy) && !isStory(hard));
  return {
    ss,
    sl,
    ls,
    ll,
    cross: pool([sl, ls]),
    all: saleSlice(result, T),
  };
}

export function groupMean(scores: number[], ids: number[]) {
  if (!ids.length) return 0;
  return ids.reduce((s, id) => s + (scores[id] ?? 0), 0) / ids.length;
}

function holds(s: SaleSlice) {
  return s.offers >= 2 && s.acc >= 0.3;
}

function dead(s: SaleSlice) {
  return s.offers >= 2 && s.acc < 0.15;
}

export function mixedLabel(cuts: MixedCuts): string {
  if (holds(cuts.ss) && holds(cuts.cross) && holds(cuts.ll)) return "CONTAGIOUS";
  if (holds(cuts.ss) && holds(cuts.cross) && !holds(cuts.ll)) return "INTERSUBJECTIVE";
  if (holds(cuts.ss) && !holds(cuts.cross)) return "PRIVATE FICTION";
  if (!holds(cuts.ss) && dead(cuts.ss)) return "SKEPTICS KILL";
  return "WEAK";
}

export function buildMixedReport(runs: MixedRun[]): MixedReport {
  const pooled = runs.length
    ? {
        ss: pool(runs.map((r) => r.cuts.ss)),
        sl: pool(runs.map((r) => r.cuts.sl)),
        ls: pool(runs.map((r) => r.cuts.ls)),
        ll: pool(runs.map((r) => r.cuts.ll)),
        cross: pool(runs.map((r) => r.cuts.cross)),
        all: pool(runs.map((r) => r.cuts.all)),
      }
    : null;
  const n = Math.max(1, runs.length);
  const meanScore = runs.reduce((s, r) => s + r.meanScore, 0) / n;
  const storyMean = runs.reduce((s, r) => s + r.storyMean, 0) / n;
  const labelMean = runs.reduce((s, r) => s + r.labelMean, 0) / n;
  const tag = pooled ? mixedLabel(pooled) : "incomplete";
  const notes: string[] = [
    `4 story (ids ${STORY_IDS.join(",")}) + 4 label (ids ${LABEL_IDS.join(",")}) in one economy.`,
    "Homogeneous baselines: story 14/32 (0.44), label 0/22.",
  ];
  if (pooled) {
    notes.push(
      `SS ${pooled.ss.accepts}/${pooled.ss.offers} SL ${pooled.sl.accepts}/${pooled.sl.offers} LS ${pooled.ls.accepts}/${pooled.ls.offers} LL ${pooled.ll.accepts}/${pooled.ll.offers}.`,
    );
    notes.push(`Scores story ${storyMean.toFixed(2)} vs label ${labelMean.toFixed(2)} (all ${meanScore.toFixed(2)}).`);
  }

  const prose: Record<string, string> = {
    CONTAGIOUS:
      "CONTAGIOUS — skeptics start selling marks to each other; the story leaked",
    INTERSUBJECTIVE:
      "INTERSUBJECTIVE — believers and skeptics trade marks across the cut, but skeptics do not trade with each other",
    "PRIVATE FICTION":
      "PRIVATE FICTION — mark sales stay inside the story group; not common knowledge",
    "SKEPTICS KILL":
      "SKEPTICS KILL — mixed pairing collapses even believer–believer mark trade",
    WEAK: "WEAK — mixed pairing produces some sales, below hold/kill gates",
    incomplete: "incomplete",
  };

  return {
    model: "grok-4.5",
    storyIds: STORY_IDS,
    labelIds: LABEL_IDS,
    baselineStory: 0.4375,
    baselineLabel: 0,
    runs,
    pooled,
    storyMean: runs.length ? storyMean : 0,
    labelMean: runs.length ? labelMean : 0,
    meanScore: runs.length ? meanScore : 0,
    verdict: prose[tag] ?? tag,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
