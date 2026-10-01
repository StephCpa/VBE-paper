import {
  LABEL_IDS,
  STORY_IDS,
  mixedLabel,
  type MixedCuts,
  type MixedRun,
} from "./mixed.ts";
import type { SaleSlice } from "./minority.ts";

export const ROSTER = `PUBLIC ROSTER. Agents #0, #1, #2, #3 received an extra note that marks can function as money: intrinsically worthless tokens that others may accept in exchange for leftover checks. Agents #4, #5, #6, #7 received only the rules. Every agent can see this roster.`;

export const SILENT_MIXED_CROSS: SaleSlice = {
  offers: 13,
  accepts: 2,
  acc: 2 / 13,
};

export type CkReport = {
  model: string;
  roster: string;
  silentCross: SaleSlice;
  runs: MixedRun[];
  pooled: MixedCuts | null;
  storyMean: number;
  labelMean: number;
  meanScore: number;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function buildCkReport(runs: MixedRun[]): CkReport {
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

  const notes = [
    `Same 4+4 split as silent mixed (story ${STORY_IDS.join(",")} / label ${LABEL_IDS.join(",")}), plus a public roster.`,
    `Silent mixed cross ${SILENT_MIXED_CROSS.accepts}/${SILENT_MIXED_CROSS.offers} (${SILENT_MIXED_CROSS.acc.toFixed(2)}).`,
  ];
  if (pooled) {
    notes.push(
      `Roster SS ${pooled.ss.accepts}/${pooled.ss.offers} SL ${pooled.sl.accepts}/${pooled.sl.offers} LS ${pooled.ls.accepts}/${pooled.ls.offers} LL ${pooled.ll.accepts}/${pooled.ll.offers} cross ${pooled.cross.accepts}/${pooled.cross.offers}.`,
    );
    notes.push(
      `Scores story ${storyMean.toFixed(2)} vs label ${labelMean.toFixed(2)} (all ${meanScore.toFixed(2)}).`,
    );
  }

  let verdict = "incomplete";
  if (pooled) {
    const crossOn = pooled.cross.offers >= 2 && pooled.cross.acc >= 0.3;
    const ssOn = pooled.ss.offers >= 2 && pooled.ss.acc >= 0.3;
    const stillPrivate = ssOn && pooled.cross.acc < 0.2;
    const tag = mixedLabel(pooled);
    if (crossOn) {
      verdict =
        "CK UNLOCKS — public roster lifts cross-cut mark trade above the common-knowledge gate";
    } else if (stillPrivate || tag === "PRIVATE FICTION") {
      verdict =
        "STILL PRIVATE — knowing who heard the story does not make skeptics treat marks as money";
    } else {
      verdict = `WEAK CK — roster changes the cut (${tag}), not enough to clear 0.30`;
    }
  }

  return {
    model: "grok-4.5",
    roster: ROSTER,
    silentCross: SILENT_MIXED_CROSS,
    runs,
    pooled,
    storyMean: runs.length ? storyMean : 0,
    labelMean: runs.length ? labelMean : 0,
    meanScore: runs.length ? meanScore : 0,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
