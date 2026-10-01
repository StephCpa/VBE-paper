import { readFileSync } from "node:fs";
import { buildMicroReport, type MicroReport } from "./founder-decision-microbenchmark.ts";

const stored = JSON.parse(readFileSync("src/data/founder-decision-microbenchmark.json", "utf8")) as MicroReport;
const report = buildMicroReport(stored.records, stored.model);

console.log("# Founder decision-interface microbenchmark\n");
console.log(`- Blocks: decision ${report.completeDecisionBlocks}/${report.blocks.length}; arithmetic ${report.completeArithmeticBlocks}/${report.blocks.length}`);
console.log(`- Calls: ${report.decisionCalls} decisions + ${report.arithmeticCalls} sealed arithmetic probes`);
console.log(`- Core publication rate: ${report.corePublicationRate?.toFixed(3) ?? "NA"}`);
console.log(`- Minimum cell publication rate: ${report.guardrails.minimumCellRate?.toFixed(3) ?? "NA"}`);
console.log(`- Arithmetic accuracy: ${report.arithmeticAccuracy?.toFixed(3) ?? "NA"}`);
console.log(`- Verdict: ${report.verdict}\n`);

console.log("| Mode | Role | Score | Publish | Arithmetic |\n|---|---|---:|---:|---:|");
for (const cell of report.cells) {
  const s = report.byCell[cell.id]!;
  console.log(`| ${cell.mode} | ${cell.role} | ${cell.score} | ${s.published}/${s.n} (${s.rate.toFixed(3)}) | ${s.arithmeticAccuracy?.toFixed(3) ?? "NA"} |`);
}

console.log("\n## Frozen factor diagnostics\n");
console.log("| Factor | Mean Δ | Bootstrap 95% | Exact upper p | Trigger |\n|---|---:|---:|---:|---|");
for (const factor of ["score", "role", "delay", "semantics"] as const) {
  const e = report.factorEffects[factor];
  if (!e) continue;
  const ci = e.bootstrap95 ? `[${e.bootstrap95[0].toFixed(3)}, ${e.bootstrap95[1].toFixed(3)}]` : "NA";
  console.log(`| ${factor} | ${e.mean.toFixed(3)} | ${ci} | ${e.exactUpperP?.toFixed(8) ?? "NA"} | ${e.triggers ? "YES" : "NO"} |`);
}

