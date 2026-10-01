import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMixedReport, mixedLabel, type MixedCuts } from "./mixed.ts";
import type { SaleSlice } from "./minority.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function cuts(ss: SaleSlice, sl: SaleSlice, ls: SaleSlice, ll: SaleSlice): MixedCuts {
  const cross = {
    offers: sl.offers + ls.offers,
    accepts: sl.accepts + ls.accepts,
    acc: 0,
  };
  cross.acc = cross.offers === 0 ? 0 : cross.accepts / cross.offers;
  return { ss, sl, ls, ll, cross, all: s(ss.accepts + sl.accepts + ls.accepts + ll.accepts, ss.offers + sl.offers + ls.offers + ll.offers) };
}

describe("mixed population", () => {
  it("labels private fiction when only story-story sells", () => {
    assert.equal(mixedLabel(cuts(s(4, 8), s(0, 6), s(0, 6), s(0, 6))), "PRIVATE FICTION");
  });

  it("labels intersubjective when the cut trades but label-label does not", () => {
    assert.equal(mixedLabel(cuts(s(4, 8), s(3, 6), s(2, 5), s(0, 6))), "INTERSUBJECTIVE");
  });

  it("builds a PRIVATE FICTION report from pooled runs", () => {
    const run = {
      seed: 1,
      calls: 0,
      parseFails: 0,
      apiFails: 0,
      meanScore: 57,
      storyMean: 58,
      labelMean: 56,
      cuts: cuts(s(4, 8), s(0, 4), s(0, 4), s(0, 4)),
      result: {
        scores: [],
        meanScore: 57,
        heOffersInterior: 16,
        heAcceptsInterior: 4,
        heOffersEnd: 0,
        heAcceptsEnd: 0,
        accInterior: 0.25,
        accEnd: 0,
        rounds: [],
      },
    };
    const report = buildMixedReport([run]);
    assert.match(report.verdict, /PRIVATE FICTION/);
  });
});
