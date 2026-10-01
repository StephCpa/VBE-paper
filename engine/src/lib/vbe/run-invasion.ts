import { mkdirSync, writeFileSync } from "node:fs";
import { buildInvasionReport } from "./invasion.ts";

const report = buildInvasionReport(80);
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(report, null, 2);
writeFileSync("src/data/invasion.json", json);
writeFileSync("public/data/invasion.json", json);
console.log("verdict", report.verdict);
console.log("caveat", report.caveat);
for (const c of report.cells) {
  console.log(c.name, "mutant", c.mutantMean.toFixed(2), "maj", c.majorityMean.toFixed(2), "win", c.mutantBeatsMajority.toFixed(2));
}
for (const c of report.kPayoff) {
  console.log(`k=${c.k}`, "KW", c.kwMean.toFixed(2), "rest", c.restMean.toFixed(2), "win", c.kwBeatsRest.toFixed(2));
}
