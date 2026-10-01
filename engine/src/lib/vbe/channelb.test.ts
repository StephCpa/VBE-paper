import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildBarterExamples,
  buildChannelBReport,
  buildKwExamples,
} from "./channelb.ts";

describe("channel b transcripts", () => {
  it("KW examples include a mark sale and do not include the Harari story", () => {
    const text = buildKwExamples();
    assert.match(text, /chit-for-check/);
    assert.doesNotMatch(text, /paper tickets/);
    assert.ok(text.split("\n").length >= 3);
  });

  it("barter examples are length-matched swaps without mark sales", () => {
    const text = buildBarterExamples();
    assert.match(text, /swap/);
    assert.doesNotMatch(text, /chit-for-check/);
  });

  it("verdict is CHANNEL B when only KW transcripts induce sales", () => {
    const report = buildChannelBReport(
      [
        {
          bank: "kw",
          condition: "label",
          seed: 1,
          calls: 0,
          parseFails: 0,
          apiFails: 0,
          meanScore: 58,
          accInterior: 0.5,
          heOffersInterior: 8,
          heAcceptsInterior: 4,
          accEnd: 0,
          result: {
            scores: [],
            meanScore: 58,
            heOffersInterior: 8,
            heAcceptsInterior: 4,
            heOffersEnd: 0,
            heAcceptsEnd: 0,
            accInterior: 0.5,
            accEnd: 0,
            rounds: [],
          },
        },
        {
          bank: "barter",
          condition: "label",
          seed: 1,
          calls: 0,
          parseFails: 0,
          apiFails: 0,
          meanScore: 57,
          accInterior: 0,
          heOffersInterior: 6,
          heAcceptsInterior: 0,
          accEnd: 0,
          result: {
            scores: [],
            meanScore: 57,
            heOffersInterior: 6,
            heAcceptsInterior: 0,
            heOffersEnd: 0,
            heAcceptsEnd: 0,
            accInterior: 0,
            accEnd: 0,
            rounds: [],
          },
        },
      ],
      { kw: "x", barter: "y" },
    );
    assert.match(report.verdict, /CHANNEL B/);
  });
});
