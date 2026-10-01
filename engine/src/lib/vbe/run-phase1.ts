import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPhase1, type Phase1Report, type Phase1Run } from "./phase1.ts";
import { DEFAULT_PARAMS } from "./params.ts";

const seeds = (process.env.P1_SEEDS ?? "17,29,41")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));
const conditions = (process.env.P1_COND ?? "label,story").split(",") as (
  | "label"
  | "story"
)[];

function loadExisting(): Phase1Run[] {
  const path = "src/data/phase1.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as Phase1Report;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: Phase1Report) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/phase1.json", json);
  writeFileSync("public/data/phase1.json", json);
}

const existing = loadExisting();
console.log(`resume ${existing.length} runs; seeds ${seeds.join(",")}`);
const report = await runPhase1({
  seeds,
  conditions,
  params: DEFAULT_PARAMS,
  existing,
  onProgress: (r) => {
    writeReport(r);
    console.log("checkpoint", r.verdict);
  },
});
writeReport(report);
console.log("verdict", report.verdict);
console.log("caveat", report.caveat);
for (const [k, v] of Object.entries(report.byCondition)) {
  if (!v) continue;
  console.log(
    `${k} n=${v.n} mean=${v.meanScore.toFixed(2)} acc ${v.accInterior.toFixed(2)}→${v.accEnd.toFixed(2)} offers_end=${v.heOffersEnd} L2=${v.l2}`,
  );
}
for (const run of report.runs) {
  console.log(
    `run ${run.condition} seed=${run.seed} calls=${run.calls} apiFails=${run.apiFails} parseFails=${run.parseFails} mean=${run.result.meanScore.toFixed(2)} acc ${run.result.accInterior.toFixed(2)}→${run.result.accEnd.toFixed(2)} endOffers=${run.result.heOffersEnd}`,
  );
}
