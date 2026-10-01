import { readFileSync } from "node:fs";
import { pairedEffect } from "./epistemic-analysis.ts";
import type {
  PersistenceArm,
  PersistenceReport,
  PersistenceRun,
} from "./persistence.ts";

type Metric = "postSeller" | "postBuyer" | "postTrade" | "meanScore";
const metrics: Metric[] = ["postSeller", "postBuyer", "postTrade", "meanScore"];
const report = JSON.parse(readFileSync("src/data/persistence.json", "utf8")) as PersistenceReport;

function value(run: PersistenceRun, metric: Metric): number {
  if (metric === "postSeller") return run.windows.postReplacement.sellerIntentPerHe;
  if (metric === "postBuyer") return run.windows.postReplacement.buyerIntentPerHe;
  if (metric === "postTrade") return run.windows.postReplacement.tradePerHe;
  return run.meanScore;
}

function deltas(treatment: PersistenceArm, control: PersistenceArm, metric: Metric): number[] {
  const bySeed = new Map(
    report.runs.filter((run) => run.arm === control).map((run) => [run.seed, run]),
  );
  return report.runs
    .filter((run) => run.arm === treatment && bySeed.has(run.seed))
    .sort((a, b) => a.seed - b.seed)
    .map((run) => {
      const base = bySeed.get(run.seed)!;
      if (run.scheduleHash !== base.scheduleHash) {
        throw new Error(`schedule mismatch seed=${run.seed}`);
      }
      return value(run, metric) - value(base, metric);
    });
}

console.log("# Institution carrier paired effects\n");
console.log("| Contrast | Metric | n | Mean Δ | Bootstrap 95% | Sign-flip p | Positive share |");
console.log("|---|---|---:|---:|---:|---:|---:|");
for (const [treatment, control] of [
  ["private-memory", "transient"],
  ["public-ledger", "transient"],
  ["contract", "public-ledger"],
] as [PersistenceArm, PersistenceArm][]) {
  for (const metric of metrics) {
    const effect = pairedEffect(deltas(treatment, control, metric));
    const interval = effect.bootstrap95
      ? `[${effect.bootstrap95[0].toFixed(3)}, ${effect.bootstrap95[1].toFixed(3)}]`
      : "NA";
    console.log(
      `| ${treatment}−${control} | ${metric} | ${effect.n} | ${effect.mean.toFixed(3)} | ${interval} | ${effect.signFlipP?.toFixed(4) ?? "NA"} | ${effect.positiveShare.toFixed(2)} |`,
    );
  }
}

