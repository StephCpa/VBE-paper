import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCkReport } from "./ck.ts";
import type { MixedRun } from "./mixed.ts";
import type { SaleSlice } from "./minority.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(cuts: MixedRun["cuts"]): MixedRun {
  return {
    seed: 1,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: 57,
    storyMean: 58,
    labelMean: 56,
    cuts,
    result: {
      scores: [],
      meanScore: 57,
      heOffersInterior: 0,
      heAcceptsInterior: 0,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: 0,
      accEnd: 0,
      rounds: [],
    },
  };
}

describe("common-knowledge roster", () => {
  it("stays private when SS holds and cross stays low", () => {
    const report = buildCkReport([
      run({
        ss: s(6, 10),
        sl: s(1, 7),
        ls: s(0, 6),
        ll: s(0, 5),
        cross: s(1, 13),
        all: s(7, 28),
      }),
    ]);
    assert.match(report.verdict, /STILL PRIVATE/);
  });

  it("unlocks when cross clears 0.30", () => {
    const report = buildCkReport([
      run({
        ss: s(6, 10),
        sl: s(4, 8),
        ls: s(3, 7),
        ll: s(0, 5),
        cross: s(7, 15),
        all: s(13, 30),
      }),
    ]);
    assert.match(report.verdict, /CK UNLOCKS/);
  });
});
