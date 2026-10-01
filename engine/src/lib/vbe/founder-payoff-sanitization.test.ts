import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { COMPILER_FACTS } from "./founder-payoff-compiler.ts";
import {
  SANITIZATION_BLOCKS,
  SANITIZATION_CELLS,
  SANITIZATION_REPRESENTATIONS,
  applySanitizedActionGate,
  buildSanitizationReport,
  correctSanitizationDecision,
  parseSanitizationDecision,
  sanitizationOrder,
  sanitizationPrompt,
  type SanitizationRecord,
  type SanitizationRepresentation,
} from "./founder-payoff-sanitization.ts";

function fakeRecords(isCorrect: (representation: SanitizationRepresentation, scenario: "positive" | "negative") => boolean): SanitizationRecord[] {
  return SANITIZATION_BLOCKS.flatMap((block) => SANITIZATION_CELLS.map((cell) => {
    const correct = isCorrect(cell.representation, cell.scenario);
    const expected = COMPILER_FACTS[cell.scenario].correctPublish;
    const decision = { publish: correct ? expected : !expected, rationale: "test" };
    const prompt = sanitizationPrompt(cell, block);
    return {
      block,
      cellId: cell.id,
      state: cell.state,
      scenario: cell.scenario,
      representation: cell.representation,
      position: sanitizationOrder(block).findIndex((c) => c.id === cell.id) + 1,
      promptHash: createHash("sha256").update(prompt).digest("hex"),
      decision,
      correct: correctSanitizationDecision(cell.scenario, decision),
    };
  }));
}

describe("pre-context payoff sanitization", () => {
  it("crosses two states, two signs, and five trust-boundary representations", () => {
    assert.equal(SANITIZATION_CELLS.length, 20);
    assert.equal(new Set(SANITIZATION_CELLS.map((c) => c.id)).size, 20);
    assert.equal(SANITIZATION_REPRESENTATIONS.length, 5);
  });

  it("balances every cell over every call position", () => {
    for (const cell of SANITIZATION_CELLS) {
      const positions = SANITIZATION_BLOCKS.map((b) => sanitizationOrder(b).findIndex((c) => c.id === cell.id) + 1).sort((a, b) => a - b);
      assert.deepEqual(positions, SANITIZATION_BLOCKS);
    }
  });

  it("exposes bad numbers only in the inline-rejected arm", () => {
    const get = (representation: SanitizationRepresentation) => sanitizationPrompt(SANITIZATION_CELLS.find((c) => c.state === "Hard-0" && c.scenario === "positive" && c.representation === representation)!, 1);
    assert.match(get("inline-rejected"), /UNTRUSTED SUMMARY:.*expected_net=-2\/9/);
    assert.doesNotMatch(get("redacted-rejected"), /expected_net=-2\/9/);
    assert.match(get("redacted-rejected"), /numeric contents were quarantined and are not present/);
    assert.match(get("sanitized-canonical"), /expected_net=\+8\/9/);
    assert.doesNotMatch(get("sanitized-canonical"), /validation event|failed validation/i);
  });

  it("adds a mechanically compiled action only in the recommendation arm", () => {
    const canonical = SANITIZATION_CELLS.find((c) => c.id === "Easy-3|positive|sanitized-canonical")!;
    const recommended = SANITIZATION_CELLS.find((c) => c.id === "Easy-3|positive|sanitized-recommendation")!;
    assert.doesNotMatch(sanitizationPrompt(canonical, 1), /mechanically_compiled_action/);
    assert.match(sanitizationPrompt(recommended, 1), /mechanically_compiled_action=publish/);
  });

  it("enforces the strict decision schema", () => {
    assert.deepEqual(parseSanitizationDecision('{"publish":true,"rationale":"positive EV"}'), { publish: true, rationale: "positive EV" });
    assert.throws(() => parseSanitizationDecision('{"publish":true,"rationale":"x","confidence":1}'), /fields/);
  });

  it("keeps the action gate separate and deterministic", () => {
    assert.deepEqual(applySanitizedActionGate("positive", { publish: false, rationale: "x" }), { proposed: false, executed: true, intervened: true, correct: true });
    assert.deepEqual(applySanitizedActionGate("negative", { publish: false, rationale: "x" }), { proposed: false, executed: false, intervened: false, correct: true });
  });

  it("supports pre-context sanitization only with rescue and absolute guards", () => {
    const report = buildSanitizationReport(fakeRecords((r) => r !== "inline-rejected"), "test-model");
    assert.equal(report.effects.positiveRedactionRescue?.mean, 1);
    assert.equal(report.guardrails.pass, true);
    assert.equal(report.verdict, "PRE-CONTEXT SANITIZATION SUPPORTED");
  });

  it("distinguishes an effect from a failed safety floor", () => {
    const records = fakeRecords((r, scenario) => r !== "inline-rejected" && !(r === "redacted-rejected" && scenario === "negative"));
    const report = buildSanitizationReport(records, "test-model");
    assert.equal(report.effects.positiveRedactionRescue?.passes, true);
    assert.equal(report.guardrails.pass, false);
    assert.equal(report.verdict, "REDACTION EFFECT WITHOUT SAFETY FLOOR");
  });

  it("rejects corrupted accuracy coding", () => {
    const records = fakeRecords(() => true);
    records[0]!.correct = false;
    assert.throws(() => buildSanitizationReport(records, "test-model"), /accuracy coding/);
  });
});
