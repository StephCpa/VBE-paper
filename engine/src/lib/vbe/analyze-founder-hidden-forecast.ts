import { readFileSync } from "node:fs";
import { HIDDEN_FORECAST_COSTS, buildHiddenForecastReport, type HiddenForecastReport } from "./founder-hidden-forecast.ts";
const stored = JSON.parse(readFileSync("src/data/founder-hidden-forecast.json", "utf8")) as HiddenForecastReport;
const r = buildHiddenForecastReport(stored.runs, stored.model);
console.log("# Hidden adoption forecast and sealed authorship decisions\n");
console.log(`- Complete seeds: ${r.completeSeeds}/${r.seeds.length}`);
console.log(`- Observed N buckets: ${r.forecast.observedDistribution?.map((x) => x.toFixed(3)).join(", ")}`);
console.log(`- Mean forecast: ${r.forecast.meanPrediction?.map((x) => x.toFixed(3)).join(", ")}`);
console.log(`- Model/baseline Brier: ${r.forecast.modelBrier?.toFixed(4)} / ${r.forecast.baselineBrier?.toFixed(4)}`);
console.log(`- Baseline−model: ${r.forecast.baselineMinusModel?.mean.toFixed(4)}; bootstrap=${r.forecast.baselineMinusModel?.bootstrap95?.map((x) => x.toFixed(4)).join(",")}; TV=${r.forecast.totalVariation?.toFixed(4)}; pass=${r.forecast.pass}`);
console.log("\n| Cost | Publish | Benchmark agreement | Realized chosen-better | Policy net | Always-publish net |");
console.log("|---:|---:|---:|---:|---:|---:|");
for (const c of HIDDEN_FORECAST_COSTS) { const s = r.decision.byCost[c]!; console.log(`| ${c} | ${s.published}/${s.n} | ${s.benchmarkAgreement.toFixed(3)} | ${s.realizedChosenBetterRate.toFixed(3)} | ${s.realizedPolicyNet.toFixed(3)} | ${s.alwaysPublishNet.toFixed(3)} |`); }
console.log(`\n- Overall/minimum action agreement: ${r.decision.overallBenchmarkAgreement?.toFixed(3)} / ${r.decision.minimumCellAgreement?.toFixed(3)}; pass=${r.decision.pass}`);
console.log(`- Confidence Brier/ECE/coherence MAE: ${r.confidence.brier?.toFixed(4)} / ${r.confidence.ece5?.toFixed(4)} / ${r.confidence.coherenceMae?.toFixed(4)}; pass=${r.confidence.pass}`);
console.log(`- Verdict: ${r.verdict}`);
