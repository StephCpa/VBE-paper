import { readFileSync } from "node:fs";
import { buildBuyerEnvelopeReport, type BuyerEnvelopeReport } from "./buyer-envelope-disassembly.ts";

const path = process.argv[2] ?? "src/data/buyer-envelope-disassembly.json";
const stored = JSON.parse(readFileSync(path, "utf8")) as BuyerEnvelopeReport;
const report = buildBuyerEnvelopeReport(stored.records, stored.model);
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks}`);
for (const [arm, row] of Object.entries(report.byArm)) console.log(`${arm} buy=${row.buy}/${row.n} rate=${row.buyRate.toFixed(4)}`);
for (const [name, value] of Object.entries(report.contrasts)) console.log(`${name} ${JSON.stringify(value)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
