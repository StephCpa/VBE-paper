import { readFileSync } from "node:fs";
import { buildSanitizedRoyaltyReport, type SanitizedRoyaltyReport } from "./founder-sanitized-royalty.ts";

const stored = JSON.parse(readFileSync("src/data/founder-sanitized-royalty.json", "utf8")) as SanitizedRoyaltyReport;
const report = buildSanitizedRoyaltyReport(stored.runs, stored.model);
console.log("# Sanitized transaction-contingent founder royalty replication\n");
console.log("| Arm | n | Founded | Rate | Trades | Payout | Seller | Buyer | Trade | Founder score | Mean score |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const arm of report.arms) {
  const s = report.byArm[arm]; if (!s) continue;
  console.log(`| ${arm} | ${s.n} | ${s.founded} | ${s.foundingRate.toFixed(3)} | ${s.qualifyingTrades.toFixed(3)} | ${s.meanPayout.toFixed(3)} | ${s.sellerIntentRate.toFixed(3)} | ${s.buyerIntentRate.toFixed(3)} | ${s.tradeRate.toFixed(3)} | ${s.founderFinalScore.toFixed(3)} | ${s.meanScore.toFixed(3)} |`);
}
console.log("\n## Frozen results\n");
console.log(`- Complete blocks: ${report.completeBlocks}/${report.seeds.length}`);
console.log(`- Representation rescue: ${report.effects.representationRescue?.mean.toFixed(3) ?? "NA"}; exact p=${report.effects.representationRescue?.exactUpperP?.toFixed(8) ?? "NA"}; pass=${report.effects.representationRescue?.passes ?? false}`);
console.log(`- Contingency fidelity: ${report.effects.contingencyFidelity?.mean.toFixed(3) ?? "NA"}; exact p=${report.effects.contingencyFidelity?.exactUpperP?.toFixed(8) ?? "NA"}; pass=${report.effects.contingencyFidelity?.passes ?? false}`);
console.log(`- Guardrails pass: ${report.guardrails.pass}`);
console.log(`- Verdict: ${report.verdict}`);
