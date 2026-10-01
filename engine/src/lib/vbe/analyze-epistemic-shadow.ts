import { readFileSync } from "node:fs";
import { SHADOW_METRICS, type ShadowStudyReport } from "./epistemic-shadow-study.ts";

const path = process.argv[2] ?? "src/data/epistemic-shadow-pilot.json";
const report = JSON.parse(readFileSync(path, "utf8")) as ShadowStudyReport;

console.log(`# ${report.study}`);
console.log(`status: ${report.status}`);
console.log(`pairs: ${report.completePairs}; gate: ${report.instrumentGate.exact}/${report.instrumentGate.n}`);
console.log(`verdict: ${report.verdict}`);
console.log(`post-hoc: ${report.postHocDiagnostic.publicBuyerSuppressionCandidate ? "PUBLIC BUYER SUPPRESSION CANDIDATE" : "none"}`);
console.log("");
console.log("| Metric | Private | Public | Mean Δ | Bootstrap 95% | Sign-flip p |");
console.log("|---|---:|---:|---:|---:|---:|");
for (const metric of SHADOW_METRICS) {
  const privateValue = report.byKind.private?.[metric];
  const publicValue = report.byKind.public?.[metric];
  const effect = report.effects[metric];
  if (typeof privateValue !== "number" || typeof publicValue !== "number" || !effect) continue;
  const interval = effect.bootstrap95
    ? `[${effect.bootstrap95[0].toFixed(3)}, ${effect.bootstrap95[1].toFixed(3)}]`
    : "NA";
  console.log(
    `| ${metric} | ${privateValue.toFixed(3)} | ${publicValue.toFixed(3)} | ${effect.mean.toFixed(3)} | ${interval} | ${effect.signFlipP?.toFixed(4) ?? "NA"} |`,
  );
}
console.log("");
console.log(
  `non-reactivity audit: action belief fields=${report.nonReactivityAudit.actionBeliefFieldsObserved}; shadow visible=${report.nonReactivityAudit.shadowVisibleToAgents}; shadow in memory=${report.nonReactivityAudit.shadowWrittenToMemory}`,
);
console.log(report.caveat);
