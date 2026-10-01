import { readFileSync } from "node:fs";
import { pairedEffect } from "./epistemic-analysis.ts";
import type { FounderArm, FounderReport, FounderRun } from "./founder.ts";

type Metric = "seller" | "buyer" | "trade" | "meanScore";
const metrics: Metric[] = ["seller", "buyer", "trade", "meanScore"];

const report = JSON.parse(readFileSync("src/data/founder.json", "utf8")) as FounderReport;

function value(run: FounderRun, metric: Metric): number {
  if (metric === "seller") return run.seller.sellerIntentPerHe;
  if (metric === "buyer") return run.buyer.buyerIntentPerHe;
  if (metric === "trade") return run.trade.tradePerHe;
  return run.meanScore;
}

function pairedDelta(treatment: FounderArm, control: FounderArm, metric: Metric): number[] {
  const controlBySeed = new Map(
    report.runs.filter((run) => run.arm === control).map((run) => [run.seed, run]),
  );
  return report.runs
    .filter((run) => run.arm === treatment && controlBySeed.has(run.seed))
    .sort((a, b) => a.seed - b.seed)
    .map((run) => {
      const base = controlBySeed.get(run.seed)!;
      if (run.scheduleHash !== base.scheduleHash) {
        throw new Error(`schedule mismatch seed=${run.seed}`);
      }
      return value(run, metric) - value(base, metric);
    });
}

console.log("# Founder incentive paired effects\n");
console.log("| Contrast | Metric | n | Mean Δ | Bootstrap 95% | Sign-flip p | Positive share |");
console.log("|---|---|---:|---:|---:|---:|---:|");
for (const [treatment, control] of [
  ["refund", "costly"],
  ["external", "costly"],
] as [FounderArm, FounderArm][]) {
  for (const metric of metrics) {
    const effect = pairedEffect(pairedDelta(treatment, control, metric));
    const interval = effect.bootstrap95
      ? `[${effect.bootstrap95[0].toFixed(3)}, ${effect.bootstrap95[1].toFixed(3)}]`
      : "NA";
    console.log(
      `| ${treatment}−${control} | ${metric} | ${effect.n} | ${effect.mean.toFixed(3)} | ${interval} | ${effect.signFlipP?.toFixed(4) ?? "NA"} | ${effect.positiveShare.toFixed(2)} |`,
    );
  }
}

