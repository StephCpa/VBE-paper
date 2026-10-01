import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  founderPrompt,
  isCanonicalMoney,
  parseFounderDecision,
} from "./founder.ts";

const exact =
  '{"speak":true,"proposal":{"kind":"money","token":"mark","units_per_check":1,"transaction_fee":0,"beneficiary":"none"},"rationale":"coordinate"}';

describe("founder incentive", () => {
  it("parses and recognizes the frozen candidate", () => {
    assert.equal(isCanonicalMoney(parseFounderDecision(exact)), true);
  });

  it("does not refund a changed beneficiary", () => {
    const changed = exact.replace('"beneficiary":"none"', '"beneficiary":"founder"');
    assert.equal(isCanonicalMoney(parseFounderDecision(changed)), false);
  });

  it("changes cost language without changing the candidate", () => {
    const me = { id: 0, type: "E" as const, checks: 1, chits: 0, score: 0 };
    const costly = founderPrompt("costly", me, 1, 24);
    const refund = founderPrompt("refund", me, 1, 24);
    assert.match(costly, /no refund/i);
    assert.match(refund, /immediately refunds exactly 1\.0/i);
    assert.match(costly, /"kind":"money","token":"mark"/);
    assert.match(refund, /"kind":"money","token":"mark"/);
  });
});

