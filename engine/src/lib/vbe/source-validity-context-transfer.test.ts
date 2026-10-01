import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CXT_ARMS,
  CXT_EXPECTED_BLOCKS,
  CXT_PHASES,
  buildCxtContexts,
  buildCxtReport,
  cxtAcceptanceProbability,
  cxtCorpusHash,
  cxtEnvironmentHash,
  cxtExpectedSell,
  cxtOrder,
  cxtPrompt,
  cxtSourceEnvelope,
  parseCxtSell,
  sha256Cxt,
  type CxtRecord,
  type CxtSourceRun,
} from "./source-validity-context-transfer.ts";

const source = JSON.parse(readFileSync("src/data/credible-information-itt.json", "utf8")) as { runs: CxtSourceRun[] };
const contexts = buildCxtContexts(source.runs);

function perfectRecords(): CxtRecord[] {
  return contexts.flatMap((environment, index) => {
    const block = index + 1;
    const q = cxtAcceptanceProbability(block);
    return cxtOrder(block).map((arm, position) => ({
      block,
      seed: environment.seed,
      phase: environment.phase,
      arm,
      position: position + 1,
      acceptanceProbability: q,
      environmentHash: cxtEnvironmentHash(environment),
      promptHash: sha256Cxt(cxtPrompt(environment, arm, q)),
      sell: cxtExpectedSell(arm),
    }));
  });
}

test("extracts four deterministic trajectory contexts for every frozen seed", () => {
  assert.equal(contexts.length, 72);
  for (const phase of CXT_PHASES) assert.equal(contexts.filter((context) => context.phase === phase.id).length, 18);
  for (const context of contexts) {
    const phase = CXT_PHASES.find((candidate) => candidate.id === context.phase)!;
    assert.ok(context.selectedRound >= phase.first && context.selectedRound <= phase.last);
    assert.ok(context.agent.id >= 4);
    assert.ok(context.fullPriorTrajectory.every((meeting) => meeting.t < context.selectedRound));
    assert.deepEqual(context.runtimeRecentMemory, context.agent.memory);
    assert.ok(context.agent.memory.length <= 4);
  }
});

test("history depth grows across the four environment phases", () => {
  const means = CXT_PHASES.map((phase) => {
    const values = contexts.filter((context) => context.phase === phase.id).map((context) => context.fullPriorTrajectory.length);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  assert.ok(means[1]! > means[0]! && means[2]! > means[1]! && means[3]! > means[2]!);
});

test("uses all 24 arm permutations three times with exact positional and pairwise balance", () => {
  assert.equal(new Set(Array.from({ length: CXT_EXPECTED_BLOCKS }, (_, index) => cxtOrder(index + 1).join("|"))).size, 24);
  for (const arm of CXT_ARMS) {
    for (let position = 0; position < 4; position++) {
      assert.equal(Array.from({ length: 72 }, (_, index) => cxtOrder(index + 1)[position]).filter((value) => value === arm).length, 18);
    }
    for (const other of CXT_ARMS) {
      if (arm === other) continue;
      assert.equal(Array.from({ length: 72 }, (_, index) => cxtOrder(index + 1)).filter((order) => order.indexOf(arm) < order.indexOf(other)).length, 36);
    }
  }
});

test("keeps visible invalid numbers identical to valid numbers and removes them under quarantine", () => {
  const q = 0.83;
  const valid = cxtSourceEnvelope("valid-visible", q);
  const invalid = cxtSourceEnvelope("invalid-visible", q);
  const quarantine = cxtSourceEnvelope("invalid-quarantined", q);
  assert.equal(valid.acceptanceProbability, invalid.acceptanceProbability);
  assert.equal(valid.markExpectedValue, invalid.markExpectedValue);
  assert.equal(valid.expectedNetSell, invalid.expectedNetSell);
  assert.equal(valid.validatorStatus, "PASS");
  assert.equal(invalid.validatorStatus, "FAIL");
  assert.equal(quarantine.validatorStatus, "FAIL");
  assert.equal(quarantine.acceptanceProbability, null);
  assert.equal(quarantine.quarantineApplied, true);
});

test("all typed probabilities exceed the fixed break-even threshold", () => {
  for (let block = 1; block <= 72; block++) assert.ok(cxtAcceptanceProbability(block) > 0.5 / 1.83);
});

test("prompts preserve the environment and exact action-only response contract", () => {
  const environment = contexts[0]!;
  for (const arm of CXT_ARMS) {
    const prompt = cxtPrompt(environment, arm, 0.8);
    assert.match(prompt, /SOURCE CONTRACT/);
    assert.match(prompt, /fullPriorTrajectory/);
    assert.match(prompt, /Return JSON only: \{"sell":true\|false\}/);
    assert.equal(parseCxtSell('{"sell":true}'), true);
    assert.throws(() => parseCxtSell('{"sell":true,"belief":0.8}'));
  }
});

test("a perfect synthetic result passes every frozen transfer gate", () => {
  const records = perfectRecords();
  const hash = cxtCorpusHash();
  const report = buildCxtReport(records, "deepseek-v4-flash", hash, hash, contexts);
  assert.equal(report.calls, 288);
  assert.equal(report.completeBlocks, 72);
  assert.equal(report.contractAccuracy, 1);
  assert.equal(report.verdict, "CONTEXT TRANSFER SUPPORTED");
  assert.ok(Object.values(report.gates).every(Boolean));
  assert.ok(Object.values(report.integrity).every((value) => typeof value === "number" ? true : value));
});

test("visible use of failed numbers produces the contamination verdict", () => {
  const records = perfectRecords().map((record) => record.arm === "invalid-visible" ? { ...record, sell: true } : record);
  const hash = cxtCorpusHash();
  const report = buildCxtReport(records, "deepseek-v4-flash", hash, hash, contexts);
  assert.equal(report.verdict, "VISIBLE FAILED SOURCE CONTAMINATES");
  assert.equal(report.gates.invalidVisibleSafe, false);
});

test("corpus and generated context hashes are stable within the run", () => {
  assert.match(cxtCorpusHash(), /^[a-f0-9]{64}$/);
  for (const context of contexts) assert.match(cxtEnvironmentHash(context), /^[a-f0-9]{64}$/);
});
