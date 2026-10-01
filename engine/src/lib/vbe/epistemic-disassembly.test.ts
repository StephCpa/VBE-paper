import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoordinationSlice } from "./epistemic.ts";
import {
  DISASSEMBLY_MODES,
  DISASSEMBLY_ORDERS,
  DISASSEMBLY_SEEDS,
  buildDisassemblyReport,
  disassemblyCellKey,
  type DisassemblyMode,
  type DisassemblyRun,
} from "./epistemic-disassembly.ts";

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

function fakeRun(
  delivery: "private" | "public",
  mode: DisassemblyMode,
  seed: number,
  buyer: number,
): DisassemblyRun {
  const calls = 2;
  const hasAux = mode !== "action-only";
  const beliefMode = mode.startsWith("belief-");
  const beliefBonus = mode === "belief-rewarded" ? 0.4 : 0;
  return {
    delivery,
    mode,
    seed,
    calls,
    apiFails: 0,
    parseFails: 0,
    beliefFieldCount: beliefMode ? 2 * calls : 0,
    formatFieldCount: mode === "schema-control" ? 2 * calls : 0,
    robotIds: [0, 1],
    scheduleHash: `seed-${seed}`,
    primaryRounds: { first: 5, last: 21 },
    llmSeller: { ...zeroSlice, sellerIntentPerHe: buyer },
    llmBuyer: { ...zeroSlice, buyerIntentPerHe: buyer },
    llmLlm: { ...zeroSlice, tradePerHe: buyer },
    auxRecords: hasAux
      ? Array.from({ length: calls }, (_, index) => ({
          t: 5 + index,
          agentId: 2 + index,
          fieldA: 0.5,
          fieldB: 0.5,
        }))
      : [],
    aux: { n: hasAux ? calls : 0, fieldA: hasAux ? 0.5 : 0, fieldB: hasAux ? 0.5 : 0 },
    beliefBonus,
    meanScore: buyer,
    totalMeanScore: buyer + beliefBonus,
    result: {
      scores: [],
      meanScore: buyer,
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

function block(seed: number, publicEffects: Record<DisassemblyMode, number>): DisassemblyRun[] {
  return DISASSEMBLY_MODES.flatMap((mode) => [
    fakeRun("private", mode, seed, 0.1),
    fakeRun("public", mode, seed, 0.1 + publicEffects[mode]),
  ]);
}

describe("Study E-D component disassembly", () => {
  it("uses new seeds and balances every cell over all eight positions", () => {
    assert.equal(DISASSEMBLY_SEEDS.length, 8);
    assert.equal(new Set(DISASSEMBLY_SEEDS).size, 8);
    assert.equal(DISASSEMBLY_ORDERS.length, 8);
    const keys = DISASSEMBLY_ORDERS[0]!.map(disassemblyCellKey);
    for (const key of keys) {
      const positions = DISASSEMBLY_ORDERS.map((order) =>
        order.findIndex((cell) => disassemblyCellKey(cell) === key),
      ).sort((a, b) => a - b);
      assert.deepEqual(positions, [0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it("selects belief semantics when it is the only large positive increment", () => {
    const effects: Record<DisassemblyMode, number> = {
      "action-only": 0,
      "schema-control": 0.05,
      "belief-unrewarded": 0.35,
      "belief-rewarded": 0.4,
    };
    const report = buildDisassemblyReport(
      DISASSEMBLY_SEEDS.flatMap((seed) => block(seed, effects)),
      "test-model",
    );
    assert.equal(report.completeBlocks, 8);
    assert.equal(report.bridge.pass, true);
    assert.equal(report.verdict, "BELIEF-SEMANTICS CANDIDATE");
    assert.equal(
      report.componentScreen.find((item) => item.component === "belief-semantics")
        ?.positiveCandidate,
      true,
    );
  });

  it("blocks component attribution when the total package effect is not recovered", () => {
    const effects: Record<DisassemblyMode, number> = {
      "action-only": 0,
      "schema-control": 0.02,
      "belief-unrewarded": 0.04,
      "belief-rewarded": 0.05,
    };
    const report = buildDisassemblyReport(
      DISASSEMBLY_SEEDS.flatMap((seed) => block(seed, effects)),
      "test-model",
    );
    assert.equal(report.bridge.pass, false);
    assert.equal(report.verdict, "PACKAGE EFFECT NOT RECOVERED");
  });

  it("rejects a field-contract violation and schedule drift", () => {
    const bad = fakeRun("private", "schema-control", DISASSEMBLY_SEEDS[0], 0);
    bad.beliefFieldCount = 2;
    assert.throws(() => buildDisassemblyReport([bad], "test"), /contains belief fields/);

    const effects: Record<DisassemblyMode, number> = {
      "action-only": 0,
      "schema-control": 0.1,
      "belief-unrewarded": 0.2,
      "belief-rewarded": 0.4,
    };
    const runs = block(DISASSEMBLY_SEEDS[0], effects);
    runs[7]!.scheduleHash = "different";
    assert.throws(() => buildDisassemblyReport(runs, "test"), /schedule mismatch/);
  });
});
