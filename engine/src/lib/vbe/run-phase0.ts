import { mkdirSync, writeFileSync } from "node:fs";
import { runPhase0 } from "./phase0.ts";

const report = await runPhase0({
  acceptN: Number(process.env.ACCEPT_N ?? "8"),
  schellingN: Number(process.env.SCHELLING_N ?? "12"),
  concurrency: 6,
});
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(report, null, 2);
writeFileSync("src/data/phase0.json", json);
writeFileSync("public/data/phase0.json", json);
console.log("floor", report.floor);
for (const a of report.accept) {
  console.log(`accept ${a.id} ${a.yes}/${a.n} = ${a.rate.toFixed(2)}`);
}
for (const s of report.schelling) {
  console.log(`schelling ${s.id} match=${s.match.toFixed(2)} top=${s.top}`);
}
