import { DEFAULT_PARAMS } from "./params.ts";
import { saleSlice, type SaleSlice } from "./minority.ts";
import { mixedCuts, isStory, type MixedCuts } from "./mixed.ts";
import type { RunResult } from "./types.ts";

export type BeliefKind = "label" | "announce" | "mixed";

export type BeliefMean = { n: number; pAccept: number; pSecond: number };

export type BeliefRun = {
  kind: BeliefKind;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  sales: SaleSlice;
  all: BeliefMean;
  story?: BeliefMean;
  label?: BeliefMean;
  cuts?: MixedCuts;
  result: RunResult;
};

export type BeliefReport = {
  model: string;
  runs: BeliefRun[];
  byKind: Partial<Record<BeliefKind, { n: number; sales: SaleSlice; all: BeliefMean }>>;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function poolSales(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function beliefMean(
  result: RunResult,
  pred: (id: number) => boolean = () => true,
): BeliefMean {
  let n = 0;
  let pAccept = 0;
  let pSecond = 0;
  for (const snap of result.rounds) {
    if (snap.t === DEFAULT_PARAMS.T) continue;
    for (const m of snap.meetings) {
      if (pred(m.i) && typeof m.iPAccept === "number") {
        n += 1;
        pAccept += m.iPAccept;
        pSecond += m.iPSecond ?? 0;
      }
      if (pred(m.j) && typeof m.jPAccept === "number") {
        n += 1;
        pAccept += m.jPAccept;
        pSecond += m.jPSecond ?? 0;
      }
    }
  }
  return {
    n,
    pAccept: n === 0 ? 0 : pAccept / n,
    pSecond: n === 0 ? 0 : pSecond / n,
  };
}

export function tallyBelief(kind: BeliefKind, result: RunResult) {
  const sales = saleSlice(result, DEFAULT_PARAMS.T);
  const all = beliefMean(result);
  if (kind !== "mixed") return { sales, all };
  return {
    sales,
    all,
    story: beliefMean(result, (id) => isStory(id)),
    label: beliefMean(result, (id) => !isStory(id)),
    cuts: mixedCuts(result),
  };
}

function poolBelief(xs: BeliefMean[]): BeliefMean {
  const n = xs.reduce((s, x) => s + x.n, 0);
  const pAccept = xs.reduce((s, x) => s + x.pAccept * x.n, 0);
  const pSecond = xs.reduce((s, x) => s + x.pSecond * x.n, 0);
  return { n, pAccept: n === 0 ? 0 : pAccept / n, pSecond: n === 0 ? 0 : pSecond / n };
}

export function buildBeliefReport(runs: BeliefRun[]): BeliefReport {
  const byKind: BeliefReport["byKind"] = {};
  for (const kind of ["label", "announce", "mixed"] as BeliefKind[]) {
    const subset = runs.filter((r) => r.kind === kind);
    if (!subset.length) continue;
    byKind[kind] = {
      n: subset.length,
      sales: poolSales(subset.map((r) => r.sales)),
      all: poolBelief(subset.map((r) => r.all)),
    };
  }
  const label = byKind.label;
  const announce = byKind.announce;
  const mixed = byKind.mixed;
  const notes = [
    "Same JSON decision plus pAccept / pSecond. Seed is the unit.",
    "Frozen money-announce sales 24/44 without elicitation.",
  ];
  for (const r of runs) {
    notes.push(
      `${r.kind} ${r.seed} sales ${r.sales.accepts}/${r.sales.offers} pAccept ${r.all.pAccept.toFixed(2)} pSecond ${r.all.pSecond.toFixed(2)} n=${r.all.n}.`,
    );
  }

  let verdict = "incomplete";
  if (label && announce) {
    const delta = announce.all.pAccept - label.all.pAccept;
    const seedHold =
      runs.filter((r) => r.kind === "announce" && r.sales.acc >= 0.3).length >= 2;
    const seedLow =
      runs.filter((r) => r.kind === "announce" && r.sales.acc < 0.2).length >= 2;
    notes.push(
      `Announce−label ΔpAccept ${delta.toFixed(2)} (announce ${announce.all.pAccept.toFixed(2)} vs label ${label.all.pAccept.toFixed(2)}).`,
    );
    if (seedHold && delta >= 0.15) {
      verdict =
        "BELIEFS MOVE — the announcement raises first-order expected acceptance along with mark trade";
    } else if (seedHold && Math.abs(delta) < 0.1) {
      verdict =
        "COMPLIANCE — mark trade installs without a matching shift in elicited belief";
    } else if (seedLow) {
      verdict =
        "ELICITATION CONFOUNDS — asking for beliefs collapses the announce-arm install relative to 0.55";
    } else {
      verdict = `WEAK BELIEF — ΔpAccept ${delta.toFixed(2)}, sales not a clean seed-level hold`;
    }
    if (mixed) {
      const storyRuns = runs.filter((r) => r.kind === "mixed" && r.story);
      const storyP = poolBelief(storyRuns.map((r) => r.story!));
      const labelP = poolBelief(storyRuns.map((r) => r.label!));
      notes.push(
        `Mixed story pAccept ${storyP.pAccept.toFixed(2)} vs label ${labelP.pAccept.toFixed(2)}.`,
      );
    }
  }

  return {
    model: "grok-4.5",
    runs,
    byKind,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
