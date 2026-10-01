import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POSTERIOR_CASES, POSTERIOR_INTERFACES, buildPosteriorUpdateReport, likelihoodRatio, parsePosterior, posteriorOrder, posteriorPrompt, posteriorTruth, sha256Posterior, type PosteriorCaseResult } from "./founder-posterior-update.ts";

function fakeCase(caseId: number, prediction: (kind: (typeof POSTERIOR_INTERFACES)[number]) => number): PosteriorCaseResult {
  const item = POSTERIOR_CASES[caseId - 1]!;
  const order = [...posteriorOrder(caseId)];
  return {
    caseId,
    case: item,
    calls: 3,
    apiFails: 0,
    parseFails: 0,
    order,
    observations: order.map((kind, index) => ({ interface: kind, position: index + 1, promptHash: sha256Posterior(posteriorPrompt(kind, item)), prediction: prediction(kind) })),
  };
}

describe("randomized evidence posterior update", () => {
  it("crosses 24 unique cases and balances interface positions", () => {
    assert.equal(POSTERIOR_CASES.length, 24);
    assert.equal(new Set(POSTERIOR_CASES.map((item) => `${item.prior}:${item.signalModel}:${item.observed}`)).size, 24);
    for (const kind of POSTERIOR_INTERFACES) assert.deepEqual([0, 1, 2].map((position) => POSTERIOR_CASES.filter((item) => posteriorOrder(item.caseId)[position] === kind).length), [8, 8, 8]);
  });

  it("computes Bayes truth and both signal directions", () => {
    const positive = POSTERIOR_CASES.find((item) => item.prior === 0.2 && item.signalModel === "strong" && item.observed === "GREEN")!;
    const negative = POSTERIOR_CASES.find((item) => item.prior === 0.2 && item.signalModel === "strong" && item.observed === "RED")!;
    assert.equal(likelihoodRatio(positive), 4);
    assert.ok(Math.abs(posteriorTruth(positive) - 0.5) < 1e-12);
    assert.ok(Math.abs(posteriorTruth(negative) - (1 / 17)) < 1e-12);
    assert.ok(posteriorTruth(positive) > positive.prior);
    assert.ok(posteriorTruth(negative) < negative.prior);
  });

  it("keeps the three interfaces semantically nested", () => {
    const item = POSTERIOR_CASES[0]!;
    assert.match(posteriorPrompt("conditional-table", item), /P\(GREEN\|H\)/);
    assert.doesNotMatch(posteriorPrompt("conditional-table", item), /likelihood ratio|posterior_odds/);
    assert.match(posteriorPrompt("compiled-likelihood", item), /likelihood ratio/);
    assert.doesNotMatch(posteriorPrompt("compiled-likelihood", item), /posterior_odds/);
    assert.match(posteriorPrompt("explicit-odds", item), /posterior_odds=prior_odds\*LR/);
  });

  it("parses only the strict posterior schema", () => {
    assert.equal(parsePosterior('{"posterior":0.42}'), 0.42);
    assert.throws(() => parsePosterior('{"posterior":1.2}'), /\[0,1\]/);
    assert.throws(() => parsePosterior('{"p":0.42}'), /schema/);
    assert.throws(() => parsePosterior('{"posterior":0.42,"reason":"x"}'), /schema/);
  });

  it("supports exact posterior updating and rejects prior copying", () => {
    const exact = POSTERIOR_CASES.map((item) => fakeCase(item.caseId, () => posteriorTruth(item)));
    const supported = buildPosteriorUpdateReport(exact, "test");
    assert.equal(supported.verdict, "POSTERIOR UPDATE CAPABILITY SUPPORTED");
    assert.ok(POSTERIOR_INTERFACES.every((kind) => supported.byInterface[kind]!.pass));

    const copied = POSTERIOR_CASES.map((item) => fakeCase(item.caseId, () => item.prior));
    const rejected = buildPosteriorUpdateReport(copied, "test");
    assert.equal(rejected.verdict, "EXTERNAL BAYES COMPILER REQUIRED");
    assert.ok(POSTERIOR_INTERFACES.every((kind) => !rejected.byInterface[kind]!.pass));
  });

  it("identifies an explicit-odds-only repair", () => {
    const results = POSTERIOR_CASES.map((item) => fakeCase(item.caseId, (kind) => kind === "explicit-odds" ? posteriorTruth(item) : item.prior));
    assert.equal(buildPosteriorUpdateReport(results, "test").verdict, "EXPLICIT ODDS REPAIR REQUIRED");
  });

  it("rejects incomplete call structure", () => {
    const result = fakeCase(1, () => 0.5);
    result.calls = 2 as 3;
    assert.throws(() => buildPosteriorUpdateReport([result], "test"), /call invariant/);
  });
});
