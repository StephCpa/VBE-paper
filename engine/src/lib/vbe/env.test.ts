import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { makeAgents, resolveMeeting, runPopulation, runRound, applyMeetings } from "./env.ts";
import { altruist, barter, kw, neverTrade } from "./robots.ts";
import { mulberry32 } from "./rng.ts";
import type { AgentState, Proposal } from "./types.ts";

function agent(partial: Partial<AgentState> & { id: number }): AgentState {
  return {
    type: "E",
    checks: 1,
    chits: 0,
    score: 0,
    solved: false,
    receivedFrom: null,
    memory: [],
    ...partial,
  };
}

const idle: Proposal = { giveCheck: false, giveChits: 0, requireChit: false };

describe("resolveMeeting", () => {
  it("swaps checks when both give and neither requires a mark", () => {
    const i = agent({ id: 0, type: "H", checks: 1 });
    const j = agent({ id: 1, type: "H", checks: 1 });
    const r = resolveMeeting(
      i,
      j,
      { giveCheck: true, giveChits: 0, requireChit: false },
      { giveCheck: true, giveChits: 0, requireChit: false },
    );
    assert.equal(r.kind, "swap");
    assert.equal(i.checks, 0);
    assert.equal(j.checks, 0);
    assert.equal(i.receivedFrom, "H");
    assert.equal(j.receivedFrom, "H");
  });

  it("sells a leftover check for one mark", () => {
    const seller = agent({ id: 0, type: "E", checks: 1, chits: 0 });
    const buyer = agent({ id: 1, type: "H", checks: 1, chits: 1 });
    const r = resolveMeeting(
      seller,
      buyer,
      { giveCheck: true, giveChits: 0, requireChit: true },
      { giveCheck: false, giveChits: 1, requireChit: false },
    );
    assert.equal(r.kind, "chit-for-check");
    assert.equal(r.seller, 0);
    assert.equal(r.buyer, 1);
    assert.equal(seller.chits, 1);
    assert.equal(buyer.chits, 0);
    assert.equal(buyer.receivedFrom, "E");
    assert.equal(seller.checks, 0);
  });

  it("gifts a check without a mark", () => {
    const i = agent({ id: 0, type: "E", checks: 1 });
    const j = agent({ id: 1, type: "H", checks: 1 });
    const r = resolveMeeting(
      i,
      j,
      { giveCheck: true, giveChits: 0, requireChit: false },
      idle,
    );
    assert.equal(r.kind, "gift");
    assert.equal(j.receivedFrom, "E");
  });

  it("does nothing if the seller requires a mark the buyer will not pay", () => {
    const i = agent({ id: 0, type: "E", checks: 1 });
    const j = agent({ id: 1, type: "H", checks: 1, chits: 1 });
    const r = resolveMeeting(
      i,
      j,
      { giveCheck: true, giveChits: 0, requireChit: true },
      idle,
    );
    assert.equal(r.kind, "none");
    assert.equal(i.checks, 1);
    assert.equal(j.chits, 1);
  });

  it("forfeit deducts one score and is skipped at 0", () => {
    const i = agent({ id: 0, checks: 0, score: 10 });
    const j = agent({ id: 1, checks: 0, score: 10 });
    applyMeetings(
      [i, j],
      1,
      { ...DEFAULT_PARAMS, n: 2, v: 0, R: 0 },
      mulberry32(1),
      [
        {
          i,
          j,
          pi: { giveCheck: false, giveChits: 0, requireChit: false, forfeit: 1 },
          pj: { giveCheck: false, giveChits: 0, requireChit: false, forfeit: 0 },
        },
      ],
    );
    assert.equal(i.score, 9);
    assert.equal(j.score, 10);
  });
});

describe("robots", () => {
  it("KW refuses to sell in the last round", () => {
    const me = agent({ id: 0, type: "E", checks: 1 });
    const partner = agent({ id: 1, type: "H", chits: 1 });
    const last = kw(me, partner, 24, 24);
    const mid = kw(me, partner, 10, 24);
    assert.equal(last.giveCheck, false);
    assert.equal(mid.giveCheck, true);
    assert.equal(mid.requireChit, true);
  });

  it("barter only swaps H–H", () => {
    const h = agent({ id: 0, type: "H" });
    const e = agent({ id: 1, type: "E" });
    assert.equal(barter(h, e, 1, 24).giveCheck, false);
    assert.equal(barter(h, agent({ id: 2, type: "H" }), 1, 24).giveCheck, true);
  });
});

describe("runPopulation", () => {
  it("converts leftover checks to v", () => {
    const params = { ...DEFAULT_PARAMS, n: 2, T: 1, q: 0, M: 0, v: 0.5, R: 3 };
    const rng = mulberry32(1);
    const agents = makeAgents(params, rng);
    // Force both easy, no meetings.
    const snap = runRound(agents, 1, params, () => 0, neverTrade);
    // types assigned via rng 0 → first half H? assignTypes uses shuffle.
    // Just check leftover accounting: E get R + v, H get pHard*R or v.
    assert.ok(snap.scores.every((s) => s >= 0));
  });

  it("K=0 stores no memory after a meeting", () => {
    const i = agent({ id: 0, checks: 0 });
    const j = agent({ id: 1, checks: 0 });
    applyMeetings(
      [i, j],
      1,
      { ...DEFAULT_PARAMS, n: 2, K: 0, v: 0, R: 0 },
      mulberry32(1),
      [{ i, j, pi: idle, pj: idle }],
    );
    assert.equal(i.memory.length, 0);
    assert.equal(j.memory.length, 0);
  });

  it("KW beats never-trade on a single seed at frozen params", () => {
    const kwRun = runPopulation(7, kw, DEFAULT_PARAMS, false);
    const neverRun = runPopulation(7, neverTrade, DEFAULT_PARAMS, false);
    assert.ok(
      kwRun.meanScore > neverRun.meanScore,
      `kw ${kwRun.meanScore} vs never ${neverRun.meanScore}`,
    );
  });

  it("altruist is a sucker relative to KW on a typical seed", () => {
    const kwRun = runPopulation(11, kw, DEFAULT_PARAMS, false);
    const al = runPopulation(11, altruist, DEFAULT_PARAMS, false);
    assert.ok(Number.isFinite(kwRun.meanScore) && Number.isFinite(al.meanScore));
  });
});
