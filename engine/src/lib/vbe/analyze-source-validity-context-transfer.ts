import { readFileSync } from "node:fs";
import type { CxtReport } from "./source-validity-context-transfer.ts";

const path = process.argv[2] ?? "src/data/source-validity-context-transfer.json";
const report = JSON.parse(readFileSync(path, "utf8")) as CxtReport;
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks}`);
for (const [arm, value] of Object.entries(report.byArm)) {
  console.log(`${arm} n=${value.n} sell=${value.sell} rate=${value.sellRate.toFixed(4)}`);
}
for (const [phase, value] of Object.entries(report.byPhase)) {
  console.log(`${phase} accuracy=${value.contractAccuracy.toFixed(4)} valid=${value.byArm["valid-visible"]?.sellRate.toFixed(4)} invalid-visible=${value.byArm["invalid-visible"]?.sellRate.toFixed(4)}`);
}
console.log(`contrasts ${JSON.stringify(report.contrasts)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
