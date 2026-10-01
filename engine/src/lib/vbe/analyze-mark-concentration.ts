import { readFileSync } from "node:fs";
import type { MarkConcentrationReport } from "./mark-concentration.ts";

const path = process.argv[2] ?? "src/data/mark-concentration.json";
const report = JSON.parse(readFileSync(path, "utf8")) as MarkConcentrationReport;

console.log("# Fixed-supply mark concentration intervention");
console.log(`- Complete seed blocks: ${report.completeSeeds}/${report.seeds.length}`);
for (const [name, metric] of Object.entries(report.metrics)) {
  if (!metric) continue;
  console.log(`- ${name}: diffuse=${metric.diffuseMean.toFixed(4)} concentrated=${metric.concentratedMean.toFixed(4)} effect=${metric.effect.mean.toFixed(4)} bootstrap=${metric.effect.bootstrap95?.map((value) => value.toFixed(4)).join(",")}`);
}
console.log(`- Integrity: ${JSON.stringify(report.integrity)}`);
console.log(`- Gates: ${JSON.stringify(report.gates)}`);
console.log(`- Verdict: ${report.verdict}`);
