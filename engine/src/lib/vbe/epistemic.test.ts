import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation, runPopulationAsyncPaired } from "./env.ts";
import { altruist, idleProposal, kw, neverTrade } from "./robots.ts";
import {
  EPISTEMIC_FACT,
  EPISTEMIC_WINDOW,
  PRIVATE_NOTICE,
  PUBLIC_NOTICE,
  buildEpistemicReport,
  coordinationSlice,
  epistemicBeliefInstructionForK,
  epistemicFactForK,
  epistemicNoticesForK,
  epistemicRobotIds,
  scoreEpistemicBeliefs,
  structuralScheduleHash,
  tallyEpistemicRun,
  validateEpistemicResponse,
  type EpistemicRun,
} from "./epistemic.ts";
import type { AgentState, Proposal, RunResult } from "./types.ts";

function emptyResult(): RunResult {
  return {
    scores: [],
    meanScore: 0,
    heOffersInterior: 0,
    heAcceptsInterior: 0,
    heOffersEnd: 0,
    heAcceptsEnd: 0,
    accInterior: 0,
    accEnd: 0,
    rounds: [],
  };
}

function fakeRun(kind: EpistemicRun["kind"], seed: number, value: number): EpistemicRun {
  const slice = {
    heMeetings: 10,
    opportunities: 10,
    sellerIntents: value * 10,
    buyerIntents: value * 10,
    trades: value * 10,
    sellerIntentRate: value,
    buyerIntentRate: value,
    tradeRate: value,
    sellerIntentPerHe: value,
    buyerIntentPerHe: value,
    tradePerHe: value,
  };
  return {
    kind,
    seed,
    calls: 0,
    parseFails: 0,
    apiFails: 0,
    robotIds: [0],
    scheduleHash: "same",
    primaryRounds: { first: 5, last: 21 },
    meanScore: 50 + value,
    totalMeanScore: 50 + value,
    llmSeller: slice,
    llmBuyer: slice,
    llmLlm: slice,
    belief: { n: 10, pAccept: value, pSecond: value },
    beliefScoring: { weightPerField: 0.25, agents: [], meanBonus: 0 },
    result: emptyResult(),
  };
}

describe("epistemic intervention", () => {
  it("holds the behavioral fact constant and changes delivery metadata", () => {
    assert.ok(PRIVATE_NOTICE.includes(EPISTEMIC_FACT));
    assert.ok(PUBLIC_NOTICE.includes(EPISTEMIC_FACT));
    assert.match(PRIVATE_NOTICE, /no evidence/i);
    assert.match(PUBLIC_NOTICE, /every agent/i);
  });

  it("uses the frozen k=1 coordination window", () => {
    assert.deepEqual(EPISTEMIC_WINDOW, {
      firstRound: 5,
      lastRound: 21,
      rounds: Array.from({ length: 17 }, (_, i) => i + 5),
    });
  });

  it("compiles a k=2 treatment without changing fact content across delivery arms", () => {
    const ids = epistemicRobotIds(2);
    const fact = epistemicFactForK(2);
    const notices = epistemicNoticesForK(2);
    const belief = epistemicBeliefInstructionForK(2);
    assert.deepEqual(ids, [0, 1]);
    assert.match(fact, /#0 and #1/);
    assert.ok(notices.private.includes(fact));
    assert.ok(notices.public.includes(fact));
    assert.match(belief, /Agents #2–#7/);
    assert.match(belief, /fixed agents #0, #1/);
  });

  it("separates seller intent from realized trade", () => {
    const sellerOnly = (
      me: AgentState,
      partner: AgentState,
    ): Proposal => {
      if (me.type === "E" && partner.type === "H" && me.checks >= 1) {
        return { giveCheck: true, giveChits: 0, requireChit: true };
      }
      return idleProposal();
    };
    const result = runPopulation(17, sellerOnly, DEFAULT_PARAMS, true);
    const slice = coordinationSlice(result);
    assert.ok(slice.sellerIntents > 0);
    assert.equal(slice.buyerIntents, 0);
    assert.equal(slice.trades, 0);
  });

  it("records both intents and trades under a KW population", () => {
    const result = runPopulation(17, kw, DEFAULT_PARAMS, true);
    const tally = tallyEpistemicRun(result, [0]);
    assert.ok(tally.llmLlm.opportunities > 0);
    assert.equal(tally.llmLlm.sellerIntentRate, 1);
    assert.equal(tally.llmLlm.buyerIntentRate, 1);
    assert.equal(tally.llmLlm.tradeRate, 1);
  });

  it("keeps roles and meetings paired across behaviorally different treatments", async () => {
    const a = await runPopulationAsyncPaired(17, neverTrade, DEFAULT_PARAMS, true);
    const b = await runPopulationAsyncPaired(17, altruist, DEFAULT_PARAMS, true);
    assert.equal(structuralScheduleHash(a), structuralScheduleHash(b));
    assert.deepEqual(
      a.rounds.map((round) => round.types),
      b.rounds.map((round) => round.types),
    );
    assert.deepEqual(
      a.rounds.map((round) => round.meetings.map((meeting) => [meeting.i, meeting.j])),
      b.rounds.map((round) => round.meetings.map((meeting) => [meeting.i, meeting.j])),
    );
  });

  it("scores private belief reports once per agent rather than once per call", () => {
    const result = runPopulation(17, kw, DEFAULT_PARAMS, true);
    for (const snap of result.rounds) {
      for (const meeting of snap.meetings) {
        meeting.iPAccept = 1;
        meeting.iPSecond = 1;
        meeting.jPAccept = 1;
        meeting.jPSecond = 1;
      }
    }
    const scoring = scoreEpistemicBeliefs(result, [0]);
    assert.ok(scoring.agents.length > 0);
    assert.ok(scoring.agents.every((agent) => agent.totalBonus <= 0.5));
    assert.ok(scoring.meanBonus <= 0.5);
  });

  it("computes public-minus-private deltas by paired seed", () => {
    const report = buildEpistemicReport([
      fakeRun("private", 17, 0.1),
      fakeRun("public", 17, 0.4),
      fakeRun("private", 29, 0.2),
      fakeRun("public", 29, 0.3),
    ]);
    assert.equal(report.pairedDeltas.length, 2);
    assert.ok(Math.abs(report.pairedDeltas[0]!.tradeRate - 0.3) < 1e-12);
    assert.ok(Math.abs(report.pairedDeltas[1]!.pSecond - 0.1) < 1e-12);
    assert.match(report.verdict, /PILOT/);
  });

  it("rejects malformed or out-of-range epistemic responses", () => {
    assert.equal(
      validateEpistemicResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":0.4,"pSecond":0.3}',
      ),
      null,
    );
    assert.match(
      validateEpistemicResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":40,"pSecond":0.3}',
      )!,
      /pAccept/,
    );
    assert.match(validateEpistemicResponse("not json")!, /missing JSON/);
  });
});
