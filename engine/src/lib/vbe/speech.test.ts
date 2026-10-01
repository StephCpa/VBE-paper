import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSpeechReport, type SpeechRun } from "./speech.ts";
import type { ProbeTrial } from "./endgame.ts";
import type { SaleSlice } from "./minority.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(gifts: SaleSlice, sales: SaleSlice): SpeechRun {
  return {
    seed: 1,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: 58,
    sales,
    gifts,
    result: {
      scores: [],
      meanScore: 58,
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

function trial(gifts: number, sells: number, opportunities: number): ProbeTrial {
  return {
    condition: "label",
    seed: 1,
    pairing: "forced-he-sale",
    llm: {
      opportunities,
      sells,
      gifts,
      refusals: opportunities - sells - gifts,
      accSale: sells / opportunities,
      accGift: gifts / opportunities,
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

describe("speech", () => {
  it("calls obedient when last-round gifts continue", () => {
    const report = buildSpeechReport([run(s(20, 40), s(0, 10))], [trial(4, 0, 6)]);
    assert.match(report.verdict, /OBEDIENT/);
  });

  it("calls money-is-special when they refuse the altruist speech at T", () => {
    const report = buildSpeechReport([run(s(8, 40), s(1, 12))], [trial(0, 0, 6)]);
    assert.match(report.verdict, /MONEY IS SPECIAL/);
  });
});
