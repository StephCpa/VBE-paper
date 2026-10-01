import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  CALIBRATION_COUNTS,
  POSTERIOR_EARLY,
  POSTERIOR_NO_EARLY,
  PRIOR_Y,
  qualifyingTradeCount,
  signalFromEarlyTrades,
} from "./founder-real-signal-transfer.ts";
import type { RunResult } from "./types.ts";

const SOURCES = [
  { path: "src/data/founder-sanitized-royalty.json", hash: "f83a23032e37a7ddff170ddb511704056bb515311151ba0202ad37b989679f43", arm: "canonical-trade-royalty" },
  { path: "src/data/founder-hidden-forecast.json", hash: "ccde7a6cc89ae81c3eae32a763bd7ccad0b96f133e05fa3491c687a86a1837e5", arm: null },
  { path: "src/data/founder-forecast-scaffold.json", hash: "7f8a656cfdb351adf87b187ddca3a4ef97587f83b9abb76ad21b31b2da58e198", arm: null },
] as const;

type SourceRun = { arm?: string; result: RunResult };
const rows: Array<{ source: string; signal: "NO_EARLY_TRADE" | "EARLY_TRADE"; y: 0 | 1 }> = [];
const bySource: Array<{ source: string; n: number; priorBrier: number; posteriorBrier: number; improvement: number }> = [];

for (const source of SOURCES) {
  const bytes = readFileSync(source.path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== source.hash) throw new Error(`calibration source hash mismatch ${source.path}: ${hash}`);
  const parsed = JSON.parse(bytes.toString("utf8")) as { runs: SourceRun[] };
  const runs = parsed.runs.filter((run) => source.arm === null || run.arm === source.arm);
  const local = runs.map((run) => {
    const signal = signalFromEarlyTrades(qualifyingTradeCount(run.result, 1, 4));
    const y = Number(qualifyingTradeCount(run.result, 5, 23) >= 1) as 0 | 1;
    return { source: source.path, signal, y };
  });
  rows.push(...local);
  const priorLoss = local.map((row) => (PRIOR_Y - row.y) ** 2);
  const posteriorLoss = local.map((row) => ((row.signal === "NO_EARLY_TRADE" ? POSTERIOR_NO_EARLY : POSTERIOR_EARLY) - row.y) ** 2);
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  bySource.push({ source: source.path, n: local.length, priorBrier: average(priorLoss), posteriorBrier: average(posteriorLoss), improvement: average(priorLoss) - average(posteriorLoss) });
}

const counts = { noEarly: { y0: 0, y1: 0 }, early: { y0: 0, y1: 0 } };
for (const row of rows) {
  const group = row.signal === "NO_EARLY_TRADE" ? counts.noEarly : counts.early;
  if (row.y) group.y1 += 1; else group.y0 += 1;
}
if (rows.length !== 90 || JSON.stringify(counts) !== JSON.stringify(CALIBRATION_COUNTS)) throw new Error(`calibration counts mismatch n=${rows.length} counts=${JSON.stringify(counts)}`);

console.log("# Real-signal calibration validation\n");
console.log(`- Total runs: ${rows.length}`);
console.log(`- Counts: ${JSON.stringify(counts)}`);
console.log(`- Prior P(Y=1): ${PRIOR_Y.toFixed(6)}`);
console.log(`- P(Y=1|NO_EARLY_TRADE): ${POSTERIOR_NO_EARLY.toFixed(6)}`);
console.log(`- P(Y=1|EARLY_TRADE): ${POSTERIOR_EARLY.toFixed(6)}`);
console.log("\n| Calibration source | n | Prior Brier | Posterior Brier | Improvement |");
console.log("|---|---:|---:|---:|---:|");
for (const item of bySource) console.log(`| ${item.source} | ${item.n} | ${item.priorBrier.toFixed(4)} | ${item.posteriorBrier.toFixed(4)} | ${item.improvement.toFixed(4)} |`);
