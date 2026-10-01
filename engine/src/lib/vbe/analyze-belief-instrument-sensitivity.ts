import { readFileSync } from "node:fs";
import type { BeliefSensitivityReport } from "./belief-instrument-sensitivity.ts";

const path = process.argv[2] ?? "src/data/belief-instrument-sensitivity.json";
const report = JSON.parse(readFileSync(path, "utf8")) as BeliefSensitivityReport;
console.log("# Repaired belief instrument sensitivity gate");
console.log(`- Complete: ${report.completeSeeds}/${report.seeds.length}; calls=${report.totalCalls}`);
if (report.summary) {
  console.log(`- Reports/non-midpoint: ${report.summary.reports}/${report.summary.nonMidpointShare.toFixed(4)}`);
  console.log(`- pAccept report/target: ${report.summary.meanPAccept.toFixed(4)}/${report.summary.meanPAcceptTarget.toFixed(4)}`);
  console.log(`- pSecond report/target: ${report.summary.meanPSecond.toFixed(4)}/${report.summary.meanPSecondTarget.toFixed(4)}`);
  console.log(`- Mean loss improvement: ${report.summary.meanLossImprovement.toFixed(4)}; positive seeds=${report.summary.positiveSeeds}/8`);
  console.log(`- Maximum/realized bonus per LLM-run: ${report.summary.meanMaximumBonusPerAgent.toFixed(3)}/${report.summary.meanRealizedBonusPerAgent.toFixed(3)}`);
}
console.log(`- Integrity: ${JSON.stringify(report.integrity)}`);
console.log(`- Gates: ${JSON.stringify(report.gates)}`);
console.log(`- Verdict: ${report.verdict}`);
