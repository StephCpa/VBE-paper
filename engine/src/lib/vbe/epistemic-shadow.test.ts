import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseShadowProbe,
  scoreShadowProbes,
  shadowProbePrompt,
  summarizeShadowProbes,
  type ShadowProbeRecord,
} from "./epistemic-shadow.ts";
import type { AgentState } from "./types.ts";

describe("epistemic shadow belief instrument", () => {
  it("parses bounded categorical counts", () => {
    assert.deepEqual(
      parseShadowProbe('{"wouldSell":true,"peerSellerCount":2,"peerMajorityForecastCount":4}'),
      { wouldSell: true, firstCount: 2, secondCount: 4 },
    );
    assert.throws(
      () => parseShadowProbe('{"wouldSell":true,"peerSellerCount":2.5,"peerMajorityForecastCount":4}'),
      /peerSellerCount/,
    );
    assert.throws(
      () => parseShadowProbe('{"wouldSell":true,"peerSellerCount":6,"peerMajorityForecastCount":4}'),
      /peerSellerCount/,
    );
  });

  it("keeps the policy fact fixed and changes only delivery metadata", () => {
    const me: AgentState = {
      id: 2,
      type: "H",
      checks: 1,
      chits: 1,
      score: 4,
      solved: false,
      receivedFrom: null,
      memory: [],
    };
    const privatePrompt = shadowProbePrompt(me, 10, "private");
    const publicPrompt = shadowProbePrompt(me, 10, "public");
    assert.match(privatePrompt, /Agents #0 and #1 each use the same fixed strategy/);
    assert.match(publicPrompt, /Agents #0 and #1 each use the same fixed strategy/);
    assert.match(privatePrompt, /no evidence about whether another non-fixed agent received/);
    assert.match(publicPrompt, /visible to every agent throughout the run/);
    assert.match(publicPrompt, /does not execute an action/);
    assert.match(publicPrompt, /peerMajorityForecastCount/);
  });

  it("scores first and second order forecasts against peer probes", () => {
    const records: ShadowProbeRecord[] = Array.from({ length: 6 }, (_, offset) => ({
      t: 5,
      agentId: offset + 2,
      wouldSell: offset < 4,
      firstCount: 4,
      secondCount: 5,
    }));
    const scored = scoreShadowProbes(records);
    assert.equal(scored.length, 6);
    assert.equal(scored[0]!.firstTarget, 3);
    assert.equal(scored[5]!.firstTarget, 4);
    assert.equal(scored[0]!.secondTarget, 5);
    const summary = summarizeShadowProbes(records);
    assert.equal(summary.selfSellRate, 4 / 6);
    assert.equal(summary.firstCount, 4);
    assert.equal(summary.secondCount, 5);
  });

  it("rejects an incomplete checkpoint", () => {
    const records: ShadowProbeRecord[] = [{
      t: 5,
      agentId: 2,
      wouldSell: true,
      firstCount: 0,
      secondCount: 0,
    }];
    assert.throws(() => scoreShadowProbes(records), /has 0 peers/);
  });
});
