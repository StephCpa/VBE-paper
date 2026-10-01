import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BELIEF_SENSITIVITY_SEEDS,
  scoreRepairedBeliefs,
} from "./belief-instrument-sensitivity.ts";
import {
  REPAIRED_BELIEF_INSTRUCTION,
  validateRepairedBeliefResponse,
} from "./belief-instrument-sensitivity-execution.ts";
import type { RunResult } from "./types.ts";

describe("repaired belief instrument", () => {
  it("uses eight unique new seeds and explicit per-report stakes", () => {
    assert.equal(BELIEF_SENSITIVITY_SEEDS.length, 8);
    assert.equal(new Set(BELIEF_SENSITIVITY_SEEDS).size, 8);
    assert.match(REPAIRED_BELIEF_INSTRUCTION, /EVERY report is settled separately/);
    assert.match(REPAIRED_BELIEF_INSTRUCTION, /up to 0\.5 points/);
    assert.match(REPAIRED_BELIEF_INSTRUCTION, /all-0\.5 model profile does not/);
  });

  it("enforces the exact bounded response schema", () => {
    assert.equal(validateRepairedBeliefResponse('{"giveCheck":true,"giveChits":0,"requireChit":true,"pAccept":0.8,"pSecond":0.7}'), null);
    assert.match(validateRepairedBeliefResponse('{"giveCheck":true,"giveChits":0,"requireChit":true,"pAccept":0.8,"pSecond":2}')!, /\[0,1\]/);
    assert.match(validateRepairedBeliefResponse('{"giveCheck":true,"giveChits":0,"requireChit":true,"pAccept":0.8,"pSecond":0.7,"extra":0}')!, /exact contract/);
  });

  it("scores every report and displaces the midpoint with truthful robot anchors", () => {
    const meetings = Array.from({ length: 8 }, (_, id) => ({
      t: 5,
      i: id,
      j: (id + 1) % 8,
      iType: "E" as const,
      jType: "H" as const,
      pi: { giveCheck: true, giveChits: 0, requireChit: true },
      pj: { giveCheck: false, giveChits: 1, requireChit: false },
      kind: "chit-for-check" as const,
      seller: id,
      buyer: (id + 1) % 8,
      hardHadChit: true,
      easyHadCheck: true,
    }));
    const result: RunResult = {
      scores: Array(8).fill(50),
      meanScore: 50,
      heOffersInterior: 8,
      heAcceptsInterior: 8,
      heOffersEnd: 0,
      heAcceptsEnd: 0,
      accInterior: 1,
      accEnd: 0,
      rounds: [{ t: 5, types: Array(8).fill("E"), chits: Array(8).fill(0.5), scores: Array(8).fill(0), meetings, solved: Array(8).fill(true), heOffers: 8, heAccepts: 8 }],
    };
    const records = [4, 5, 6, 7].flatMap((agentId) => [
      { t: 5, agentId, pAccept: 1, pSecond: 1 },
      { t: 6, agentId, pAccept: 1, pSecond: 1 },
    ]);
    const scored = scoreRepairedBeliefs(result, records);
    assert.equal(scored.scores.length, records.length);
    assert.equal(scored.meanPSecondTargetDisplacement, 0.5);
    assert.ok(scored.lossImprovement > 0);
    assert.equal(scored.beliefBonusByAgent["4"], 1);
  });
});
