import { readFileSync } from "node:fs";
import { buildBuyerEvReport, type BuyerEvReport } from "./buyer-wrapper-ev-ladder.ts";

const path = process.argv[2] ?? "src/data/buyer-wrapper-ev-ladder.json";
const stored = JSON.parse(readFileSync(path, "utf8")) as BuyerEvReport;
const report = buildBuyerEvReport(stored.records, stored.model);
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks}`);
for (const [arm, row] of Object.entries(report.byArm)) console.log(`${arm} buy=${row.buy}/${row.n} rate=${row.buyRate.toFixed(4)}`);
for (const [name, value] of Object.entries(report.contrasts)) console.log(`${name} ${JSON.stringify(value)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`linkStatus ${report.linkStatus}`);
console.log(`stepStatus ${JSON.stringify(report.stepStatus)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
