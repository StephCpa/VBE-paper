import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PEER_CONFLICT_ARMS,
  PEER_CONFLICT_CASES,
  buildPeerConflictReport,
  parsePeerConflict,
  peerConflictContext,
  peerConflictOrder,
  peerConflictPrompt,
  sha256PeerConflict,
  type PeerConflictArm,
  type PeerConflictRecord,
} from "./peer-probability-conflict.ts";

function recordsFor(choice: (arm: PeerConflictArm) => boolean): PeerConflictRecord[] {
  return PEER_CONFLICT_CASES.flatMap((item) => peerConflictOrder(item.block).map((arm, index) => ({
    block: item.block,
    arm,
    position: index + 1,
    promptHash: sha256PeerConflict(peerConflictPrompt(arm, item)),
    context: peerConflictContext(arm, item),
    sell: choice(arm),
  })));
}

describe("typed peer probability conflict diagnostic", () => {
  it("constructs 24 strict low/high threshold cases", () => {
    assert.equal(PEER_CONFLICT_CASES.length, 24);
    for (const item of PEER_CONFLICT_CASES) {
      assert.ok(item.lowProbability < item.breakEvenProbability);
      assert.ok(item.highProbability > item.breakEvenProbability);
      assert.ok(1.83 * item.lowProbability - 0.5 < 0);
      assert.ok(1.83 * item.highProbability - 0.5 > 0);
    }
  });
  it("uses every four-arm permutation exactly once", () => {
    assert.equal(new Set(PEER_CONFLICT_CASES.map((item) => peerConflictOrder(item.block).join("|"))).size, 24);
    for (const arm of PEER_CONFLICT_ARMS) assert.deepEqual([0, 1, 2, 3].map((position) => PEER_CONFLICT_CASES.filter((item) => peerConflictOrder(item.block)[position] === arm).length), [6, 6, 6, 6]);
    for (const left of PEER_CONFLICT_ARMS) for (const right of PEER_CONFLICT_ARMS) if (left !== right) assert.equal(PEER_CONFLICT_CASES.filter((item) => peerConflictOrder(item.block).indexOf(left) < peerConflictOrder(item.block).indexOf(right)).length, 12);
  });
  it("keeps four explicit history slots and recommendation-free typed fields", () => {
    for (const arm of PEER_CONFLICT_ARMS) {
      const context = peerConflictContext(arm, PEER_CONFLICT_CASES[0]!);
      assert.equal(context.recentHistory.slots.length, 4);
      assert.ok(context.recentHistory.slots.every((slot) => slot.length === 8));
      const prompt = peerConflictPrompt(arm, PEER_CONFLICT_CASES[0]!);
      assert.doesNotMatch(prompt, /recommendedAction/);
      assert.match(prompt, /acceptanceProbability/);
    }
  });
  it("parses only one strict boolean action", () => {
    assert.equal(parsePeerConflict('{"sell":true}'), true);
    assert.throws(() => parsePeerConflict('{"sell":1}'), /schema/);
    assert.throws(() => parsePeerConflict('{"sell":true,"why":"x"}'), /schema/);
  });
  it("classifies typed override after all interpretation gates pass", () => {
    const report = buildPeerConflictReport(recordsFor((arm) => arm === "typed-high-control" || arm === "typed-contradicted"), "test");
    assert.equal(report.verdict, "TYPED OBJECT OVERRIDES RECENT HISTORY");
    assert.ok(report.integrity.orderBalanced && report.integrity.pairwisePrecedenceBalanced);
    assert.equal(report.contrasts.highControlMinusHistory?.exactUpperP, 1 / 2 ** 24);
  });
  it("classifies history override and typed non-consumption separately", () => {
    const history = buildPeerConflictReport(recordsFor((arm) => arm === "typed-high-control"), "test");
    assert.equal(history.verdict, "RECENT HISTORY OVERRIDES TYPED OBJECT");
    const ignored = buildPeerConflictReport(recordsFor(() => false), "test");
    assert.equal(ignored.verdict, "TYPED OBJECT NOT CONSUMED");
  });
  it("rejects a corrupted context", () => {
    const records = recordsFor(() => false);
    records[0]!.context.keepCheckValue = 0.5;
    records[0]!.context.recentHistory.slots[0] = "ACCEPTED";
    assert.throws(() => buildPeerConflictReport(records, "test"), /context mismatch/);
  });
});
