import { readFileSync } from "node:fs";
import {
  REWARD_CONFIRMATORY_MODES,
  buildRewardConfirmatoryReport,
  type RewardConfirmatoryReport,
} from "./epistemic-reward-confirmatory.ts";
import { DISASSEMBLY_METRICS, disassemblyCellKey } from "./epistemic-disassembly.ts";

const path = process.argv[2] ?? "src/data/epistemic-reward-confirmatory.json";
const report = JSON.parse(readFileSync(path, "utf8")) as RewardConfirmatoryReport;
const rebuilt = buildRewardConfirmatoryReport(report.runs, report.model);

const stableProjection = (value: RewardConfirmatoryReport) => ({
  study: value.study,
  status: value.status,
  model: value.model,
  seeds: value.seeds,
  modes: value.modes,
  byCell: value.byCell,
  beliefDiagnostics: value.beliefDiagnostics,
  publicEffectsByMode: value.publicEffectsByMode,
  publicEffectInference: value.publicEffectInference,
  interactions: value.interactions,
  interactionInference: value.interactionInference,
  primary: value.primary,
  directionGuardrails: value.directionGuardrails,
  completeBlocks: value.completeBlocks,
  integrity: value.integrity,
  verdict: value.verdict,
});

if (JSON.stringify(stableProjection(report)) !== JSON.stringify(stableProjection(rebuilt))) {
  throw new Error("stored E-RW confirmation differs from independent rebuild over retained runs");
}

const fmt = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
const interval = (bounds: [number, number] | null | undefined) =>
  bounds ? `[${fmt(bounds[0])}, ${fmt(bounds[1])}]` : "NA";
const calls = report.runs.reduce((sum, run) => sum + run.calls, 0);

console.log(`# ${report.study}`);
console.log(`status: ${report.status}`);
console.log(`blocks: ${report.completeBlocks}/${report.seeds.length}; runs: ${report.runs.length}`);
console.log(`calls: ${calls}`);
console.log(`verdict: ${report.verdict}`);
console.log("");
console.log("| Mode | Metric | Private | Public | Public−Private | Bootstrap 95% | Two-sided p |");
console.log("|---|---|---:|---:|---:|---:|---:|");
for (const mode of REWARD_CONFIRMATORY_MODES) {
  const privateCell = report.byCell[disassemblyCellKey({ delivery: "private", mode })];
  const publicCell = report.byCell[disassemblyCellKey({ delivery: "public", mode })];
  const effects = report.publicEffectInference[mode];
  if (!privateCell || !publicCell || !effects) continue;
  for (const metric of DISASSEMBLY_METRICS) {
    const effect = effects[metric];
    if (!effect) continue;
    console.log(
      `| ${mode} | ${metric} | ${privateCell[metric].toFixed(3)} | ${publicCell[metric].toFixed(3)} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(6) ?? "NA"} |`,
    );
  }
}
console.log("");
console.log("| Interaction metric | Mean | Bootstrap 95% | Two-sided p |");
console.log("|---|---:|---:|---:|");
for (const metric of DISASSEMBLY_METRICS) {
  const effect = report.interactionInference[metric];
  if (!effect) continue;
  console.log(
    `| ${metric} | ${fmt(effect.mean)} | ${interval(effect.bootstrap95)} | ${effect.signFlipP?.toFixed(6) ?? "NA"} |`,
  );
}
console.log("");
console.log(
  `primary: mean=${report.primary ? fmt(report.primary.mean) : "NA"}; floor=${report.minimumRelevantInteraction.toFixed(2)}; exact upper p(0)=${report.primary?.exactUpperP.toFixed(8) ?? "NA"}; pass=${report.primary?.passes ?? false}`,
);
console.log(
  `guardrails: rewarded=${report.directionGuardrails.rewardedObserved === null ? "NA" : fmt(report.directionGuardrails.rewardedObserved)} (>=${report.directionGuardrails.rewardedPublicEffectFloor}); unrewarded=${report.directionGuardrails.unrewardedObserved === null ? "NA" : fmt(report.directionGuardrails.unrewardedObserved)} (<${report.directionGuardrails.unrewardedPublicEffectCeiling}); pass=${report.directionGuardrails.pass}`,
);
console.log(
  `integrity: failed=${report.integrity.failedCallsRetained}; schedule=${report.integrity.scheduleMatchedBlocks}; prior overlap=${report.integrity.priorSeedOverlap}; belief counts=${report.integrity.beliefFieldCountMatches}; format fields=${report.integrity.formatFieldCount}; unrewarded bonus=${report.integrity.unrewardedBonus}`,
);
console.log(report.caveat);
