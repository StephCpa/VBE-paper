import { readFileSync } from "node:fs";
import { buildBuyerTemporalReport, type BuyerTemporalReport } from "./buyer-temporal-replay.ts";

const path = process.argv[2] ?? "src/data/buyer-temporal-replay.json";
const stored = JSON.parse(readFileSync(path, "utf8")) as BuyerTemporalReport;
const report = buildBuyerTemporalReport(stored.records, stored.model);
console.log(`study ${report.study}`);
console.log(`model ${report.model}`);
console.log(`calls ${report.calls} completeBlocks ${report.completeBlocks}`);
console.log(`byArm ${JSON.stringify(report.byArm)}`);
console.log(`responseShape ${JSON.stringify(report.responseShape)}`);
console.log(`gates ${JSON.stringify(report.gates)}`);
console.log(`integrity ${JSON.stringify(report.integrity)}`);
console.log(`verdict ${report.verdict}`);
