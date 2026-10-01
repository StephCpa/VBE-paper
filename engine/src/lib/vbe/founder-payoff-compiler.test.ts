import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  COMPILER_BLOCKS,
  COMPILER_CELLS,
  COMPILER_FACTS,
  COMPILER_REPRESENTATIONS,
  buildCompilerReport,
  compilerOrder,
  compilerPrompt,
  correctCompilerDecision,
  parseCompilerDecision,
  type CompilerRecord,
  type CompilerRepresentation,
} from "./founder-payoff-compiler.ts";

function fakeRecords(isCorrect: (representation: CompilerRepresentation) => boolean): CompilerRecord[] {
  return COMPILER_BLOCKS.flatMap((block) => COMPILER_CELLS.map((cell) => {
    const correct = isCorrect(cell.representation);
    const expected = COMPILER_FACTS[cell.scenario].correctPublish;
    const decision = { publish: correct ? expected : !expected, rationale: "test" };
    const prompt = compilerPrompt(cell, block);
    return {
      block,
      cellId: cell.id,
      state: cell.state,
      scenario: cell.scenario,
      representation: cell.representation,
      position: compilerOrder(block).findIndex((c) => c.id === cell.id) + 1,
      promptHash: createHash("sha256").update(prompt).digest("hex"),
      decision,
      correct: correctCompilerDecision(cell.scenario, decision),
    };
  }));
}

describe("verified founder payoff compiler", () => {
  it("crosses two states, two signs, and five representations", () => {
    assert.equal(COMPILER_CELLS.length, 20);
    assert.equal(new Set(COMPILER_CELLS.map((c) => c.id)).size, 20);
    assert.equal(COMPILER_REPRESENTATIONS.length, 5);
  });

  it("balances every cell over all twenty call positions", () => {
    for (const cell of COMPILER_CELLS) {
      const positions = COMPILER_BLOCKS.map((b) => compilerOrder(b).findIndex((c) => c.id === cell.id) + 1).sort((a, b) => a - b);
      assert.deepEqual(positions, COMPILER_BLOCKS);
    }
  });

  it("uses internally correct positive and negative payoff facts", () => {
    assert.deepEqual(COMPILER_FACTS.positive.counts, [6, 8, 3, 1]);
    assert.deepEqual(COMPILER_FACTS.negative.counts, [12, 5, 1, 0]);
    assert.equal((8 + 6 + 3) / 18 * 2 - 1, 8 / 9);
    assert.equal((5 + 2) / 18 * 2 - 1, -2 / 9);
  });

  it("holds raw tables fixed while changing compiler metadata", () => {
    const raw = COMPILER_CELLS.find((c) => c.id === "Hard-0|positive|raw-only")!;
    const verified = COMPILER_CELLS.find((c) => c.id === "Hard-0|positive|verified-correct")!;
    const rejected = COMPILER_CELLS.find((c) => c.id === "Hard-0|positive|rejected-false")!;
    for (const prompt of [compilerPrompt(raw, 1), compilerPrompt(verified, 1), compilerPrompt(rejected, 1)]) {
      assert.match(prompt, /0 payout units: 6\/18/);
      assert.match(prompt, /1 payout unit: 8\/18/);
    }
    assert.match(compilerPrompt(verified, 1), /verification_status=PASS/);
    assert.match(compilerPrompt(rejected, 1), /verification_status=FAIL/);
    assert.match(compilerPrompt(rejected, 1), /expected_net=17\/9-1=\+8\/9/);
    assert.match(compilerPrompt(rejected, 1), /RECEIVED UNTRUSTED SUMMARY:.*expected_net=-2\/9/);
  });

  it("enforces the strict decision schema", () => {
    assert.deepEqual(parseCompilerDecision('{"publish":false,"rationale":"negative EV"}'), { publish: false, rationale: "negative EV" });
    assert.throws(() => parseCompilerDecision('{"publish":true,"rationale":"x","value":1}'), /fields/);
  });

  it("supports compiler rescue and verification recovery only together", () => {
    const report = buildCompilerReport(fakeRecords((r) => r === "correct-summary" || r === "verified-correct" || r === "rejected-false"), "test-model");
    assert.equal(report.effects.compilerRescue?.mean, 1);
    assert.equal(report.effects.verificationRecovery?.mean, 1);
    assert.equal(report.verdict, "VERIFIED PAYOFF COMPILER SUPPORTED");
  });

  it("separates verification value from a raw-interface ceiling", () => {
    const report = buildCompilerReport(fakeRecords((r) => r !== "false-summary"), "test-model");
    assert.equal(report.effects.compilerRescue?.mean, 0);
    assert.equal(report.effects.verificationRecovery?.passes, true);
    assert.equal(report.verdict, "VERIFICATION VALUE WITHOUT RAW RESCUE");
  });

  it("rejects corrupted accuracy coding", () => {
    const records = fakeRecords(() => true);
    records[0]!.correct = false;
    assert.throws(() => buildCompilerReport(records, "test-model"), /accuracy coding/);
  });
});
