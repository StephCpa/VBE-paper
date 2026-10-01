import { strict as assert } from "node:assert";
import { buildX0v11 } from "./reanalyze-welfare-review-x0-v1_1.ts";

const report = await buildX0v11();

assert.equal(report.sourceIntegrity.runs, 98);
assert.equal(report.roleConditionalProposalMap.length, 28);
assert.equal(report.namedAudit.length, 7);
assert.equal(report.actorSpillover.length, 14);
assert.equal(report.benchmarkRuns.length, 70);

for (const row of report.roleConditionalProposalMap) {
  const proposalTotal = Object.values(row.pooledProposalCounts as Record<string, number>).reduce((a, b) => a + b, 0);
  assert.equal(proposalTotal, row.pooledOpportunities, `${row.arm}/${row.cell} proposal partition`);
  for (const kind of ["gift", "sale", "mark-offer"] as const) {
    const outcomes = row.pooledOutcomeCounts[kind] as Record<string, number>;
    const outcomeTotal = Object.values(outcomes).reduce((a, b) => a + b, 0);
    assert.equal(outcomeTotal, row.pooledProposalCounts[kind], `${row.arm}/${row.cell}/${kind} conversion partition`);
  }
}

const find = (arm: string, cell: string) => report.roleConditionalProposalMap.find((row: any) => row.arm === arm && row.cell === cell)!;
assert.equal(find("gift-exact", "E->H").pooledProposalCounts.gift, 37);
assert.equal(find("gift-exact", "H->H").pooledProposalCounts.gift, 228);
assert.equal(find("easy-easy-negative", "E->E").pooledProposalCounts.gift, 227);
assert.equal(find("easy-easy-negative", "E->E").pooledOutcomeCounts.gift.executed, 227);

const audit = (arm: string) => report.namedAudit.find((row: any) => row.arm === arm)!;
assert.equal(audit("gift-exact").passesMRE, false);
assert.equal(audit("gift-easy-only").passesMRE, false);
assert.equal(audit("gift-any-holder").passesMRE, true);
assert.equal(audit("gift-hard-partner-only").passesMRE, true);
assert.equal(audit("money-exact").passesMRE, false);
assert.equal(audit("easy-easy-negative").passesMRE, true);

const firstBest = report.benchmarks.find((row: any) => row.name === "first-best")!;
assert.equal(firstBest.meanScore.mean, 63.1875);
console.log("X0 v1.1 invariants passed");
