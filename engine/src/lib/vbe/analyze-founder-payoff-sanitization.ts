import { readFileSync } from "node:fs";
import { SANITIZATION_REPRESENTATIONS, SANITIZATION_SCENARIOS, buildSanitizationReport, type SanitizationReport } from "./founder-payoff-sanitization.ts";

const stored = JSON.parse(readFileSync("src/data/founder-payoff-sanitization.json", "utf8")) as SanitizationReport;
const report = buildSanitizationReport(stored.records, stored.model);

console.log("# Pre-context payoff sanitization\n");
console.log(`- Complete blocks: ${report.completeBlocks}/${report.blocks.length}`);
console.log(`- Calls: ${report.calls}`);
console.log(`- Verdict: ${report.verdict}\n`);
console.log("| Representation | n | Accuracy | Publish rate |\n|---|---:|---:|---:|");
for (const representation of SANITIZATION_REPRESENTATIONS) {
  const s = report.byRepresentation[representation];
  console.log(`| ${representation} | ${s.n} | ${s.accuracy.toFixed(3)} | ${s.publishRate.toFixed(3)} |`);
}

console.log("\n## Scenario slices\n");
console.log("| Scenario | Representation | Accuracy | Publish rate |\n|---|---|---:|---:|");
for (const scenario of SANITIZATION_SCENARIOS) for (const representation of SANITIZATION_REPRESENTATIONS) {
  const s = report.byScenarioRepresentation[`${scenario}|${representation}`]!;
  console.log(`| ${scenario} | ${representation} | ${s.accuracy.toFixed(3)} | ${s.publishRate.toFixed(3)} |`);
}

console.log("\n## Frozen and secondary effects\n");
console.log("| Effect | Mean Δ | Bootstrap 95% | Exact upper p | Pass |\n|---|---:|---:|---:|---|");
for (const [name, effect] of Object.entries(report.effects)) {
  if (!effect) continue;
  const ci = effect.bootstrap95 ? `[${effect.bootstrap95[0].toFixed(3)}, ${effect.bootstrap95[1].toFixed(3)}]` : "NA";
  console.log(`| ${name} | ${effect.mean.toFixed(3)} | ${ci} | ${effect.exactUpperP?.toFixed(8) ?? "NA"} | ${effect.passes ? "YES" : "NO"} |`);
}
console.log(`\n- Gate interventions: ${report.actionGate.interventions}/${report.calls} (${report.actionGate.interventionRate?.toFixed(3) ?? "NA"})`);
console.log(`- Gate executed accuracy: ${report.actionGate.executedAccuracy?.toFixed(3) ?? "NA"}`);
