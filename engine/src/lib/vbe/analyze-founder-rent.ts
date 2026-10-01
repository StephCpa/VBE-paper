import { readFileSync } from "node:fs";
import { buildFounderRentReport, type FounderRentReport } from "./founder-rent.ts";

const stored = JSON.parse(readFileSync("src/data/founder-rent.json", "utf8")) as FounderRentReport;
const report = buildFounderRentReport(stored.runs, stored.model);

console.log("# Founder-rent capability gate\n");
console.log("| Arm | n | Founded | Rate | Semantic conflicts | Action calls | Seller | Buyer | Trade | Founder score | Mean score |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const arm of report.arms) {
  const s = report.byArm[arm];
  if (!s) continue;
  console.log(
    `| ${arm} | ${s.n} | ${s.founded} | ${s.foundingRate.toFixed(3)} | ${s.semanticConflicts} | ${s.actionCalls} | ${s.sellerIntentRate.toFixed(3)} | ${s.buyerIntentRate.toFixed(3)} | ${s.tradeRate.toFixed(3)} | ${s.founderFinalScore.toFixed(3)} | ${s.meanScore.toFixed(3)} |`,
  );
}

console.log("\n## Confirmatory result\n");
console.log(`- Complete blocks: ${report.completeBlocks}/${report.seeds.length}`);
console.log(`- Profit−wealth mean paired founding difference: ${report.primary?.mean.toFixed(3) ?? "NA"}`);
console.log(`- Bootstrap 95%: ${report.primary?.bootstrap95 ? `[${report.primary.bootstrap95[0].toFixed(3)}, ${report.primary.bootstrap95[1].toFixed(3)}]` : "NA"}`);
console.log(`- Exact one-sided sign-flip p: ${report.primary?.exactUpperP?.toFixed(8) ?? "NA"}`);
console.log(`- Primary passes: ${report.primary?.passes ?? false}`);
console.log(`- Absolute-rate guardrails pass: ${report.guardrails.pass}`);
console.log(`- Verdict: ${report.verdict}`);

console.log("\n## Paired values\n");
console.log(report.primary?.values.map((v) => `${v.seed}:${v.delta}`).join(", ") ?? "NA");
