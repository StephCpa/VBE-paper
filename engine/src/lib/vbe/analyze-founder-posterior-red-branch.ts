import { readFileSync } from "node:fs";
import { RED_BRANCH_INTERFACES, buildRedBranchReport, type RedBranchReport } from "./founder-posterior-red-branch.ts";

const stored = JSON.parse(readFileSync("src/data/founder-posterior-red-branch.json", "utf8")) as RedBranchReport;
const report = buildRedBranchReport(stored.cases, stored.model);
console.log("# RED branch materialization ablation\n");
console.log(`- Complete cases: ${report.completeCases}/12`); console.log(`- Retained calls: ${report.integrity.retainedCalls}/${report.integrity.expectedCalls}`);
console.log("\n| Interface | Accuracy ±.02 | MAE | Direction | Prior copy | Prior-copy gain | Bootstrap 95% | Pass |"); console.log("|---|---:|---:|---:|---:|---:|---:|---|");
for (const kind of RED_BRANCH_INTERFACES) { const s = report.byInterface[kind]!; console.log(`| ${kind} | ${s.accuracy02.toFixed(3)} | ${s.mae.toFixed(4)} | ${s.directionAccuracy.toFixed(3)} | ${s.priorCopyRate.toFixed(3)} | ${s.priorCopyGain.mean.toFixed(4)} | ${s.priorCopyGain.bootstrap95?.map((x) => x.toFixed(4)).join(", ")} | ${s.pass} |`); }
console.log(`\n- Explicit two-row accuracy rescue: ${report.explicitRescue?.mean.toFixed(4)} [${report.explicitRescue?.bootstrap95?.map((x) => x.toFixed(4)).join(", ")}], pass=${report.rescuePass}`);
console.log(`- Verdict: ${report.verdict}`);
