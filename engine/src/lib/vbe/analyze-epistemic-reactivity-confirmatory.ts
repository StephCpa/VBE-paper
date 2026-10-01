import { readFileSync } from "node:fs";
import {
  buildReactivityConfirmatoryReport,
  type ReactivityConfirmatoryReport,
} from "./epistemic-reactivity-confirmatory.ts";
import {
  REACTIVITY_METRICS,
  REACTIVITY_MODES,
  reactivityCellKey,
} from "./epistemic-reactivity.ts";

const path = process.argv[2] ?? "src/data/epistemic-reactivity-confirmatory.json";
const report = JSON.parse(readFileSync(path, "utf8")) as ReactivityConfirmatoryReport;
const rebuilt = buildReactivityConfirmatoryReport(report.runs, report.model);

const stableProjection = (value: ReactivityConfirmatoryReport) => ({
  study: value.study,
  status: value.status,
  model: value.model,
  seeds: value.seeds,
  byCell: value.byCell,
  publicEffectsByMode: value.publicEffectsByMode,
  publicEffectInference: value.publicEffectInference,
  interactions: value.interactions,
  interactionInference: value.interactionInference,
  primary: value.primary,
  completeBlocks: value.completeBlocks,
  directionGuardrails: value.directionGuardrails,
  integrity: value.integrity,
  verdict: value.verdict,
});

if (JSON.stringify(stableProjection(report)) !== JSON.stringify(stableProjection(rebuilt))) {
  throw new Error("stored E-R confirmation differs from independent rebuild over retained runs");
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
if (report.primary) {
  console.log(
    `primary: mean=${fmt(report.primary.mean)}; MRES=${report.primary.minimumRelevantEffect.toFixed(3)}; centered one-sided p=${report.primary.centeredOneSidedP?.toFixed(6) ?? "NA"}; passes=${report.primary.passes}`,
  );
}
console.log(
  `direction guardrails: inline=${report.directionGuardrails.inlineObserved?.toFixed(3) ?? "NA"} >= ${report.directionGuardrails.inlinePublicEffectFloor.toFixed(2)}; sealed=${report.directionGuardrails.sealedObserved?.toFixed(3) ?? "NA"} < ${report.directionGuardrails.sealedPublicEffectCeiling.toFixed(2)}; pass=${report.directionGuardrails.pass}`,
);
console.log(
  `integrity: failed=${report.integrity.failedCallsRetained}; sealed action belief fields=${report.integrity.sealedActionBeliefFields}; replay/action match=${report.integrity.sealedReplayCountMatchesActions}; replay after environment=${report.integrity.sealedReplayAfterEnvironment}; schedule blocks=${report.integrity.scheduleMatchedBlocks}; prior-seed overlap=${report.integrity.pilotSeedOverlap}`,
);
console.log(report.caveat);
