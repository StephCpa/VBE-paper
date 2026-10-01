import { existsSync, readFileSync } from "node:fs";
import { analyzeEpistemicReport, EPISTEMIC_METRICS } from "./epistemic-analysis.ts";
import type { EpistemicReport } from "./epistemic.ts";

const path = process.argv[2] ?? "src/data/epistemic.json";
if (!existsSync(path)) {
  throw new Error(`${path} does not exist; run run-epistemic.ts first`);
}

const report = JSON.parse(readFileSync(path, "utf8")) as EpistemicReport;
const inference = analyzeEpistemicReport(report);
console.log(`# ${inference.estimand}\n`);
console.log("| Metric | n | Mean Δ | Median Δ | Bootstrap 95% | Sign-flip p | Positive share |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const metric of EPISTEMIC_METRICS) {
  const effect = inference.effects[metric];
  const interval = effect.bootstrap95
    ? `[${effect.bootstrap95[0].toFixed(3)}, ${effect.bootstrap95[1].toFixed(3)}]`
    : "NA";
  console.log(
    `| ${metric} | ${effect.n} | ${effect.mean.toFixed(3)} | ${effect.median.toFixed(3)} | ${interval} | ${effect.signFlipP?.toFixed(4) ?? "NA"} | ${effect.positiveShare.toFixed(2)} |`,
  );
}
console.log(`\n${inference.warning}`);
