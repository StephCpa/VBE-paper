import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDominatedReport, type DominatedRun } from "./dominated.ts";
import type { SaleSlice } from "./minority.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(sales: SaleSlice, taxRate: number): DominatedRun {
  const slots = 40;
  const forfeits = Math.round(taxRate * slots);
  return {
    seed: 1,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: 50,
    sales,
    gifts: s(0, 10),
    forfeitInterior: { slots, forfeits, rate: taxRate },
    forfeitEnd: { slots: 4, forfeits: 0, rate: 0 },
    result: {
      scores: [],
      meanScore: 50,
      heOffersInterior: sales.offers,
      heAcceptsInterior: sales.accepts,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: sales.acc,
      accEnd: 0,
      rounds: [],
    },
  };
}

describe("dominated announcement", () => {
  it("calls equilibrium selector when they trade marks and skip the tax", () => {
    const report = buildDominatedReport([run(s(8, 16), 0), run(s(7, 13), 0.05), run(s(8, 14), 0)]);
    assert.match(report.verdict, /EQUILIBRIUM SELECTOR/);
  });

  it("calls obedient when they pay the tax and trade", () => {
    const report = buildDominatedReport([run(s(8, 16), 0.8), run(s(7, 13), 0.9), run(s(8, 14), 0.7)]);
    assert.match(report.verdict, /OBEDIENT/);
  });
});
