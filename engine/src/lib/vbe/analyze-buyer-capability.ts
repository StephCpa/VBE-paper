import { readFileSync } from "node:fs";
import type { BuyerCapabilityReport } from "./buyer-capability.ts";

const path = process.argv[2] ?? "src/data/buyer-capability.json";
const report = JSON.parse(readFileSync(path, "utf8")) as BuyerCapabilityReport;
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks}`);
for (const arm of report.arms) {
  const value = report.byArm[arm]!;
  console.log(`${arm} buy=${value.buy}/${value.n} rate=${value.buyRate.toFixed(4)}`);
}
for (const [name, value] of Object.entries(report.contrasts)) console.log(`${name} ${JSON.stringify(value)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
