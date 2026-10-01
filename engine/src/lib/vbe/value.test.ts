import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  coordinationWindow,
  finiteBreakEvenShare,
  finiteMarginalMarkValue,
  geometricBreakEvenShare,
  geometricMarginalMarkValue,
  markSpendGain,
  minimumCommittedCount,
  universalSpendOpportunity,
} from "./value.ts";

describe("Gate-0 marginal mark value", () => {
  it("matches the exact role and pairing probabilities in the engine", () => {
    assert.ok(Math.abs(markSpendGain(DEFAULT_PARAMS) - 1.83) < 1e-12);
    assert.equal(universalSpendOpportunity(DEFAULT_PARAMS), 0.4 * 0.5 * (4 / 7));
  });

  it("inverts finite value at the break-even share", () => {
    const share = finiteBreakEvenShare(12, DEFAULT_PARAMS);
    assert.notEqual(share, null);
    assert.ok(
      Math.abs(finiteMarginalMarkValue(12, share!, DEFAULT_PARAMS) - DEFAULT_PARAMS.v) <
        1e-10,
    );
  });

  it("finds k=2 marginally sufficient with twelve future rounds", () => {
    const share = finiteBreakEvenShare(12, DEFAULT_PARAMS);
    assert.equal(minimumCommittedCount(share, DEFAULT_PARAMS), 2);
    const k2 = finiteMarginalMarkValue(12, 2 / 7, DEFAULT_PARAMS);
    assert.ok(k2 > DEFAULT_PARAMS.v);
    assert.ok(k2 < 0.7);
  });

  it("finds a clean coordination window for one committed acceptor", () => {
    const window = coordinationWindow(1, DEFAULT_PARAMS);
    assert.deepEqual(window, {
      firstRound: 5,
      lastRound: 21,
      rounds: Array.from({ length: 17 }, (_, i) => i + 5),
    });
  });

  it("supports a memoryless-horizon check", () => {
    const share = geometricBreakEvenShare(0.95, DEFAULT_PARAMS);
    assert.notEqual(share, null);
    assert.ok(
      Math.abs(
        geometricMarginalMarkValue(0.95, share!, DEFAULT_PARAMS) - DEFAULT_PARAMS.v,
      ) < 1e-10,
    );
  });
});
