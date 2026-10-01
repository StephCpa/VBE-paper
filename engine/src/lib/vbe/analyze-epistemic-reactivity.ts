import { readFileSync } from "node:fs";
import {
  REACTIVITY_METRICS,
  REACTIVITY_MODES,
  buildReactivityReport,
  reactivityCellKey,
  type ReactivityReport,
} from "./epistemic-reactivity.ts";

const path = process.argv[2] ?? "src/data/epistemic-reactivity-pilot.json";
const report = JSON.parse(readFileSync(path, "utf8")) as ReactivityReport;
const rebuilt = buildReactivityReport(report.runs, report.model);

const stableProjection = (value: ReactivityReport) => ({
  study: value.study,
  status: value.status,
  model: value.model,
  seeds: value.seeds,
  byCell: value.byCell,
  publicEffectsByMode: value.publicEffectsByMode,
  publicEffectInference: value.publicEffectInference,
  interactions: value.interactions,
  interactionInference: value.interactionInference,
  completeBlocks: value.completeBlocks,
  integrity: value.integrity,
  verdict: value.verdict,
});

if (JSON.stringify(stableProjection(report)) !== JSON.stringify(stableProjection(rebuilt))) {
  throw new Error("stored report differs from an independent rebuild over retained runs");
}

const fmt = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
const interval = (bounds: [number, number] | undefined) =>
  bounds ? `[${fmt(bounds[0])}, ${fmt(bounds[1])}]` : "NA";

const actionCalls = report.runs.reduce((sum, run) => sum + run.actionCalls, 0);
const replayCalls = report.runs.reduce((sum, run) => sum + run.replayCalls, 0);

console.log(`# ${report.study}`);
console.log(`status: ${report.status}`);
console.log(`blocks: ${report.completeBlocks}/${report.seeds.length}; runs: ${report.runs.length}`);
console.log(`calls: action=${actionCalls}; replay=${replayCalls}; total=${actionCalls + replayCalls}`);
console.log(`verdict: ${report.verdict}`);
console.log("");
console.log("| Mode | Metric | Private | Public | Public−Private | Bootstrap 95% | Sign-flip p |");
console.log("|---|---|---:|---:|---:|---:|---:|");
for (const mode of REACTIVITY_MODES) {
  const privateCell = report.byCell[reactivityCellKey({ delivery: "private", mode })];
  const publicCell = report.byCell[reactivityCellKey({ delivery: "public", mode })];
  const effects = report.publicEffectInference[mode];
  if (!privateCell || !publicCell || !effects) continue;
  for (const metric of REACTIVITY_METRICS) {
    const effect = effects[metric];
    if (!effect) continue;
    console.log(
      `| ${mode} | ${metric} | ${privateCell[metric].toFixed(3)} | ${publicCell[metric].toFixed(3)} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(4) ?? "NA"} |`,
    );
  }
}
console.log("");
console.log("| Interaction metric | Mean DiD | Bootstrap 95% | Sign-flip p | Positive share |");
console.log("|---|---:|---:|---:|---:|");
for (const metric of REACTIVITY_METRICS) {
  const effect = report.interactionInference[metric];
  if (!effect) continue;
  console.log(
    `| ${metric} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(4) ?? "NA"} | ${effect.positiveShare.toFixed(3)} |`,
  );
}
console.log("");
console.log(
  `integrity: failed=${report.integrity.failedCallsRetained}; sealed action belief fields=${report.integrity.sealedActionBeliefFields}; replay/action match=${report.integrity.sealedReplayCountMatchesActions}; replay after environment=${report.integrity.sealedReplayAfterEnvironment}; schedule blocks=${report.integrity.scheduleMatchedBlocks}`,
);
console.log(report.caveat);
