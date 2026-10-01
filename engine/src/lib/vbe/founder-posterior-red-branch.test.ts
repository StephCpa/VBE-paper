import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RED_BRANCH_CASES, RED_BRANCH_INTERFACES, buildRedBranchReport, redBranchOrder, redBranchPrompt, sha256RedBranch, type RedBranchCaseResult, type RedBranchInterface } from "./founder-posterior-red-branch.ts";
import { posteriorTruth } from "./founder-posterior-update.ts";

function fakeCase(caseIndex: number, prediction: (kind: RedBranchInterface) => number): RedBranchCaseResult {
  const item = RED_BRANCH_CASES[caseIndex - 1]!, order = [...redBranchOrder(caseIndex)];
  return { caseIndex, sourceCaseId: item.caseId, case: item, calls: 3, apiFails: 0, parseFails: 0, order, observations: order.map((kind, index) => ({ interface: kind, position: index + 1, promptHash: sha256RedBranch(redBranchPrompt(kind, item)), prediction: prediction(kind) })) };
}

describe("RED branch materialization ablation", () => {
  it("uses all 12 RED cases and balances interface positions", () => {
    assert.equal(RED_BRANCH_CASES.length, 12); assert.ok(RED_BRANCH_CASES.every((item) => item.observed === "RED"));
    for (const kind of RED_BRANCH_INTERFACES) assert.deepEqual([0, 1, 2].map((position) => RED_BRANCH_CASES.filter((_, index) => redBranchOrder(index + 1)[position] === kind).length), [4, 4, 4]);
  });

  it("holds semantics fixed while materializing the RED row", () => {
    const item = RED_BRANCH_CASES[0]!, implicit = redBranchPrompt("implicit-complement", item), two = redBranchPrompt("explicit-two-row", item), observed = redBranchPrompt("observed-row-only", item);
    for (const prompt of [implicit, two, observed]) { assert.match(prompt, /P\(H\)=/); assert.match(prompt, /report is RED/); assert.doesNotMatch(prompt, /likelihood ratio|posterior_odds/); }
    assert.match(implicit, /RED is the complement/); assert.doesNotMatch(implicit, /P\(RED\|H\)=/);
    assert.match(two, /P\(GREEN\|H\)=/); assert.match(two, /P\(RED\|H\)=/);
    assert.doesNotMatch(observed, /P\(GREEN\|H\)=/); assert.match(observed, /P\(RED\|H\)=/);
  });

  it("identifies complement materialization rescue", () => {
    const results = RED_BRANCH_CASES.map((item, index) => fakeCase(index + 1, (kind) => kind === "implicit-complement" ? item.prior : posteriorTruth(item)));
    const report = buildRedBranchReport(results, "test");
    assert.equal(report.byInterface["implicit-complement"]!.pass, false); assert.equal(report.byInterface["explicit-two-row"]!.pass, true); assert.equal(report.byInterface["observed-row-only"]!.pass, true); assert.equal(report.rescuePass, true); assert.equal(report.verdict, "COMPLEMENT MATERIALIZATION REQUIRED");
  });

  it("identifies row isolation and baseline shift", () => {
    const isolated = RED_BRANCH_CASES.map((item, index) => fakeCase(index + 1, (kind) => kind === "observed-row-only" ? posteriorTruth(item) : item.prior));
    assert.equal(buildRedBranchReport(isolated, "test").verdict, "OBSERVED-ROW ISOLATION REQUIRED");
    const allExact = RED_BRANCH_CASES.map((item, index) => fakeCase(index + 1, () => posteriorTruth(item)));
    assert.equal(buildRedBranchReport(allExact, "test").verdict, "BASELINE REPLICATION SHIFT — NO LOCALIZATION");
  });

  it("rejects incomplete structure", () => { const result = fakeCase(1, () => 0.5); result.calls = 2 as 3; assert.throws(() => buildRedBranchReport([result], "test"), /call invariant/); });
});
