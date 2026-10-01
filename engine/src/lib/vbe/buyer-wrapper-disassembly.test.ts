import assert from "node:assert/strict";
import test from "node:test";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import { buyerEnvelopePrompt, loadBuyerEnvelopeCases } from "./buyer-envelope-disassembly.ts";
import {
  BUYER_WRAPPER_ARMS,
  BUYER_WRAPPER_SOURCE_SHA256,
  buildBuyerWrapperReport,
  buyerWrapperCaseHash,
  buyerWrapperCorpusHash,
  buyerWrapperObject,
  buyerWrapperOrder,
  buyerWrapperPrompt,
  buyerWrapperVerdict,
  loadBuyerWrapperCases,
  sha256BuyerWrapper,
  type BuyerWrapperArm,
  type BuyerWrapperRecord,
} from "./buyer-wrapper-disassembly.ts";

function syntheticRecords(actions: Partial<Record<BuyerWrapperArm, boolean>>): BuyerWrapperRecord[] {
  return loadBuyerWrapperCases().flatMap((item) => buyerWrapperOrder(item.block).map((arm, position) => {
    const buy = actions[arm] ?? false;
    return {
      block: item.block,
      seed: item.seed,
      phase: item.phase,
      arm,
      position: position + 1,
      contextHash: buyerWrapperCaseHash(item),
      promptHash: sha256BuyerWrapper(buyerWrapperPrompt(arm, item)),
      sourceBuy: item.sourceBuy,
      proposal: { giveCheck: false, giveChits: buy ? 1 : 0, requireChit: false },
      buy,
    };
  }));
}

test("selects 12 new one-per-seed contexts with balanced phases", () => {
  const cases = loadBuyerWrapperCases();
  const prior = new Set([...loadBuyerContextCases(), ...loadBuyerEnvelopeCases()]
    .map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  assert.equal(buyerWrapperCorpusHash(), BUYER_WRAPPER_SOURCE_SHA256);
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map((item) => item.seed)).size, 12);
  assert.equal(cases.filter((item) => item.phase === "early").length, 6);
  assert.equal(cases.filter((item) => item.phase === "late").length, 6);
  assert.deepEqual(cases.map((item) => item.seed), [12547, 12553, 12583, 12589, 12601, 12613, 12619, 12637, 12641, 12647, 12653, 12659]);
  for (const item of cases) {
    assert.equal(prior.has(`${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`), false);
    assert.equal(item.agent.type, "H");
    assert.equal(item.partner.type, "E");
    assert.ok(item.agent.chits >= 1 && item.partner.checks >= 1);
    assert.equal(item.sourceBuy, false);
  }
});

test("balances six arms over position and pairwise precedence", () => {
  const cases = loadBuyerWrapperCases();
  for (const arm of BUYER_WRAPPER_ARMS) for (let position = 0; position < 6; position++) {
    assert.equal(cases.filter((item) => buyerWrapperOrder(item.block)[position] === arm).length, 2);
  }
  for (let i = 0; i < BUYER_WRAPPER_ARMS.length; i++) for (let j = i + 1; j < BUYER_WRAPPER_ARMS.length; j++) {
    const left = BUYER_WRAPPER_ARMS[i]!;
    const right = BUYER_WRAPPER_ARMS[j]!;
    assert.equal(cases.filter((item) => buyerWrapperOrder(item.block).indexOf(left) < buyerWrapperOrder(item.block).indexOf(right)).length, 6);
  }
});

test("reconstructs both exact endpoint prompts", () => {
  for (const item of loadBuyerWrapperCases()) {
    assert.equal(buyerWrapperPrompt("exact-narrow-anchor", item), buyerEnvelopePrompt("narrow-anchor", item));
    assert.equal(buyerWrapperPrompt("exact-public-hard-anchor", item), buyerEnvelopePrompt("public-hard-current-full", item));
  }
});

