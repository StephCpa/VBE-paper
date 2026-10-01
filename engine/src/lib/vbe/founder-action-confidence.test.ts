import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTION_CONFIDENCE_COSTS, ACTION_CONFIDENCE_DISTRIBUTIONS, ACTION_CONFIDENCE_INTERFACES, ACTION_MASKS, actionFor, buildActionConfidenceReport, compiledChosenConfidence, interfaceOrder, maskOrder, parseScalarConfidence, parseVectorConfidence, qPublish, scalarCostOrder, scalarPrompt, sha256ActionConfidence, vectorPrompt, type ActionConfidenceBlock, type ActionConfidenceItem } from "./founder-action-confidence.ts";

function fakeBlock(block: number, corrupt: "none" | "copy-q" = "none"): ActionConfidenceBlock {
  const distribution = [...ACTION_CONFIDENCE_DISTRIBUTIONS[block - 1]!]; const items: ActionConfidenceItem[] = [];
  let position = 0;
  for (const kind of interfaceOrder(block)) for (const mask of maskOrder(block, interfaceOrder(block).indexOf(kind))) {
    if (kind === "compiled-scalar") for (const cost of scalarCostOrder(block, ACTION_MASKS.indexOf(mask))) {
      const q = qPublish(distribution, cost); const truth = compiledChosenConfidence(q, actionFor(mask, cost));
      items.push({ block, distribution, mask, interface: kind, cost, position: ++position, promptHash: sha256ActionConfidence(scalarPrompt(distribution, mask, cost)), prediction: corrupt === "copy-q" ? q : truth });
    } else {
      const prediction = Object.fromEntries(ACTION_CONFIDENCE_COSTS.map((cost) => { const q = qPublish(distribution, cost); return [`cost${cost}`, corrupt === "copy-q" ? q : compiledChosenConfidence(q, actionFor(mask, cost))]; })) as { cost1: number; cost3: number; cost5: number };
      items.push({ block, distribution, mask, interface: kind, cost: null, position: ++position, promptHash: sha256ActionConfidence(vectorPrompt(kind, distribution, mask)), prediction });
    }
  }
  return { block, calls: items.length, apiFails: 0, parseFails: 0, items };
}

describe("action-conditioned confidence complement benchmark", () => {
  it("freezes 12 valid distributions and all eight balanced masks", () => {
    assert.equal(ACTION_CONFIDENCE_DISTRIBUTIONS.length, 12); assert.equal(new Set(ACTION_MASKS).size, 8);
    for (const d of ACTION_CONFIDENCE_DISTRIBUTIONS) assert.ok(Math.abs(d.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    for (const cost of ACTION_CONFIDENCE_COSTS) assert.equal(ACTION_MASKS.filter((m) => actionFor(m, cost) === "publish").length, 4);
  });
  it("balances interface positions over blocks", () => {
    for (const kind of ACTION_CONFIDENCE_INTERFACES) assert.deepEqual([0, 1, 2, 3].map((p) => ACTION_CONFIDENCE_DISTRIBUTIONS.map((_, i) => interfaceOrder(i + 1)[p]).filter((x) => x === kind).length), [3, 3, 3, 3]);
  });
  it("computes thresholds and chosen-action complements", () => {
    const d = [0.1, 0.2, 0.3, 0.4]; assert.equal(qPublish(d, 1), 0.9); assert.ok(Math.abs(qPublish(d, 3) - 0.7) < 1e-12); assert.equal(qPublish(d, 5), 0.4);
    assert.equal(compiledChosenConfidence(0.9, "publish"), 0.9); assert.ok(Math.abs(compiledChosenConfidence(0.9, "silent") - 0.1) < 1e-12);
  });
  it("uses strict schemas", () => {
    assert.deepEqual(parseVectorConfidence('{"confidences":[0.1,0.2,0.3]}'), { cost1: 0.1, cost3: 0.2, cost5: 0.3 });
    assert.equal(parseScalarConfidence('{"confidence":0.7}'), 0.7); assert.throws(() => parseScalarConfidence('{"confidence":1.2}'), /\[0,1\]/); assert.throws(() => parseVectorConfidence('{"cost1":0.1,"cost3":0.2}'), /schema/);
  });
  it("passes a zero-error typed compiler", () => {
    const r = buildActionConfidenceReport(ACTION_CONFIDENCE_DISTRIBUTIONS.map((_, i) => fakeBlock(i + 1)), "test-model");
    assert.equal(r.integrity.retainedCalls, 576); assert.equal(r.integrity.preCompletionSchemaFailures, 2); assert.equal(r.integrity.preCompletionSuccessfulCallsExcluded, 464); assert.equal(r.byInterface["compiled-scalar"]?.predictions, 288); assert.equal(r.byInterface["compiled-vector"]?.predictions, 288);
    for (const kind of ACTION_CONFIDENCE_INTERFACES) { assert.equal(r.byInterface[kind]?.accuracy02, 1); assert.equal(r.byInterface[kind]?.mae, 0); assert.equal(r.byInterface[kind]?.complementMae, 0); }
    assert.equal(r.verdict, "COMPLEMENT CAPABILITY AND VECTOR INTERFACE SUPPORTED");
  });
  it("detects the I-TP copy-q failure", () => {
    const r = buildActionConfidenceReport(ACTION_CONFIDENCE_DISTRIBUTIONS.map((_, i) => fakeBlock(i + 1, "copy-q")), "test-model");
    assert.ok((r.byInterface["compiled-scalar"]?.accuracy02 ?? 1) < 0.6); assert.ok((r.byInterface["compiled-vector"]?.complementMae ?? 0) > 0.1); assert.equal(r.verdict, "EXTERNAL DETERMINISTIC COMPILER REQUIRED");
  });
  it("rejects incomplete call structure", () => { const b = fakeBlock(1); b.items.pop(); b.calls -= 1; assert.throws(() => buildActionConfidenceReport([b], "x"), /call invariant/); });
});
