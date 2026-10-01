import { it } from "node:test";
import assert from "node:assert/strict";
import { applyMeetings } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, Proposal } from "./types.ts";

const idle: Proposal = { giveCheck: false, giveChits: 0, requireChit: false };
const params = { ...DEFAULT_PARAMS, n: 2 };

function agents(): [AgentState, AgentState] {
  return ["E", "H"].map((type, id) => ({
    id,
    type,
    checks: 1,
    chits: id,
    score: type === "E" ? params.R : 0,
    solved: type === "E",
    receivedFrom: null,
    memory: [],
  })) as [AgentState, AgentState];
}

function settle(seller: Proposal, buyer: Proposal, hardDraw: number) {
  const [i, j] = agents();
  const result = applyMeetings(
    [i, j], 1, params, () => { throw new Error("Unexpected random draw"); },
    [{ i, j, pi: seller, pj: buyer }], [0.5, hardDraw],
  );
  return { agents: [i, j], scores: result.scores, kind: result.meetings[0]!.kind };
}

for (const sale of [false, true]) {
  it(`E→H ${sale ? "mark sale" : "gift"} retains the receiver's own-check salvage`, () => {
    const thresholds = [0, params.pHard, params.pPartner, 1];
    let giverDelta = 0;
    let receiverDelta = 0;
    for (let k = 1; k < thresholds.length; k++) {
      const low = thresholds[k - 1]!;
      const high = thresholds[k]!;
      const hardDraw = (low + high) / 2;
      const weight = high - low;
      const baseline = settle(idle, idle, hardDraw);
      const transfer = settle(
        { giveCheck: true, giveChits: 0, requireChit: sale },
        { giveCheck: false, giveChits: sale ? 1 : 0, requireChit: false },
        hardDraw,
      );
      assert.equal(transfer.kind, sale ? "chit-for-check" : "gift");
      assert.equal(transfer.scores[1], (hardDraw < params.pPartner ? params.R : 0) + params.v);
      assert.equal(transfer.agents[0]!.chits, sale ? 1 : 0);
      assert.equal(transfer.agents[1]!.chits, sale ? 0 : 1);
      giverDelta += weight * (transfer.scores[0]! - baseline.scores[0]!);
      receiverDelta += weight * (transfer.scores[1]! - baseline.scores[1]!);
    }
    const expectedReceiver = params.R * (params.pPartner - params.pHard) + params.v;
    assert.ok(Math.abs(giverDelta + params.v) < 1e-12);
    assert.ok(Math.abs(receiverDelta - expectedReceiver) < 1e-12);
    assert.ok(Math.abs(giverDelta + receiverDelta - params.R * (params.pPartner - params.pHard)) < 1e-12);
    assert.ok(Math.abs(receiverDelta - 2.33) < 1e-12);
    assert.ok(Math.abs(giverDelta + receiverDelta - 1.83) < 1e-12);
  });
}
