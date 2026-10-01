import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBeliefProbe, parseBuyerProbe } from "./epistemic-gates.ts";

describe("epistemic calibration gates", () => {
  it("parses the exact buyer action", () => {
    assert.deepEqual(
      parseBuyerProbe('{"giveCheck":false,"giveChits":1,"requireChit":false}'),
      { giveCheck: false, giveChits: 1, requireChit: false },
    );
  });

  it("rejects a fractional mark transfer", () => {
    assert.throws(
      () => parseBuyerProbe('{"giveCheck":false,"giveChits":0.5,"requireChit":false}'),
      /giveChits/,
    );
  });

  it("parses bounded integer forecasts", () => {
    assert.deepEqual(
      parseBeliefProbe('{"expectedAcceptors":6,"expectedPeerForecast":5}'),
      { expectedAcceptors: 6, expectedPeerForecast: 5 },
    );
    assert.throws(
      () => parseBeliefProbe('{"expectedAcceptors":7,"expectedPeerForecast":5}'),
      /expectedAcceptors/,
    );
  });
});