test("orthogonalizes delivery framing and one-level nesting", () => {
  const item = loadBuyerWrapperCases()[0]!;
  const sf = buyerWrapperObject("harmonized-sealed-flat", item);
  const sn = buyerWrapperObject("harmonized-sealed-nested", item);
  const pf = buyerWrapperObject("harmonized-public-flat", item);
  const pn = buyerWrapperObject("harmonized-public-nested", item);
  assert.equal(sf.deliveryScope, "SEALED_CURRENT_CALL");
  assert.equal(sn.deliveryScope, "SEALED_CURRENT_CALL");
  assert.equal(pf.deliveryScope, "PUBLIC_RUNTIME");
  assert.equal(pn.deliveryScope, "PUBLIC_RUNTIME");
  assert.equal("hardBuyer" in sf.decisionData, false);
  assert.equal("hardBuyer" in pf.decisionData, false);
  assert.equal("hardBuyer" in sn.decisionData, true);
  assert.equal("hardBuyer" in pn.decisionData, true);
  const fields = (object: typeof sf) => "hardBuyer" in object.decisionData ? object.decisionData.hardBuyer : object.decisionData;
  assert.deepEqual(fields(sf), fields(sn));
  assert.deepEqual(fields(sf), fields(pf));
  assert.deepEqual(fields(sf), fields(pn));
  const normalize = (object: typeof sf) => ({ ...object, deliveryScope: "X", decisionData: fields(object) });
  assert.deepEqual(normalize(sf), normalize(sn));
  assert.deepEqual(normalize(sf), normalize(pf));
  assert.deepEqual(normalize(sf), normalize(pn));
});

test("identifies a clean public-framing suppressor", () => {
  const report = buildBuyerWrapperReport(syntheticRecords({
    "exact-narrow-anchor": true,
    "harmonized-sealed-flat": true,
    "harmonized-sealed-nested": true,
  }), "deepseek-v4-flash");
  assert.equal(report.calls, 72);
  assert.equal(report.contrasts.framingMain?.mean, 1);
  assert.equal(report.contrasts.representationMain?.mean, 0);
  assert.equal(report.gates.framingMain, true);
  assert.equal(report.gates.representationMain, false);
  assert.equal(report.verdict, "PUBLIC RUNTIME FRAMING SUPPRESSOR");
});

test("distinguishes interaction and residual repair patterns", () => {
  const interaction = buildBuyerWrapperReport(syntheticRecords({
    "exact-narrow-anchor": true,
    "harmonized-sealed-flat": true,
    "harmonized-public-nested": true,
  }), "deepseek-v4-flash");
  assert.equal(interaction.contrasts.framingMain?.mean, 0);
  assert.equal(interaction.contrasts.representationMain?.mean, 0);
  assert.equal(interaction.gates.interaction, true);
  assert.equal(interaction.verdict, "FRAMING × REPRESENTATION INTERACTION");

  const repair = buildBuyerWrapperReport(syntheticRecords({
    "exact-narrow-anchor": true,
    "harmonized-sealed-flat": true,
    "harmonized-sealed-nested": true,
    "harmonized-public-flat": true,
    "harmonized-public-nested": true,
  }), "deepseek-v4-flash");
  assert.equal(repair.gates.framingMain, false);
  assert.equal(repair.gates.representationMain, false);
  assert.equal(repair.gates.residualRepair, true);
  assert.equal(repair.verdict, "HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE");
});

test("verdict tree protects endpoint and harmonized-baseline guards", () => {
  const gates = {
    complete: true,
    integrity: true,
    narrowAnchor: true,
    publicAnchor: true,
    anchorGap: true,
    harmonizedBaseline: true,
    framingMain: false,
    representationMain: false,
    interaction: false,
    residualRepair: true,
  };
  assert.equal(buyerWrapperVerdict(gates), "HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE");
  assert.equal(buyerWrapperVerdict({ ...gates, narrowAnchor: false }), "NARROW ANCHOR NOT REPLICATED");
  assert.equal(buyerWrapperVerdict({ ...gates, publicAnchor: false }), "PUBLIC-HARD NULL NOT REPLICATED");
  assert.equal(buyerWrapperVerdict({ ...gates, harmonizedBaseline: false }), "HARMONIZED BASELINE NOT ACTION-CAPABLE");
});
