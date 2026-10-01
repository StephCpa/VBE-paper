import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUnconfoundReport, type UnconfoundRun } from "./unconfound.ts";
import type { SaleSlice } from "./minority.ts";
import type { ProbeTrial } from "./endgame.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(kind: UnconfoundRun["kind"], all: SaleSlice, cross: SaleSlice): UnconfoundRun {
  return {
    kind,
    seed: 1,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: 57,
    storyMean: 58,
    labelMean: 56,
    all,
    cuts: {
      ss: s(4, 8),
      sl: s(cross.accepts, Math.ceil(cross.offers / 2) || 1),
      ls: s(0, Math.floor(cross.offers / 2)),
      ll: s(0, 5),
      cross,
      all,
    },
    result: {
      scores: [],
      meanScore: 57,
      heOffersInterior: all.offers,
      heAcceptsInterior: all.accepts,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: all.acc,
      accEnd: 0,
      rounds: [],
    },
  };
}

function trial(sells: number, gifts: number, opportunities: number): ProbeTrial {
  return {
    condition: "label",
    seed: 1,
    pairing: "forced-he-sale",
    llm: {
      opportunities,
      sells,
      gifts,
      refusals: opportunities - sells - gifts,
      accSale: opportunities ? sells / opportunities : 0,
      accGift: opportunities ? gifts / opportunities : 0,
    },
    kw: {
      opportunities,
      sells: 0,
      gifts: 0,
      refusals: opportunities,
      accSale: 0,
      accGift: 0,
    },
    altruist: {
      opportunities,
      sells: 0,
      gifts: opportunities,
      refusals: 0,
      accSale: 0,
      accGift: 1,
    },
    meetings: [],
  };
}

describe("unconfound", () => {
  it("calls policy leak when only the announcement works", () => {
    const report = buildUnconfoundReport([
      run("announce", s(8, 16), s(0, 0)),
      run("idsonly", s(4, 20), s(1, 12)),
    ]);
    assert.match(report.verdict, /POLICY LEAK/);
  });

  it("calls interaction when neither piece alone unlocks", () => {
    const report = buildUnconfoundReport([
      run("announce", s(2, 16), s(0, 0)),
      run("idsonly", s(6, 20), s(2, 13)),
    ]);
    assert.match(report.verdict, /INTERACTION/);
  });

  it("upgrades to rule-following when last-round sales continue", () => {
    const report = buildUnconfoundReport(
      [run("announce", s(8, 16), s(0, 0)), run("idsonly", s(4, 20), s(1, 12))],
      [trial(4, 0, 5)],
    );
    assert.match(report.verdict, /RULE FOLLOWING/);
  });

  it("keeps L2 if last-round sales collapse", () => {
    const report = buildUnconfoundReport(
      [run("announce", s(8, 16), s(0, 0)), run("idsonly", s(4, 20), s(1, 12))],
      [trial(0, 0, 5)],
    );
    assert.match(report.verdict, /L2/);
  });
});
