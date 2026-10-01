import { readFileSync } from "node:fs";
import { REAL_SIGNAL_ARMS, type RealSignalReport } from "./founder-real-signal-transfer.ts";

const path = process.argv[2] ?? "src/data/founder-real-signal-transfer.json";
const report = JSON.parse(readFileSync(path, "utf8")) as RealSignalReport;

console.log("# Real VBE early-signal posterior and action transfer\n");
console.log(`- Complete seeds: ${report.completeSeeds}/${report.seeds.length}`);
console.log(`- Retained sealed calls: ${report.integrity.retainedSealedCalls}/${report.integrity.expectedSealedCalls}`);
console.log("\n| Signal | n | Y=1 | Fresh rate | Frozen posterior |");
console.log("|---|---:|---:|---:|---:|");
for (const signal of ["NO_EARLY_TRADE", "EARLY_TRADE"] as const) {
  const item = report.signal.bySignal[signal];
  if (item) console.log(`| ${signal} | ${item.n} | ${item.y1} | ${item.yRate.toFixed(3)} | ${item.frozenPosterior.toFixed(3)} |`);
}
console.log(`\n- Prior Brier: ${report.signal.priorBrier?.toFixed(4)}`);
console.log(`- Posterior Brier: ${report.signal.posteriorBrier?.toFixed(4)}`);
console.log(`- Prior-minus-posterior: ${report.signal.priorMinusPosterior?.mean.toFixed(4)} [${report.signal.priorMinusPosterior?.bootstrap95?.map((x) => x.toFixed(4)).join(", ")}]`);
console.log(`- Fresh signal direction: ${report.signal.freshDirection?.toFixed(4)}`);
console.log(`- Signal gates: ${JSON.stringify(report.signal.gates)}, pass=${report.signal.pass}`);
console.log("\n| Arm | Accuracy | Publish rate |");
console.log("|---|---:|---:|");
for (const arm of REAL_SIGNAL_ARMS) {
  const item = report.action.byArm[arm];
  if (item) console.log(`| ${arm} | ${item.accuracy.toFixed(3)} | ${item.publishRate.toFixed(3)} |`);
}
console.log(`\n- EARLY typed flip: ${report.action.earlyTypedFlip?.toFixed(3)}`);
console.log(`- NO_EARLY typed stability: ${report.action.noEarlyTypedStability?.toFixed(3)}`);
console.log(`- Control stability: ${report.action.controlStability?.toFixed(3)}`);
console.log(`- Action gates: ${JSON.stringify(report.action.gates)}, pass=${report.action.pass}`);
console.log(`- Verdict: ${report.verdict}`);
