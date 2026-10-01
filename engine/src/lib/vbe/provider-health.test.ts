import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProviderHealthBracket,
  checkProviderHealthEraBaseline,
  compareProviderHealthBrackets,
  createProviderHealthEraBaseline,
  providerHealthAnchors,
  sha256ProviderHealth,
  type ProviderHealthPhase,
  type ProviderHealthPlan,
  type ProviderHealthRecord,
} from "./provider-health.ts";
import type { Proposal } from "./types.ts";

const plan: ProviderHealthPlan = {
  protocolVersion: "1.1",
  studyId: "TEST",
  servingEraId: "deepseek-v4.1-flash-test-era",
  eraBaselineMode: "establish",
  eraBaselinePath: "src/data/provider-era-baseline-test.json",
  requestedModel: "deepseek-v4-pro",
  allowedReturnedModels: ["deepseek-v4-pro"],
  expectedCatalogModels: ["deepseek-flash", "deepseek-v4-pro"],
  requireFingerprint: true,
  historicalSentinelInterpretation: "DESCRIPTIVE CROSS-ERA DRIFT ONLY — EXCLUDED FROM HEALTH GATES",
  outputPath: "src/data/provider-health-test.json",
};

function records(phase: ProviderHealthPhase, collapsed = false, fingerprint = "fp-a"): ProviderHealthRecord[] {
  const anchors = providerHealthAnchors();
  return anchors.map((anchor, index) => {
    let proposal: Proposal;
    if (collapsed) proposal = { giveCheck: true, giveChits: 0, requireChit: true };
    else if (anchor.expectedProposal) proposal = anchor.expectedProposal;
    else if (anchor.kind === "dominant-positive") proposal = { giveCheck: false, giveChits: 1, requireChit: false };
    else if (anchor.kind === "dominant-negative") proposal = { giveCheck: false, giveChits: 0, requireChit: false };
    else proposal = index % 2 ? { giveCheck: true, giveChits: 1, requireChit: true } : { giveCheck: false, giveChits: 0, requireChit: false };
    const rawResponse = JSON.stringify(proposal);
    return {
      phase,
      position: index + 1,
      anchorId: anchor.id,
      kind: anchor.kind,
      promptHash: sha256ProviderHealth(anchor.prompt),
      requestBodySha256: `body-${index}`,
      rawResponse,
      rawResponseSha256: sha256ProviderHealth(rawResponse),
      proposal,
      provider: {
        responseId: `${phase}-${index}`,
        returnedModel: "deepseek-v4-pro",
        created: index,
        systemFingerprint: fingerprint,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, promptCacheHitTokens: 0, promptCacheMissTokens: 1 },
        headers: {},
        attempt: 1,
      },
    };
  });
}

test("uses independent controls, dominance anchors, and historical sentinels", () => {
  const anchors = providerHealthAnchors();
  assert.equal(anchors.length, 14);
  assert.equal(anchors.filter((anchor) => anchor.kind === "external-control").length, 4);
  assert.equal(anchors.filter((anchor) => anchor.kind === "dominant-positive").length, 4);
  assert.equal(anchors.filter((anchor) => anchor.kind === "dominant-negative").length, 4);
  assert.equal(anchors.filter((anchor) => anchor.kind === "historical-sentinel").length, 2);
  assert.equal(new Set(anchors.map((anchor) => anchor.prompt)).size, 14);
});

test("passes a diverse bracket with exact controls and separated dominance actions", () => {
  const report = buildProviderHealthBracket("pre", records("pre"), plan.expectedCatalogModels, plan);
  assert.equal(report.healthy, true);
  assert.equal(report.metrics.externalControlsExact, 4);
  assert.equal(report.metrics.positiveBuyRate, 1);
  assert.equal(report.metrics.negativeBuyRate, 0);
  assert.ok(report.metrics.uniqueRawResponses >= 4);
});

test("rejects the observed one-constant collapse", () => {
  const report = buildProviderHealthBracket("pre", records("pre", true), plan.expectedCatalogModels, plan);
  assert.equal(report.healthy, false);
  assert.equal(report.gates.externalControlsExact, false);
  assert.equal(report.gates.positiveRate, false);
  assert.equal(report.gates.responseDiversity, false);
});

test("invalidates a study bracket when serving identity changes", () => {
  const pre = buildProviderHealthBracket("pre", records("pre", false, "fp-a"), plan.expectedCatalogModels, plan);
  const post = buildProviderHealthBracket("post", records("post", false, "fp-b"), plan.expectedCatalogModels, plan);
  const comparison = compareProviderHealthBrackets(pre, post);
  assert.equal(comparison.bracketValid, false);
  assert.equal(comparison.verdict, "BRACKET IDENTITY CHANGED");
});

test("treats the first bracket in a serving era as a normal baseline-establishment run", () => {
  const pre = buildProviderHealthBracket("pre", records("pre"), plan.expectedCatalogModels, plan);
  const check = checkProviderHealthEraBaseline(plan, pre);
  assert.equal(check.passed, true);
  assert.equal(check.status, "FIRST RUN — PENDING HEALTHY POST");
  const baseline = createProviderHealthEraBaseline(plan, pre, "2026-09-14T04:00:00Z");
  assert.equal(baseline.servingEraId, plan.servingEraId);
  assert.equal(baseline.establishedFromStudyId, plan.studyId);
});

test("requires later studies to match the frozen serving-era baseline", () => {
  const pre = buildProviderHealthBracket("pre", records("pre"), plan.expectedCatalogModels, plan);
  const baseline = createProviderHealthEraBaseline(plan, pre, "2026-09-14T04:00:00Z");
  const comparisonPlan: ProviderHealthPlan = { ...plan, studyId: "TEST-2", eraBaselineMode: "compare" };
  assert.equal(checkProviderHealthEraBaseline(comparisonPlan, pre, baseline).status, "BASELINE MATCHED");
  const changed = buildProviderHealthBracket("pre", records("pre", false, "fp-b"), plan.expectedCatalogModels, comparisonPlan);
  const check = checkProviderHealthEraBaseline(comparisonPlan, changed, baseline);
  assert.equal(check.passed, false);
  assert.equal(check.status, "BASELINE MISMATCH");
  assert.equal(check.comparisons.fingerprints, false);
});
