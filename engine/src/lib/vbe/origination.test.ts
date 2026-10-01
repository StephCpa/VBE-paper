import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildOriginReport,
  clopperUpper0,
  codeBroadcast,
  parseBroadcast,
  type OriginRun,
} from "./origination.ts";

describe("origination coding", () => {
  it("codes a concrete mark-for-check rule as MONEY", () => {
    assert.equal(
      codeBroadcast("A mark is accepted as payment for one leftover check. Require a mark when giving a leftover check."),
      "MONEY",
    );
  });

  it("codes unconditional leftover gifts as GIFT", () => {
    assert.equal(
      codeBroadcast("Easy agents should give leftover checks for free without requiring marks."),
      "GIFT",
    );
  });

  it("codes greetings as NONE", () => {
    assert.equal(codeBroadcast("Hello everyone, good luck today."), "NONE");
    assert.equal(codeBroadcast("marks"), "NONE");
  });

  it("parseBroadcast requires payBroadcast=1", () => {
    const a = parseBroadcast('{"payBroadcast":1,"broadcast":"hello there friends"}');
    assert.equal(a.pay, true);
    const b = parseBroadcast('{"payBroadcast":0,"broadcast":"a mark pays for one leftover check"}');
    assert.equal(b.pay, false);
  });

  it("0/8 upper bound is about 31%", () => {
    assert.ok(Math.abs(clopperUpper0(8) - 0.312) < 0.02);
  });

  it("NO ORIGINATION when eight open runs are silent", () => {
    const stub = (seed: number): OriginRun => ({
      arm: "open",
      seed,
      calls: 0,
      parseFails: 0,
      apiFails: 0,
      meanScore: 56,
      sales: { offers: 10, accepts: 0, acc: 0 },
      beliefs: { n: 0, pAccept: 0.2, pSecond: 0.2 },
      paid: 0,
      broadcasts: [],
      firstFounding: null,
      accBefore: { offers: 10, accepts: 0, acc: 0 },
      accAfter: { offers: 0, accepts: 0, acc: 0 },
      result: {
        scores: [],
        meanScore: 56,
        heOffersInterior: 10,
        heAcceptsInterior: 0,
        heOffersEnd: 0,
        heAcceptsEnd: 0,
        accInterior: 0,
        accEnd: 0,
        rounds: [],
      },
    });
    const report = buildOriginReport(Array.from({ length: 8 }, (_, i) => stub(i)));
    assert.match(report.verdict, /NO ORIGINATION/);
  });

  it("EVEN FREE when free arm is also silent", () => {
    const silent = (arm: "open" | "free", seed: number): OriginRun => ({
      arm,
      seed,
      calls: 0,
      parseFails: 0,
      apiFails: 0,
      meanScore: 56,
      sales: { offers: 10, accepts: 0, acc: 0 },
      beliefs: { n: 0, pAccept: 0.2, pSecond: 0.2 },
      paid: 0,
      broadcasts: [],
      firstFounding: null,
      accBefore: { offers: 10, accepts: 0, acc: 0 },
      accAfter: { offers: 0, accepts: 0, acc: 0 },
      result: {
        scores: [],
        meanScore: 56,
        heOffersInterior: 10,
        heAcceptsInterior: 0,
        heOffersEnd: 0,
        heAcceptsEnd: 0,
        accInterior: 0,
        accEnd: 0,
        rounds: [],
      },
    });
    const report = buildOriginReport([
      ...Array.from({ length: 8 }, (_, i) => silent("open", i)),
      ...Array.from({ length: 8 }, (_, i) => silent("free", i)),
    ]);
    assert.match(report.verdict, /EVEN FREE/);
  });
});
