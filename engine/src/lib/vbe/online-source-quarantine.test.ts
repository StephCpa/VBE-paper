import assert from "node:assert/strict";
import test from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  ONLINE_SOURCE_ARMS,
  ONLINE_SOURCE_SEEDS,
  ONLINE_SOURCE_WINDOWS,
  buildOnlineSourceReport,
  onlinePayloadHash,
  onlineSourceEnvelope,
  onlineSourceNotice,
  onlineSourceOrder,
  type OnlineSourceArm,
  type OnlineSourceRun,
} from "./online-source-quarantine.ts";
import type { RunResult } from "./types.ts";

function slice(seller: number, buyer: number, trade: number): CoordinationSlice {
  return { heMeetings: 10, opportunities: 10, sellerIntents: seller * 10, buyerIntents: buyer * 10, trades: trade * 10, sellerIntentRate: seller, buyerIntentRate: buyer, tradeRate: trade, sellerIntentPerHe: seller, buyerIntentPerHe: buyer, tradePerHe: trade };
}

function emptyResult(): RunResult {
  return { scores: [], meanScore: 0, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0, rounds: [] };
}

function syntheticRun(seed: number, arm: OnlineSourceArm, mode: "pass" | "partial" = "pass"): OnlineSourceRun {
  const seller = arm === "invalid-quarantined" ? 0.1 : arm === "valid-visible" ? 0.9 : mode === "pass" ? 0.9 : 0.7;
  const trade = arm === "invalid-quarantined" ? 0.05 : 0.25;
  return {
    arm, seed, calls: 80, apiFails: 0, parseFails: 0, robotCalls: 0,
    scheduleHash: `schedule-${seed}`,
    noticeDuring: onlineSourceNotice(arm, ONLINE_SOURCE_WINDOWS.treatment.first),
    pre: slice(0.1, 0.1, 0.02),
    treatment: slice(seller, 0.4, trade),
    withdrawal: slice(arm === "invalid-quarantined" ? 0.1 : 0.3, 0.2, arm === "invalid-quarantined" ? 0.04 : 0.09),
    treatmentConcentration: { meanHolderCount: arm === "invalid-quarantined" ? 4 : 3.5, meanMaxHolding: arm === "invalid-quarantined" ? 1 : 1.5 },
    withdrawalConcentration: { meanHolderCount: 3.5, meanMaxHolding: 1.5 },
    meanScore: arm === "invalid-quarantined" ? 50 : 51,
    result: emptyResult(),
  };
}

test("uses 18 new seeds and balances all six three-arm orders", () => {
  assert.equal(ONLINE_SOURCE_SEEDS.length, 18);
  assert.equal(new Set(ONLINE_SOURCE_SEEDS).size, 18);
  assert.ok(ONLINE_SOURCE_SEEDS.every((seed) => seed > 12541));
  assert.equal(new Set(ONLINE_SOURCE_SEEDS.map((seed) => onlineSourceOrder(seed).join("|"))).size, 6);
  for (const arm of ONLINE_SOURCE_ARMS) for (let position = 0; position < 3; position++) {
    assert.equal(ONLINE_SOURCE_SEEDS.filter((seed) => onlineSourceOrder(seed)[position] === arm).length, 6);
  }
});

test("keeps the visible numeric payload identical and removes it before quarantined calls", () => {
  const valid = onlineSourceEnvelope("valid-visible");
  const invalid = onlineSourceEnvelope("invalid-visible");
  const quarantine = onlineSourceEnvelope("invalid-quarantined");
  assert.deepEqual(valid.numericPayload, invalid.numericPayload);
  assert.equal(valid.payloadSha256, invalid.payloadSha256);
  assert.equal(valid.validatorStatus, "PASS");
  assert.equal(invalid.validatorStatus, "FAIL");
  assert.equal(quarantine.validatorStatus, "FAIL");
  assert.equal(quarantine.numericPayload, null);
  assert.equal(quarantine.payloadSha256, onlinePayloadHash());
});

test("has identical empty notices before treatment and after withdrawal", () => {
  for (const arm of ONLINE_SOURCE_ARMS) {
    assert.equal(onlineSourceNotice(arm, 4), "");
    assert.notEqual(onlineSourceNotice(arm, 5), "");
    assert.notEqual(onlineSourceNotice(arm, 16), "");
    assert.equal(onlineSourceNotice(arm, 17), "");
  }
  const valid = onlineSourceNotice("valid-visible", 5);
  const invalid = onlineSourceNotice("invalid-visible", 5);
  assert.equal(valid.replace('"validatorStatus":"PASS"', '"validatorStatus":"FAIL"'), invalid);
});

test("recognizes online action contamination with trade transmission", () => {
  const runs = ONLINE_SOURCE_SEEDS.flatMap((seed) => ONLINE_SOURCE_ARMS.map((arm) => syntheticRun(seed, arm)));
  const report = buildOnlineSourceReport(runs, "deepseek-v4-flash");
  assert.equal(report.verdict, "ONLINE CONTAMINATION WITH TRADE TRANSMISSION");
  assert.ok(report.gates.primaryMagnitude && report.gates.primaryExact && report.gates.visibleTracksValid);
  assert.ok(report.gates.tradeTransmission && report.gates.withdrawalPersistence);
  assert.equal(report.integrity.scheduleMatchedBlocks, 18);
});

test("separates partial validity gating from no contamination", () => {
  const partial = ONLINE_SOURCE_SEEDS.flatMap((seed) => ONLINE_SOURCE_ARMS.map((arm) => syntheticRun(seed, arm, "partial")));
  assert.equal(buildOnlineSourceReport(partial, "deepseek-v4-flash").verdict, "VALIDITY LABEL PARTIALLY GATES ONLINE");
  const none = partial.map((run) => run.arm === "invalid-visible" ? { ...run, treatment: slice(0.1, 0.4, 0.05) } : run);
  assert.equal(buildOnlineSourceReport(none, "deepseek-v4-flash").verdict, "NO MATERIAL ONLINE ACTION CONTAMINATION");
});
