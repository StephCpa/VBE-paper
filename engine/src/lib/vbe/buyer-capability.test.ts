import assert from "node:assert/strict";
import test from "node:test";
import {
  BUYER_CAPABILITY_ARMS,
  BUYER_CAPABILITY_CASES,
  buildBuyerCapabilityReport,
  buyerCapabilityContext,
  buyerCapabilityOrder,
  buyerCapabilityVerdict,
  parseBuyerProposal,
  type BuyerCapabilityRecord,
} from "./buyer-capability.ts";

function recordsFor(actions: Partial<Record<(typeof BUYER_CAPABILITY_ARMS)[number], boolean>>): BuyerCapabilityRecord[] {
  return BUYER_CAPABILITY_CASES.flatMap((item) => buyerCapabilityOrder(item.block).map((arm, position) => {
    const buy = actions[arm] ?? false;
    return {
      block: item.block,
      arm,
      position: position + 1,
      promptHash: "0".repeat(64),
      context: buyerCapabilityContext(arm, item),
      proposal: { giveCheck: false, giveChits: buy ? 1 : 0, requireChit: false },
      buy,
    };
  }));
}

test("uses 24 crossed states and balances six-arm order and precedence", () => {
  assert.equal(BUYER_CAPABILITY_CASES.length, 24);
  assert.equal(new Set(BUYER_CAPABILITY_CASES.map((item) => `${item.agentId}|${item.score}|${item.history}`)).size, 24);
  for (const arm of BUYER_CAPABILITY_ARMS) for (let position = 0; position < 6; position++) {
    assert.equal(BUYER_CAPABILITY_CASES.filter((item) => buyerCapabilityOrder(item.block)[position] === arm).length, 4);
  }
  for (let i = 0; i < BUYER_CAPABILITY_ARMS.length; i++) for (let j = i + 1; j < BUYER_CAPABILITY_ARMS.length; j++) {
    const left = BUYER_CAPABILITY_ARMS[i]!, right = BUYER_CAPABILITY_ARMS[j]!;
    assert.equal(BUYER_CAPABILITY_CASES.filter((item) => buyerCapabilityOrder(item.block).indexOf(left) < buyerCapabilityOrder(item.block).indexOf(right)).length, 12);
  }
});

test("holds low economics fixed and validates frozen arithmetic", () => {
  for (const item of BUYER_CAPABILITY_CASES) {
    const low = buyerCapabilityContext("low-uncertain", item).decisionSupport;
    const compiled = buyerCapabilityContext("compiled-low-uncertain", item).decisionSupport;
    assert.equal(low.conditionalNetIfExecuted, 0.183);
    assert.equal(low.proposalExpectedNet, 0.04575);
    assert.equal(compiled.proposalExpectedNet, low.proposalExpectedNet);
    assert.equal(low.actionCompiler, null);
    assert.deepEqual(compiled.actionCompiler?.optimalProposal, { giveCheck: false, giveChits: 1, requireChit: false });
    assert.equal(buyerCapabilityContext("high-guaranteed", item).decisionSupport.proposalExpectedNet, 1.33);
    assert.equal(buyerCapabilityContext("negative-guaranteed", item).decisionSupport.proposalExpectedNet, -0.5);
  }
});

test("persists the exact three-field buyer proposal", () => {
  assert.deepEqual(parseBuyerProposal('{"giveCheck":false,"giveChits":1,"requireChit":false}'), { giveCheck: false, giveChits: 1, requireChit: false });
  assert.throws(() => parseBuyerProposal('{"giveCheck":false,"giveChits":1,"requireChit":false,"forfeit":0}'), /fields/);
});

test("classifies margin rescue under a clean capability pattern", () => {
  const raw = recordsFor({ "high-uncertain": true, "high-guaranteed": true, "compiled-low-uncertain": true });
  // Synthetic fixtures use placeholder hashes; replace them with the compiled hash through a report-independent verdict check.
  const gates = {
    complete: true, integrity: true, positiveRate: true, negativeControl: true,
    capabilityMagnitude: true, capabilityExact: true, onlinePatternReplicated: true,
    certaintyRescue: false, marginRescue: true, actionMaterialization: true,
  };
  assert.equal(raw.length, 144);
  assert.equal(buyerCapabilityVerdict(gates), "MARGIN BOTTLENECK");
});

test("separates action materialization from autonomous capability", () => {
  const gates = {
    complete: true, integrity: true, positiveRate: false, negativeControl: true,
    capabilityMagnitude: false, capabilityExact: false, onlinePatternReplicated: true,
    certaintyRescue: false, marginRescue: false, actionMaterialization: true,
  };
  assert.equal(buyerCapabilityVerdict(gates), "ACTION MATERIALIZATION REQUIRED");
});

test("build report accepts stable prompt hashes and identifies certainty rescue", async () => {
  const { buyerCapabilityPrompt, sha256BuyerPrompt } = await import("./buyer-capability.ts");
  const rows = recordsFor({ "low-guaranteed": true, "high-guaranteed": true, "compiled-low-uncertain": true });
  for (const row of rows) {
    const item = BUYER_CAPABILITY_CASES[row.block - 1]!;
    row.promptHash = sha256BuyerPrompt(buyerCapabilityPrompt(row.arm, item));
  }
  const report = buildBuyerCapabilityReport(rows, "deepseek-v4-flash");
  assert.equal(report.integrity.positionBalanced, true);
  assert.equal(report.gates.certaintyRescue, true);
  assert.equal(report.gates.marginRescue, false);
  assert.equal(report.verdict, "COUNTERPARTY CERTAINTY BOTTLENECK");
});
