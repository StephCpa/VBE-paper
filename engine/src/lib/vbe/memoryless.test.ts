import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { applyMeetings } from "./env.ts";
import { mulberry32 } from "./rng.ts";
import { buildMemorylessReport, type MemorylessRun } from "./memoryless.ts";
import type { SaleSlice } from "./minority.ts";
import type { InvasionCell } from "./invasion.ts";

function s(accepts: number, offers: number): SaleSlice {
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function run(kind: "label" | "announce", seed: number, mean: number, acc: number): MemorylessRun {
  const offers = 12;
  const accepts = Math.round(acc * offers);
  return {
    kind,
    seed,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    meanScore: mean,
    sales: s(accepts, offers),
    gifts: s(kind === "label" ? 4 : 0, 20),
    result: {
      scores: [],
      meanScore: mean,
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

const invasion: InvasionCell = {
  name: "7 altruist + 1 never",
  nRuns: 8,
  mutantName: "never",
  mutantMean: 64,
  majorityMean: 60,
  mutantBeatsMajority: 0.7,
  majorityName: "altruist",
};

describe("memoryless", () => {
  it("K=0 wipes memory", () => {
    const i = { id: 0, type: "E" as const, checks: 0, chits: 0, score: 0, solved: false, receivedFrom: null, memory: [] };
    const j = { ...i, id: 1 };
    const idle = { giveCheck: false, giveChits: 0, requireChit: false as const };
    applyMeetings(
      [i, j],
      1,
      { ...DEFAULT_PARAMS, n: 2, K: 0, v: 0, R: 0 },
      mulberry32(1),
      [{ i, j, pi: idle, pj: idle }],
    );
    assert.equal(i.memory.length, 0);
  });

  it("calls still-second-best when marks install but scores stay close", () => {
    const robot = {
      never: { mean: 55, std: 1, accInterior: 0, accEnd: 0 },
      barter: { mean: 57, std: 1, accInterior: 0, accEnd: 0 },
      reciprocity: { mean: 57, std: 1, accInterior: 0, accEnd: 0 },
      kw: { mean: 59, std: 1, accInterior: 1, accEnd: 0 },
      altruist: { mean: 62, std: 1, accInterior: 0, accEnd: 0 },
    };
    const report = buildMemorylessReport(
      [
        run("label", 17, 56.5, 0),
        run("label", 29, 56.8, 0),
        run("announce", 17, 57.2, 0.5),
        run("announce", 29, 57.4, 0.5),
      ],
      robot,
      invasion,
    );
    assert.match(report.verdict, /SECOND-BEST/);
  });
});
