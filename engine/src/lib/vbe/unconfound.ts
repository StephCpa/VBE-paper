import { DEFAULT_PARAMS } from "./params.ts";
import { saleSlice, type SaleSlice } from "./minority.ts";
import {
  mixedCuts,
  mixedLabel,
  type MixedCuts,
} from "./mixed.ts";
import type { RunResult } from "./types.ts";
import { poolCounts, type ProbeCounts, type ProbeTrial } from "./endgame.ts";

export const ANNOUNCE = `PUBLIC. It is common knowledge: a mark is accepted as payment for one leftover check. A Hard agent who holds a mark may buy verification from an Easy agent. An Easy agent may require a mark when giving a leftover check. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;

export const IDS_ONLY = `PUBLIC ROSTER. Agents #0, #1, #2, #3 received an extra private note. Agents #4, #5, #6, #7 received only the rules. The content of that private note is not listed here. Every agent can see this roster.`;

export type UnconfoundKind = "announce" | "idsonly";

export type UnconfoundRun = {
  kind: UnconfoundKind;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  storyMean: number;
  labelMean: number;
  all: SaleSlice;
  cuts: MixedCuts | null;
  result: RunResult;
};

export type UnconfoundReport = {
  model: string;
  announceText: string;
  idsText: string;
  ckCross: SaleSlice;
  silentCross: SaleSlice;
  runs: UnconfoundRun[];
  announce: SaleSlice | null;
  idsonly: MixedCuts | null;
  announceProbe?: {
    trials: ProbeTrial[];
    llm: ProbeCounts;
    kw: ProbeCounts;
    altruist: ProbeCounts;
  };
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function on(s: SaleSlice | null | undefined) {
  return !!s && s.offers >= 2 && s.acc >= 0.3;
}

export function buildUnconfoundReport(
  runs: UnconfoundRun[],
  probeTrials: ProbeTrial[] = [],
): UnconfoundReport {
  const aRuns = runs.filter((r) => r.kind === "announce");
  const iRuns = runs.filter((r) => r.kind === "idsonly");
  const announce = aRuns.length ? pool(aRuns.map((r) => r.all)) : null;
  const idsonly = iRuns.length
    ? {
        ss: pool(iRuns.map((r) => r.cuts!.ss)),
        sl: pool(iRuns.map((r) => r.cuts!.sl)),
        ls: pool(iRuns.map((r) => r.cuts!.ls)),
        ll: pool(iRuns.map((r) => r.cuts!.ll)),
        cross: pool(iRuns.map((r) => r.cuts!.cross)),
        all: pool(iRuns.map((r) => r.all)),
      }
    : null;

  const notes = [
    "Announce: all 8 agents get label rules plus a public cheap-talk money statement. No Harari story.",
    "Ids-only: same 4+4 as mixed/CK, but the roster does not say what the private note contains.",
    "CK roster (policy+types) cross 9/11 (0.82). Silent mixed cross 2/13 (0.15).",
  ];
  if (announce) notes.push(`Announce ${announce.accepts}/${announce.offers} (${announce.acc.toFixed(2)}).`);
  if (idsonly) {
    notes.push(
      `Ids-only SS ${idsonly.ss.accepts}/${idsonly.ss.offers} cross ${idsonly.cross.accepts}/${idsonly.cross.offers} LL ${idsonly.ll.accepts}/${idsonly.ll.offers}.`,
    );
  }

  let verdict = "incomplete";
  if (announce && idsonly) {
    const a = on(announce);
    const i = on(idsonly.cross);
    if (a && !i) {
      verdict =
        "POLICY LEAK — cheap-talk announcement installs mark trade; knowing who has a secret does not";
    } else if (!a && i) {
      verdict =
        "TYPES — a roster of who got a private note unlocks the cut; stating the policy publicly does not";
    } else if (a && i) {
      verdict =
        "BOTH — public policy talk and identity-only roster each suffice to move marks across the cut";
    } else {
      const tag = mixedLabel(idsonly);
      verdict = `INTERACTION — neither piece alone matches the original CK unlock (announce ${announce.acc.toFixed(2)}, ids-only ${tag} cross ${idsonly.cross.acc.toFixed(2)})`;
    }
  } else if (announce) {
    verdict = on(announce)
      ? "ANNOUNCE HOLDS — public cheap talk installs mark use without the Harari story"
      : "ANNOUNCE FAILS — describing the monetary equilibrium in public is not enough";
  }

  const probe =
    probeTrials.length > 0
      ? {
          trials: probeTrials,
          llm: poolCounts(probeTrials, "llm"),
          kw: poolCounts(probeTrials, "kw"),
          altruist: poolCounts(probeTrials, "altruist"),
        }
      : undefined;
  if (probe) {
    notes.push(
      `Announce endgame probe sell ${probe.llm.sells}/${probe.llm.opportunities} gift ${probe.llm.gifts}.`,
    );
    if (probe.llm.opportunities >= 2 && probe.llm.accSale <= 0.15 && probe.llm.accGift <= 0.2) {
      verdict =
        "POLICY LEAK + L2 — cheap talk installs mark use that collapses in the last round";
    } else if (probe.llm.opportunities >= 2 && probe.llm.accSale >= 0.3) {
      verdict =
        "RULE FOLLOWING — cheap talk installs mark use that survives the last round; not L2 money";
    } else if (probe.llm.opportunities >= 2) {
      verdict = `${verdict} Announce endgame weak (sell ${probe.llm.sells}/${probe.llm.opportunities}, gift ${probe.llm.gifts}).`;
    }
  }

  return {
    model: "grok-4.5",
    announceText: ANNOUNCE,
    idsText: IDS_ONLY,
    ckCross: { offers: 11, accepts: 9, acc: 9 / 11 },
    silentCross: { offers: 13, accepts: 2, acc: 2 / 13 },
    runs,
    announce,
    idsonly,
    announceProbe: probe,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}

export function slicesForAnnounce(result: RunResult): SaleSlice {
  return saleSlice(result, DEFAULT_PARAMS.T);
}

export { mixedCuts };
