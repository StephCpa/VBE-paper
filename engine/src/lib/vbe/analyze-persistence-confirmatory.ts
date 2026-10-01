import { readFileSync } from "node:fs";
import {
  PERSISTENCE_CONFIRMATORY_ARMS,
  buildPersistenceConfirmatoryReport,
  type ConfirmatoryMetric,
  type PersistenceConfirmatoryReport,
} from "./persistence-confirmatory.ts";

const path = "src/data/persistence-confirmatory.json";
const stored = JSON.parse(readFileSync(path, "utf8")) as PersistenceConfirmatoryReport;
const report = buildPersistenceConfirmatoryReport(stored.runs, stored.model);

console.log("# VBE-P confirmatory analysis\n");
console.log(`Protocol: ${report.frozenProtocol}`);
console.log(`Complete paired seeds: ${report.completePairs}/${report.seeds.length}`);
console.log(`Frozen verdict: **${report.verdict}**\n`);

console.log("## Arm summaries\n");
console.log("| Arm | n | Post seller | Post buyer | Post trade | Mean score |");
console.log("|---|---:|---:|---:|---:|---:|");
for (const arm of PERSISTENCE_CONFIRMATORY_ARMS) {
  const item = report.byArm[arm];
  if (!item) continue;
  console.log(
    `| ${arm} | ${item.n} | ${item.postSeller.toFixed(3)} | ${item.postBuyer.toFixed(3)} | ${item.postTrade.toFixed(3)} | ${item.meanScore.toFixed(3)} |`,
  );
}

console.log("\n## Paired effects\n");
console.log("| Metric | n | Mean Δ | Median Δ | Bootstrap 95% | MRES | Confirmatory one-sided p | Status |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|");
for (const metric of ["seller", "asymmetry", "buyer", "trade", "meanScore"] as ConfirmatoryMetric[]) {
  const item = report.effects[metric];
  if (!item) continue;
  const interval = item.bootstrap95
    ? `[${item.bootstrap95[0].toFixed(3)}, ${item.bootstrap95[1].toFixed(3)}]`
    : "NA";
  const primary = metric === "seller" || metric === "asymmetry";
  console.log(
    `| ${metric} | ${item.n} | ${item.mean.toFixed(3)} | ${item.median.toFixed(3)} | ${interval} | ${primary ? item.minimumRelevantEffect.toFixed(3) : "—"} | ${primary ? (item.centeredOneSidedP?.toFixed(5) ?? "NA") : "—"} | ${primary ? (item.passes ? "PASS" : "FAIL") : "secondary"} |`,
  );
}

console.log("\n## Seed-level co-primary deltas\n");
console.log("| Seed | Seller effect | Seller-effect minus trade-effect |");
console.log("|---:|---:|---:|");
const seller = new Map(report.effects.seller?.values.map((item) => [item.seed, item.delta]));
for (const item of report.effects.asymmetry?.values ?? []) {
  console.log(`| ${item.seed} | ${seller.get(item.seed)?.toFixed(3) ?? "NA"} | ${item.delta.toFixed(3)} |`);
}
