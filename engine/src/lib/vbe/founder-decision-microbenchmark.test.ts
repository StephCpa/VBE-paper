import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  MICRO_BLOCKS,
  MICRO_CELLS,
  MICRO_MODES,
  arithmeticOrder,
  arithmeticTruth,
  buildMicroReport,
  decisionOrder,
  isArithmeticCorrect,
  microArithmeticPrompt,
  microDecisionPrompt,
  parseMicroArithmetic,
  parseMicroDecision,
  type MicroRecord,
} from "./founder-decision-microbenchmark.ts";

function fakeRecords(publish: (r: Omit<MicroRecord, "decision" | "arithmetic" | "arithmeticCorrect" | "promptHash" | "decisionPosition" | "arithmeticPosition">) => boolean): MicroRecord[] {
  return MICRO_BLOCKS.flatMap((block) => MICRO_CELLS.map((cell) => {
    const base = { block, cellId: cell.id, mode: cell.mode, role: cell.role, score: cell.score };
    const truth = arithmeticTruth(cell.mode);
    return {
      ...base,
      decisionPosition: decisionOrder(block).findIndex((c) => c.id === cell.id) + 1,
      arithmeticPosition: arithmeticOrder(block).findIndex((c) => c.id === cell.id) + 1,
      promptHash: createHash("sha256").update(microDecisionPrompt(cell, block)).digest("hex"),
      decision: { publish: publish(base), rationale: "test" },
      arithmetic: { ...truth, explanation: "test" },
      arithmeticCorrect: true,
    };
  }));
}

describe("founder decision-interface microbenchmark", () => {
  it("crosses four states with five contract modes", () => {
    assert.equal(MICRO_CELLS.length, 20);
    assert.equal(new Set(MICRO_CELLS.map((c) => c.id)).size, 20);
    assert.equal(MICRO_MODES.length, 5);
  });

  it("balances every condition over every call position", () => {
    for (const cell of MICRO_CELLS) {
      const decisionPositions = MICRO_BLOCKS.map((b) => decisionOrder(b).findIndex((c) => c.id === cell.id) + 1).sort((a, b) => a - b);
      const arithmeticPositions = MICRO_BLOCKS.map((b) => arithmeticOrder(b).findIndex((c) => c.id === cell.id) + 1).sort((a, b) => a - b);
      assert.deepEqual(decisionPositions, MICRO_BLOCKS);
      assert.deepEqual(arithmeticPositions, MICRO_BLOCKS);
    }
  });

  it("keeps matched economics and isolates timing and semantics", () => {
    const easy = MICRO_CELLS.find((c) => c.id === "lottery-delayed|Easy|0")!;
    const trade = MICRO_CELLS.find((c) => c.id === "trade-delayed|Easy|0")!;
    const lp = microDecisionPrompt(easy, 1);
    const tp = microDecisionPrompt(trade, 1);
    assert.match(lp, /13\/18/);
    assert.match(tp, /13\/18/);
    assert.match(lp, /end of round 24/);
    assert.match(tp, /end of round 24/);
    assert.match(tp, /counterparties pay no fee/);
  });

  it("parses strict decision and arithmetic schemas", () => {
    assert.deepEqual(parseMicroDecision('{"publish":true,"rationale":"positive"}'), { publish: true, rationale: "positive" });
    assert.throws(() => parseMicroDecision('{"publish":true,"rationale":"x","extra":1}'), /fields/);
    const value = parseMicroArithmetic('{"expectedGross":2.6667,"expectedNet":1.6667,"minimumNet":1,"dominantAction":"publish","explanation":"8\/3-1"}');
    assert.equal(isArithmeticCorrect("trade-delayed", value), true);
    assert.match(microArithmeticPrompt(MICRO_CELLS[0]!, 1), /CALCULATION PROBE ONLY/);
    assert.doesNotMatch(microArithmeticPrompt(MICRO_CELLS[0]!, 1), /short arithmetic/);
    assert.equal(isArithmeticCorrect("lottery-immediate", parseMicroArithmetic('{"expectedGross":2.6667,"expectedNet":1.6667,"minimumNet":1,"dominantAction":"publish"}')), true);
  });

  it("uses the final complete JSON when provider output exposes a draft object", () => {
    const text = '{"expectedGross":1.5,"expectedNet":0.5,"minimumNet":-1,"dominantAction":"publish","explanation":"draft"}<end>{"expectedGross":2.6667,"expectedNet":1.6667,"minimumNet":1,"dominantAction":"publish","explanation":"final"}';
    const value = parseMicroArithmetic(text);
    assert.equal(value.explanation, "final");
    assert.equal(isArithmeticCorrect("trade-delayed", value), true);
  });

  it("returns robust only when every dominance guard passes", () => {
    const report = buildMicroReport(fakeRecords(() => true), "test-model");
    assert.equal(report.corePublicationRate, 1);
    assert.equal(report.arithmeticAccuracy, 1);
    assert.equal(report.guardrails.pass, true);
    assert.equal(report.verdict, "KNOWN-DISTRIBUTION DOMINANCE ROBUST");
  });

  it("detects a frozen current-score effect", () => {
    const report = buildMicroReport(fakeRecords((r) => r.score === 3), "test-model");
    assert.equal(report.factorEffects.score?.mean, 1);
    assert.equal(report.factorEffects.score?.triggers, true);
    assert.equal(report.verdict, "STATE/DELAY/SEMANTICS DECISION SENSITIVITY");
  });

  it("rejects corrupted arithmetic coding", () => {
    const records = fakeRecords(() => true);
    records[0]!.arithmeticCorrect = false;
    assert.throws(() => buildMicroReport(records, "test-model"), /arithmetic coding/);
  });
});
