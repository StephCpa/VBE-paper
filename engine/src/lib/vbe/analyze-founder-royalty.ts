import { readFileSync } from "node:fs";
import { buildFounderRoyaltyReport, type FounderRoyaltyReport } from "./founder-royalty.ts";
const stored = JSON.parse(readFileSync("src/data/founder-royalty.json", "utf8")) as FounderRoyaltyReport;
const report = buildFounderRoyaltyReport(stored.runs, stored.model);
console.log("# Transaction-contingent founder royalty\n");
console.log("| Arm | n | Founded | Rate | Trades | Payout | Seller | Buyer | Trade | Founder score | Mean score |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const arm of report.arms) {
  const s = report.byArm[arm]; if (!s) continue;
  console.log(`| ${arm} | ${s.n} | ${s.founded} | ${s.foundingRate.toFixed(3)} | ${s.qualifyingTrades.toFixed(3)} | ${s.meanPayout.toFixed(3)} | ${s.sellerIntentRate.toFixed(3)} | ${s.buyerIntentRate.toFixed(3)} | ${s.tradeRate.toFixed(3)} | ${s.founderFinalScore.toFixed(3)} | ${s.meanScore.toFixed(3)} |`);
}
console.log("\n## Confirmatory result\n");
console.log(`- Complete blocks: ${report.completeBlocks}/${report.seeds.length}`);
console.log(`- Royalty−lottery founding difference: ${report.primary?.mean.toFixed(3) ?? "NA"}`);
console.log(`- Bootstrap 95%: ${report.primary?.bootstrap95 ? `[${report.primary.bootstrap95[0].toFixed(3)}, ${report.primary.bootstrap95[1].toFixed(3)}]` : "NA"}`);
console.log(`- Exact one-sided sign-flip p: ${report.primary?.exactUpperP?.toFixed(8) ?? "NA"}`);
console.log(`- Guardrails pass: ${report.guardrails.pass}`);
console.log(`- Verdict: ${report.verdict}`);
