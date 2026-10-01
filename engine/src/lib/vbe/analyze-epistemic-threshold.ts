import { readFileSync } from "node:fs";
import { pairedEffect } from "./epistemic-analysis.ts";
import {
  coordinationSlice,
  epistemicBeliefMean,
  type EpistemicReport,
  type EpistemicRun,
} from "./epistemic.ts";

type Segment = { name: string; first: number; last: number };
type Metric = "seller" | "buyer" | "trade" | "pAccept" | "pSecond";

const segments: Segment[] = [
  { name: "all-5-21", first: 5, last: 21 },
  { name: "k2-sufficient-5-14", first: 5, last: 14 },
  { name: "k2-insufficient-15-21", first: 15, last: 21 },
];
const metrics: Metric[] = ["seller", "buyer", "trade", "pAccept", "pSecond"];

function load(path: string): EpistemicReport {
  return JSON.parse(readFileSync(path, "utf8")) as EpistemicReport;
}

function value(run: EpistemicRun, report: EpistemicReport, segment: Segment, metric: Metric): number {
  const robots = new Set(report.robotIds);
  if (metric === "seller") {
    return coordinationSlice(
      run.result,
      (easyId) => !robots.has(easyId),
      segment.first,
      segment.last,
    ).sellerIntentPerHe;
  }
  if (metric === "buyer") {
    return coordinationSlice(
      run.result,
      (_easyId, hardId) => !robots.has(hardId),
      segment.first,
      segment.last,
    ).buyerIntentPerHe;
  }
  if (metric === "trade") {
    return coordinationSlice(
      run.result,
      (easyId, hardId) => !robots.has(easyId) && !robots.has(hardId),
      segment.first,
      segment.last,
    ).tradePerHe;
  }
  const belief = epistemicBeliefMean(
    run.result,
    report.robotIds,
    segment.first,
    segment.last,
  );
  return belief[metric];
}

function treatmentDeltas(report: EpistemicReport, segment: Segment, metric: Metric): Map<number, number> {
  const privateBySeed = new Map(
    report.runs.filter((run) => run.kind === "private").map((run) => [run.seed, run]),
  );
  const deltas = new Map<number, number>();
  for (const publicRun of report.runs.filter((run) => run.kind === "public")) {
    const privateRun = privateBySeed.get(publicRun.seed);
    if (!privateRun) continue;
    if (publicRun.scheduleHash !== privateRun.scheduleHash) {
      throw new Error(`within-k schedule mismatch for seed ${publicRun.seed}`);
    }
    deltas.set(
      publicRun.seed,
      value(publicRun, report, segment, metric) - value(privateRun, report, segment, metric),
    );
  }
  return deltas;
}

const k1 = load("src/data/epistemic.json");
const k2 = load("src/data/epistemic-k2.json");
if (k1.k !== 1 || k2.k !== 2) throw new Error("expected k=1 and k=2 reports");

console.log("# Information topology × installed-base threshold\n");
console.log("Δ is public−private; DiD is Δ(k=2)−Δ(k=1).\n");
console.log("| Segment | Metric | k=1 Δ | k=2 Δ | DiD | DiD bootstrap 95% | DiD sign-flip p |");
console.log("|---|---|---:|---:|---:|---:|---:|");

for (const segment of segments) {
  for (const metric of metrics) {
    const d1 = treatmentDeltas(k1, segment, metric);
    const d2 = treatmentDeltas(k2, segment, metric);
    const seeds = [...d1.keys()].filter((seed) => d2.has(seed)).sort((a, b) => a - b);
    for (const seed of seeds) {
      const r1 = k1.runs.find((run) => run.seed === seed && run.kind === "private")!;
      const r2 = k2.runs.find((run) => run.seed === seed && run.kind === "private")!;
      if (r1.scheduleHash !== r2.scheduleHash) {
        throw new Error(`cross-k structural schedule mismatch for seed ${seed}`);
      }
    }
    const xs1 = seeds.map((seed) => d1.get(seed)!);
    const xs2 = seeds.map((seed) => d2.get(seed)!);
    const did = seeds.map((seed) => d2.get(seed)! - d1.get(seed)!);
    const e1 = pairedEffect(xs1);
    const e2 = pairedEffect(xs2);
    const ed = pairedEffect(did);
    const interval = ed.bootstrap95
      ? `[${ed.bootstrap95[0].toFixed(3)}, ${ed.bootstrap95[1].toFixed(3)}]`
      : "NA";
    console.log(
      `| ${segment.name} | ${metric} | ${e1.mean.toFixed(3)} | ${e2.mean.toFixed(3)} | ${ed.mean.toFixed(3)} | ${interval} | ${ed.signFlipP?.toFixed(4) ?? "NA"} |`,
    );
  }
}

