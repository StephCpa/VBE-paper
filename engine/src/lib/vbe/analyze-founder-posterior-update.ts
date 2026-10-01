import { readFileSync } from "node:fs";
import { POSTERIOR_INTERFACES, buildPosteriorUpdateReport, type PosteriorUpdateReport } from "./founder-posterior-update.ts";

const stored = JSON.parse(readFileSync("src/data/founder-posterior-update.json", "utf8")) as PosteriorUpdateReport;
const report = buildPosteriorUpdateReport(stored.cases, stored.model);
console.log("# Randomized evidence posterior-update benchmark\n");
console.log(`- Complete cases: ${report.completeCases}/24`);
console.log(`- Retained calls: ${report.integrity.retainedCalls}/${report.integrity.expectedCalls}`);
console.log("\n| Interface | Accuracy ±.02 | MAE | Direction | Prior copy | Prior-copy gain | Bootstrap 95% | Pass |");
console.log("|---|---:|---:|---:|---:|---:|---:|---|");
for (const kind of POSTERIOR_INTERFACES) { const s = report.byInterface[kind]!; console.log(`| ${kind} | ${s.accuracy02.toFixed(3)} | ${s.mae.toFixed(4)} | ${s.directionAccuracy.toFixed(3)} | ${s.priorCopyRate.toFixed(3)} | ${s.priorCopyGain.mean.toFixed(4)} | ${s.priorCopyGain.bootstrap95?.map((x) => x.toFixed(4)).join(", ")} | ${s.pass} |`); }
console.log("\n| Contrast | Mean error reduction | Bootstrap 95% |");
console.log("|---|---:|---:|");
for (const [name, effect] of Object.entries(report.contrasts)) console.log(`| ${name} | ${effect?.mean.toFixed(4)} | ${effect?.bootstrap95?.map((x) => x.toFixed(4)).join(", ")} |`);
console.log(`\n- Verdict: ${report.verdict}`);
