import { DEFAULT_PARAMS } from "./params.ts";
import { giftSlice, saleSlice, type SaleSlice } from "./minority.ts";
import type { RunResult } from "./types.ts";

export const TAXED_MONEY = `PUBLIC. It is common knowledge: (1) a mark is accepted as payment for one leftover check; a Hard agent who holds a mark may buy verification from an Easy agent. (2) Every meeting, each agent forfeits 1.0 of their own score to the experimenter (set "forfeit": 1). Clause (2) is strictly worse for you than doing nothing. This is not an engine rule — only a public statement. You may follow either clause, both, or neither. Maximize your own score.`;

export type ForfeitSlice = { slots: number; forfeits: number; rate: number };

export type DominatedRun = {
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  sales: SaleSlice;
  gifts: SaleSlice;
  forfeitInterior: ForfeitSlice;
  forfeitEnd: ForfeitSlice;
  result: RunResult;
};

export type DominatedReport = {
  model: string;
  text: string;
  moneyAnnounceSales: SaleSlice;
  runs: DominatedRun[];
  sales: SaleSlice | null;
  gifts: SaleSlice | null;
  forfeitInterior: ForfeitSlice | null;
  forfeitEnd: ForfeitSlice | null;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function poolSales(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function poolForfeit(xs: ForfeitSlice[]): ForfeitSlice {
  const slots = xs.reduce((s, x) => s + x.slots, 0);
  const forfeits = xs.reduce((s, x) => s + x.forfeits, 0);
  return { slots, forfeits, rate: slots === 0 ? 0 : forfeits / slots };
}

export function forfeitSlice(result: RunResult, T: number, which: "interior" | "end"): ForfeitSlice {
  let slots = 0;
  let forfeits = 0;
  for (const snap of result.rounds) {
    const isEnd = snap.t === T;
    if (which === "end" ? !isEnd : isEnd) continue;
    for (const m of snap.meetings) {
      slots += 2;
      if (m.iForfeit === 1) forfeits += 1;
      if (m.jForfeit === 1) forfeits += 1;
    }
  }
  return { slots, forfeits, rate: slots === 0 ? 0 : forfeits / slots };
}

export function tallyDominated(result: RunResult) {
  return {
    sales: saleSlice(result, DEFAULT_PARAMS.T),
    gifts: giftSlice(result, DEFAULT_PARAMS.T),
    forfeitInterior: forfeitSlice(result, DEFAULT_PARAMS.T, "interior"),
    forfeitEnd: forfeitSlice(result, DEFAULT_PARAMS.T, "end"),
  };
}

export function buildDominatedReport(runs: DominatedRun[]): DominatedReport {
  const sales = runs.length ? poolSales(runs.map((r) => r.sales)) : null;
  const gifts = runs.length ? poolSales(runs.map((r) => r.gifts)) : null;
  const forfeitInterior = runs.length ? poolForfeit(runs.map((r) => r.forfeitInterior)) : null;
  const forfeitEnd = runs.length ? poolForfeit(runs.map((r) => r.forfeitEnd)) : null;

  const notes = [
    "All-label + money announcement plus a strictly dominated 1.0 per-meeting forfeit.",
    "Money-announce interior sales 24/44 (0.55), last-round sell 0/6.",
    "Unit is the seed (n=3). Pooled rates are descriptive.",
  ];
  if (sales) {
    notes.push(
      `Per-seed sales ${runs.map((r) => `${r.seed}:${r.sales.accepts}/${r.sales.offers}`).join(", ")} pooled ${sales.accepts}/${sales.offers}.`,
    );
  }
  if (forfeitInterior) {
    notes.push(
      `Per-seed interior forfeit ${runs.map((r) => `${r.seed}:${r.forfeitInterior.forfeits}/${r.forfeitInterior.slots}`).join(", ")} pooled ${forfeitInterior.forfeits}/${forfeitInterior.slots}.`,
    );
  }

  let verdict = "incomplete";
  if (sales && forfeitInterior) {
    const seedSales = runs.map((r) => r.sales.acc);
    const seedTax = runs.map((r) => r.forfeitInterior.rate);
    const salesHold = seedSales.filter((a) => a >= 0.3).length >= 2;
    const taxHold = seedTax.filter((a) => a >= 0.3).length >= 2;
    const taxLow = seedTax.filter((a) => a < 0.15).length >= 2;
    if (salesHold && taxHold) {
      verdict =
        "OBEDIENT — they implement the dominated forfeit as well as mark trade; cheap talk is instruction-following";
    } else if (salesHold && taxLow) {
      verdict =
        "EQUILIBRIUM SELECTOR — they take the +EV money clause and skip the strictly dominated tax";
    } else if (!salesHold && taxHold) {
      verdict = "TAX ONLY — they pay the forfeit without installing mark trade";
    } else if (!salesHold && taxLow) {
      verdict = "IGNORES — the taxed announcement installs neither money nor the forfeit";
    } else {
      verdict = "WEAK TAX — mixed per-seed pattern; neither obedience nor selection is clean";
    }
  }

  return {
    model: "grok-4.5",
    text: TAXED_MONEY,
    moneyAnnounceSales: { offers: 44, accepts: 24, acc: 24 / 44 },
    runs,
    sales,
    gifts,
    forfeitInterior,
    forfeitEnd,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
