import { readFileSync } from "node:fs";
import type { OnlineSourceReport } from "./online-source-quarantine.ts";

const path = process.argv[2] ?? "src/data/online-source-quarantine.json";
const report = JSON.parse(readFileSync(path, "utf8")) as OnlineSourceReport;
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`runs ${report.runs.length} completeBlocks ${report.completeBlocks}`);
for (const [arm, value] of Object.entries(report.byArm)) {
  console.log(`${arm} n=${value.n} calls=${value.calls} preSeller=${value.preSeller.toFixed(4)} treatmentSeller=${value.treatmentSeller.toFixed(4)} buyer=${value.treatmentBuyer.toFixed(4)} trade=${value.treatmentTrade.toFixed(4)} postSeller=${value.withdrawalSeller.toFixed(4)} score=${value.meanScore.toFixed(4)}`);
}
console.log(`effects ${JSON.stringify(report.effects)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
