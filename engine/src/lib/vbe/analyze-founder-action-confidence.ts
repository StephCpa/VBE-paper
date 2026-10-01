import { readFileSync } from "node:fs";
import { ACTION_CONFIDENCE_INTERFACES, buildActionConfidenceReport, type ActionConfidenceReport } from "./founder-action-confidence.ts";

const stored = JSON.parse(readFileSync("src/data/founder-action-confidence.json", "utf8")) as ActionConfidenceReport;
const report = buildActionConfidenceReport(stored.blocks, stored.model);
console.log("# Action-conditioned confidence complement benchmark\n");
console.log(`- Complete blocks: ${report.completeBlocks}/12`);
console.log(`- Retained calls: ${report.integrity.retainedCalls}/${report.integrity.expectedCalls}`);
console.log("\n| Interface | Calls | Predictions | Accuracy ±.02 | MAE | Complement MAE | Pass |");
console.log("|---|---:|---:|---:|---:|---:|---|");
for (const kind of ACTION_CONFIDENCE_INTERFACES) { const s = report.byInterface[kind]!; console.log(`| ${kind} | ${s.calls} | ${s.predictions} | ${s.accuracy02.toFixed(3)} | ${s.mae.toFixed(4)} | ${s.complementMae.toFixed(4)} | ${s.pass} |`); }
console.log("\n| Contrast | Mean block accuracy delta | Bootstrap 95% |");
console.log("|---|---:|---:|");
for (const [name, effect] of Object.entries(report.contrasts)) console.log(`| ${name} | ${effect?.mean.toFixed(3)} | ${effect?.bootstrap95?.map((x) => x.toFixed(3)).join(", ")} |`);
console.log(`\n- Verdict: ${report.verdict}`);
