import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  CREDIBLE_INFO_LEVELS,
  CREDIBLE_INFO_ORDERS,
  CREDIBLE_INFO_SEEDS,
  buildCredibleInformationReport,
  type CredibleInfoLevel,
  type CredibleInfoRun,
} from "./credible-information-itt.ts";
import {
  credibleInformationNotice,
  validateCredibleInformationResponse,
} from "./credible-information-itt-execution.ts";

const zeroSlice: CoordinationSlice = {
  heMeetings: 1,
  opportunities: 1,
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

function fakeRun(seed: number, level: CredibleInfoLevel, seller: number): CredibleInfoRun {
  return {
    seed,
    level,
    calls: 4,
    apiFails: 0,
    parseFails: 0,
    actionBeliefFields: 0,
    robotIds: [0, 1, 2, 3],
    scheduleHash: `schedule-${seed}`,
    primaryRounds: { first: 5, last: 21 },
    notice: credibleInformationNotice(level),
    llmSeller: { ...zeroSlice, sellerIntentPerHe: seller },
    llmBuyer: { ...zeroSlice, buyerIntentPerHe: seller },
    llmLlm: { ...zeroSlice, tradePerHe: seller },
    meanScore: seller,
    result: {
      scores: [],
      meanScore: seller,
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

function blocks(low: number, mid: number, high: number): CredibleInfoRun[] {
  return CREDIBLE_INFO_SEEDS.flatMap((seed) => [
    fakeRun(seed, 0, low),
    fakeRun(seed, 2, mid),
    fakeRun(seed, 4, high),
  ]);
}

describe("credible social-information randomized ITT", () => {
  it("uses 18 fresh seeds and balances all six orders", () => {
    assert.equal(CREDIBLE_INFO_SEEDS.length, 18);
    assert.equal(new Set(CREDIBLE_INFO_SEEDS).size, 18);
    assert.equal(CREDIBLE_INFO_ORDERS.length, 6);
    for (let position = 0; position < 3; position++) {
      for (const level of CREDIBLE_INFO_LEVELS) {
        assert.equal(CREDIBLE_INFO_ORDERS.filter((order) => order[position] === level).length, 2);
      }
    }
  });

  it("keeps notices length-matched and recommendation-free", () => {
    const notices = CREDIBLE_INFO_LEVELS.map(credibleInformationNotice);
    assert.equal(new Set(notices.map((notice) => notice.length)).size, 1);
    for (const notice of notices) {
      assert.doesNotMatch(notice.toLowerCase(), /\bshould\b|\brecommend(?:s|ed|ation)?\b|\bought\b/);
      assert.doesNotMatch(notice, /pAccept|pSecond|belief/i);
    }
    assert.match(notices[0]!, /disclosed_certificates: 0 of 4/);
    assert.match(notices[1]!, /disclosed_certificates: 2 of 4/);
    assert.match(notices[2]!, /disclosed_certificates: 4 of 4/);
  });

  it("enforces the exact action-only response schema", () => {
    assert.equal(
      validateCredibleInformationResponse('{"giveCheck":true,"giveChits":0,"requireChit":true}'),
      null,
    );
    assert.match(
      validateCredibleInformationResponse('{"giveCheck":true,"giveChits":0,"requireChit":true,"pAccept":0.9}')!,
      /exact action-only/,
    );
    assert.match(
      validateCredibleInformationResponse('{"giveCheck":true,"giveChits":2,"requireChit":true}')!,
      /giveChits/,
    );
  });

  it("supports a material ordered action ITT", () => {
    const report = buildCredibleInformationReport(blocks(0.10, 0.20, 0.35), "test-model");
    assert.equal(report.completeBlocks, 18);
    assert.equal(report.primary?.passes, true);
    assert.equal(report.doseGuard.pass, true);
    assert.equal(report.verdict, "ACTION ITT WITH ORDERED DISCLOSURE DOSE");
  });

  it("separates a null ITT from a reversed dose and rejects corruption", () => {
    const nullReport = buildCredibleInformationReport(blocks(0.10, 0.11, 0.12), "test-model");
    assert.equal(nullReport.verdict, "NO MATERIAL ACTION ITT");
    const reversed = buildCredibleInformationReport(blocks(0.10, 0.50, 0.30), "test-model");
    assert.equal(reversed.primary?.passes, true);
    assert.equal(reversed.doseGuard.pass, false);
    assert.equal(reversed.verdict, "ACTION ITT WITHOUT ORDERED DOSE");
    const corrupt = blocks(0.10, 0.20, 0.35);
    corrupt[1]!.scheduleHash = "different";
    assert.throws(() => buildCredibleInformationReport(corrupt, "test-model"), /schedule mismatch/);
  });
});
