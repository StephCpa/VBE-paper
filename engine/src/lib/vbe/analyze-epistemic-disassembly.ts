import { readFileSync } from "node:fs";
import {
  DISASSEMBLY_COMPONENTS,
  DISASSEMBLY_METRICS,
  DISASSEMBLY_MODES,
  buildDisassemblyReport,
  disassemblyCellKey,
  type DisassemblyReport,
} from "./epistemic-disassembly.ts";

const path = process.argv[2] ?? "src/data/epistemic-disassembly-pilot.json";
const report = JSON.parse(readFileSync(path, "utf8")) as DisassemblyReport;
const rebuilt = buildDisassemblyReport(report.runs, report.model);

const stableProjection = (value: DisassemblyReport) => ({
  study: value.study,
  status: value.status,
  model: value.model,
  seeds: value.seeds,
  modes: value.modes,
  byCell: value.byCell,
  publicEffectsByMode: value.publicEffectsByMode,
  publicEffectInference: value.publicEffectInference,
  componentEffects: value.componentEffects,
  componentInference: value.componentInference,
  componentScreen: value.componentScreen,
  bridge: value.bridge,
  completeBlocks: value.completeBlocks,
  integrity: value.integrity,
  verdict: value.verdict,
});

if (JSON.stringify(stableProjection(report)) !== JSON.stringify(stableProjection(rebuilt))) {
  throw new Error("stored E-D pilot differs from independent rebuild over retained runs");
}

const fmt = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
const interval = (bounds: [number, number] | undefined) =>
  bounds ? `[${fmt(bounds[0])}, ${fmt(bounds[1])}]` : "NA";
const calls = report.runs.reduce((sum, run) => sum + run.calls, 0);

console.log(`# ${report.study}`);
console.log(`status: ${report.status}`);
console.log(`blocks: ${report.completeBlocks}/${report.seeds.length}; runs: ${report.runs.length}`);
console.log(`calls: ${calls}`);
console.log(`verdict: ${report.verdict}`);
console.log("");
console.log("| Mode | Metric | Private | Public | Public−Private | Bootstrap 95% | Sign-flip p |");
console.log("|---|---|---:|---:|---:|---:|---:|");
for (const mode of DISASSEMBLY_MODES) {
  const privateCell = report.byCell[disassemblyCellKey({ delivery: "private", mode })];
  const publicCell = report.byCell[disassemblyCellKey({ delivery: "public", mode })];
  const effects = report.publicEffectInference[mode];
  if (!privateCell || !publicCell || !effects) continue;
  for (const metric of DISASSEMBLY_METRICS) {
    const effect = effects[metric];
    if (!effect) continue;
    console.log(
      `| ${mode} | ${metric} | ${privateCell[metric].toFixed(3)} | ${publicCell[metric].toFixed(3)} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(4) ?? "NA"} |`,
    );
  }
}

console.log("");
console.log("| Component transition | Buyer increment | Bootstrap 95% | Sign-flip p | Nonnegative seeds | Screen |");
console.log("|---|---:|---:|---:|---:|---|");
for (const component of DISASSEMBLY_COMPONENTS) {
  const effect = report.componentInference[component]?.buyerIntentRate;
  const screen = report.componentScreen.find((item) => item.component === component);
  if (!effect || !screen) continue;
  console.log(
    `| ${component} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(4) ?? "NA"} | ${screen.nonnegativeSeeds}/${report.seeds.length} | ${screen.positiveCandidate ? "candidate" : screen.negativeOffset ? "negative offset" : "small/dispersed"} |`,
  );
}
console.log("");
console.log(
  `bridge: total=${report.bridge.totalObserved === null ? "NA" : fmt(report.bridge.totalObserved)}; rewarded public=${report.bridge.rewardedPublicEffect === null ? "NA" : fmt(report.bridge.rewardedPublicEffect)}; action-only public=${report.bridge.controlPublicEffect === null ? "NA" : fmt(report.bridge.controlPublicEffect)}; pass=${report.bridge.pass}`,
);
console.log(
  `integrity: failed=${report.integrity.failedCallsRetained}; schedule blocks=${report.integrity.scheduleMatchedBlocks}; prior-seed overlap=${report.integrity.priorSeedOverlap}; action-only extras=${report.integrity.actionOnlyExtraFields}; schema belief fields=${report.integrity.schemaBeliefFields}; belief format fields=${report.integrity.beliefFormatFields}`,
);
console.log(report.caveat);
