import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseProposal } from "./llm.ts";
import { buildBeliefReport, type BeliefRun } from "./beliefs.ts";
import type { SaleSlice } from "./minority.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(kind: BeliefRun["kind"], seed: number, acc: number, pAccept: number): BeliefRun {
  const offers = 12;
  const accepts = Math.round(acc * offers);
  return {
    kind,
    seed,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: 57,
    sales: s(accepts, offers),
    all: { n: 40, pAccept, pSecond: pAccept * 0.9 },
    result: {
      scores: [],
      meanScore: 57,
      heOffersInterior: offers,
      heAcceptsInterior: accepts,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: acc,
      accEnd: 0,
      rounds: [],
    },
  };
}

describe("beliefs", () => {
  it("parses 0-1 and 70 as seventy percent", () => {
    const a = parseProposal('{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":0.7,"pSecond":0.4}');
    assert.equal(a.pAccept, 0.7);
    const b = parseProposal('{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":70,"pSecond":4}');
    assert.equal(b.pAccept, 0.7);
    assert.equal(b.pSecond, 4 / 7);
  });

  it("calls compliance when sales hold and beliefs do not move", () => {
    const report = buildBeliefReport([
      run("label", 17, 0, 0.2),
      run("label", 29, 0, 0.25),
      run("announce", 17, 0.5, 0.22),
      run("announce", 29, 0.5, 0.24),
    ]);
    assert.match(report.verdict, /COMPLIANCE/);
  });

  it("calls beliefs move when pAccept jumps with sales", () => {
    const report = buildBeliefReport([
      run("label", 17, 0, 0.2),
      run("label", 29, 0, 0.2),
      run("announce", 17, 0.5, 0.6),
      run("announce", 29, 0.55, 0.55),
    ]);
    assert.match(report.verdict, /BELIEFS MOVE/);
  });
});
