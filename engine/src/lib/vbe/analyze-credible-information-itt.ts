import { readFileSync } from "node:fs";
import type { CredibleInformationReport } from "./credible-information-itt.ts";

const path = process.argv[2] ?? "src/data/credible-information-itt.json";
const report = JSON.parse(readFileSync(path, "utf8")) as CredibleInformationReport;
console.log("# Credible social-information randomized ITT");
console.log(`- Complete blocks: ${report.completeBlocks}/${report.seeds.length}`);
console.log(`- Retained calls: ${report.runs.reduce((sum, run) => sum + run.calls, 0)}`);
for (const level of report.levels) {
  const summary = report.byLevel[String(level)];
  if (!summary) continue;
  console.log(
    `- disclose-${level}: seller=${summary.sellerIntentRate.toFixed(4)} buyer=${summary.buyerIntentRate.toFixed(4)} trade=${summary.tradeRate.toFixed(4)} meanScore=${summary.meanScore.toFixed(4)}`,
  );
}
if (report.primary) {
  console.log(
    `- Primary seller ITT (4-0): ${report.primary.mean.toFixed(4)} bootstrap=${report.primary.bootstrap95.map((value) => value.toFixed(4)).join(",")} exact-p=${report.primary.exactUpperP?.toFixed(8)}`,
  );
}
console.log(`- Dose guard: ${JSON.stringify(report.doseGuard)}`);
console.log(`- Integrity: ${JSON.stringify(report.integrity)}`);
console.log(`- Gates: ${JSON.stringify(report.gates)}`);
console.log(`- Verdict: ${report.verdict}`);
