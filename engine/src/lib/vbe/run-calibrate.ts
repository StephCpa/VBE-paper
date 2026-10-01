import { mkdirSync, writeFileSync } from "node:fs";
import { sweep } from "./calibrate.ts";

const nRuns = Number(process.env.CAL_RUNS ?? "80");
const report = sweep({ nRuns });
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(report, null, 2);
writeFileSync("src/data/calibration.json", json);
writeFileSync("public/data/calibration.json", json);
console.log("verdict", report.verdict);
console.log("frozen", report.frozen);
for (const g of report.gates) {
  console.log(`${g.pass ? "PASS" : "FAIL"}  ${g.name}  ${g.detail}`);
}
for (const c of report.cells) {
  const kw = c.byStrategy.kw;
  console.log(
    `q=${c.q} R=${c.R} pass=${c.pass} KW=${kw.mean.toFixed(2)} acc ${kw.accInterior.toFixed(2)}→${kw.accEnd.toFixed(2)}`,
  );
}
