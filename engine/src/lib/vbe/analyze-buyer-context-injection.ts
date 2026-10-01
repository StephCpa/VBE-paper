import { readFileSync } from "node:fs";
import type { BuyerContextReport } from "./buyer-context-injection.ts";

const reportPath = process.argv[2] ?? "src/data/buyer-context-injection.json";
const report = JSON.parse(readFileSync(reportPath, "utf8")) as BuyerContextReport;
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks} completeSeeds ${report.completeSeeds}`);
for (const arm of report.arms) {
  const value = report.byArm[arm]!;
  console.log(`${arm} buy=${value.buy}/${value.n} rate=${value.buyRate.toFixed(4)}`);
}
for (const [name, value] of Object.entries(report.contrasts)) console.log(`${name} ${JSON.stringify(value)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
