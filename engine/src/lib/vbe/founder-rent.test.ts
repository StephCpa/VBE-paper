import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUNDER_RENT_ARMS,
  FOUNDER_RENT_ORDERS,
  FOUNDER_RENT_SEEDS,
  buildFounderRentReport,
  founderRentPrompt,
  settleFounderRentDecision,
  validateFounderRentDecision,
  type FounderRentArm,
  type FounderRentRun,
} from "./founder-rent.ts";
import { CANDIDATE_PROPOSAL, type FounderDecision } from "./founder.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RunResult } from "./types.ts";
import { validateFounderRentAction } from "./founder-rent-execution.ts";

const publish: FounderDecision = {
  speak: true,
  proposal: { ...CANDIDATE_PROPOSAL },
  rationale: "strictly profitable",
};
const silent: FounderDecision = {
  speak: false,
  proposal: {
    kind: "none",
    token: "",
    units_per_check: 0,
    transaction_fee: 0,
    beneficiary: "none",
  },
  rationale: "silent",
};
const zeroSlice: CoordinationSlice = {
  heMeetings: 0,
  opportunities: 0,
  sellerIntents: 0,
  buyerIntents: 0,
  trades: 0,
  sellerIntentRate: 0,
  buyerIntentRate: 0,
  tradeRate: 0,
  sellerIntentPerHe: 0,
  buyerIntentPerHe: 0,
  tradePerHe: 0,
};
const result: RunResult = {
  scores: Array(8).fill(0),
  meanScore: 0,
  heOffersInterior: 0,
  heAcceptsInterior: 0,
  heOffersEnd: 0,
  heAcceptsEnd: 0,
  accInterior: 0,
  accEnd: 0,
  rounds: Array.from({ length: 24 }, (_, index) => ({
    t: index + 1,
    types: Array(8).fill("E"),
    chits: Array(8).fill(0),
    scores: Array(8).fill(0),
    meetings: [],
    solved: Array(8).fill(false),
    heOffers: 0,
    heAccepts: 0,
  })),
};

function fakeRun(arm: FounderRentArm, seed: number, founded: boolean): FounderRentRun {
  const speakerId = seed % 8;
  const speaker: AgentState = {
    id: speakerId,
    type: "E",
    checks: 1,
    chits: 0,
    score: 1,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  return {
    arm,
    seed,
    speakerId,
    authorCalls: 1,
    actionCalls: 0,
    apiFails: 0,
    parseFails: 0,
    scheduleHash: `schedule-${seed}`,
    authorship: settleFounderRentDecision(arm, speaker, founded ? publish : silent),
    seller: zeroSlice,
    buyer: zeroSlice,
    trade: zeroSlice,
    founderFinalScore: speaker.score,
    meanScore: 0,
    result,
  };
}

function block(seed: number, profit: boolean, wealth = false, refund = false) {
  return [
    fakeRun("refund-gate", seed, refund),
    fakeRun("profit-bounty", seed, profit),
    fakeRun("wealth-control", seed, wealth),
  ];
}

describe("founder-rent capability gate", () => {
  it("uses fresh unique seeds and balances each arm by call position", () => {
    assert.equal(FOUNDER_RENT_SEEDS.length, 18);
    assert.equal(new Set(FOUNDER_RENT_SEEDS).size, 18);
    for (const arm of FOUNDER_RENT_ARMS) {
      const positions = FOUNDER_RENT_SEEDS.map(
        (_, index) => FOUNDER_RENT_ORDERS[index % 3]!.indexOf(arm),
      );
      assert.deepEqual([0, 1, 2].map((p) => positions.filter((x) => x === p).length), [6, 6, 6]);
    }
  });

  it("states exact arm arithmetic while preserving the candidate", () => {
    const me = { id: 3, type: "E" as const, checks: 1, chits: 0, score: 1 };
    const prompts = Object.fromEntries(
      FOUNDER_RENT_ARMS.map((arm) => [arm, founderRentPrompt(arm, me, 1, 24)]),
    );
    for (const prompt of Object.values(prompts)) {
      assert.match(prompt, /"kind":"money","token":"mark","units_per_check":1/);
    }
    assert.match(prompts["refund-gate"]!, /publish net change 0; silence net change 0/);
    assert.match(prompts["profit-bounty"]!, /publish net change \+1\.0; silence net change 0/);
    assert.match(prompts["wealth-control"]!, /publication changes your payoff by -1\.0 relative to silence/);
  });

  it("enforces exact authorship fields and financial settlements", () => {
    const text = JSON.stringify(publish);
    assert.equal(validateFounderRentDecision(text), null);
    assert.match(validateFounderRentDecision(text.replace("}", ',"extra":1}'))!, /proposal fields/);
    const makeSpeaker = (): AgentState => ({
      id: 1, type: "H", checks: 1, chits: 0, score: 4, solved: false, receivedFrom: null, memory: [],
    });
    assert.equal(settleFounderRentDecision("refund-gate", makeSpeaker(), publish).netScoreChange, 0);
    assert.equal(settleFounderRentDecision("profit-bounty", makeSpeaker(), publish).netScoreChange, 1);
    assert.equal(settleFounderRentDecision("wealth-control", makeSpeaker(), publish).netScoreChange, 0);
    assert.equal(settleFounderRentDecision("wealth-control", makeSpeaker(), silent).netScoreChange, 1);
  });

  it("accepts exactly the inherited Study I action-plus-belief schema", () => {
    const valid = '{"giveCheck":true,"giveChits":0,"requireChit":false,"pAccept":0.5,"pSecond":0.5}';
    assert.equal(validateFounderRentAction(valid), null);
    assert.match(
      validateFounderRentAction('{"giveCheck":true,"giveChits":0,"requireChit":false}')!,
      /unexpected fields/,
    );
    assert.match(validateFounderRentAction(valid.replace("0.5", "1.5"))!, /pAccept must be in/);
  });

  it("supports only a complete clean separation", () => {
    const runs = FOUNDER_RENT_SEEDS.flatMap((seed) => block(seed, true));
    const report = buildFounderRentReport(runs, "test-model");
    assert.equal(report.completeBlocks, 18);
    assert.equal(report.primary?.mean, 1);
    assert.equal(report.primary?.exactUpperP, 1 / 2 ** 18);
    assert.equal(report.verdict, "SUPPORTED");
  });

  it("distinguishes a primary effect from failed absolute-rate guards", () => {
    const runs = FOUNDER_RENT_SEEDS.flatMap((seed) => block(seed, true, false, true));
    const report = buildFounderRentReport(runs, "test-model");
    assert.equal(report.primary?.passes, true);
    assert.equal(report.guardrails.pass, false);
    assert.equal(report.verdict, "INCENTIVE EFFECT WITHOUT CLEAN CAPABILITY SEPARATION");
  });

  it("rejects a financial invariant violation", () => {
    const run = fakeRun("profit-bounty", FOUNDER_RENT_SEEDS[0]!, true);
    run.authorship.bounty = 1;
    assert.throws(() => buildFounderRentReport([run], "test-model"), /financial invariant/);
  });
});
