import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  BELIEF_SENSITIVITY_SEEDS,
  buildBeliefSensitivityReport,
  type BeliefSensitivityReport,
  type BeliefSensitivityRun,
} from "./belief-instrument-sensitivity.ts";
import {
  printBeliefSensitivityDryRun,
  runBeliefSensitivitySeed,
} from "./belief-instrument-sensitivity-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/belief-instrument-sensitivity.json";
const PUBLIC_PATH = "public/data/belief-instrument-sensitivity.json";

function loadRuns(): BeliefSensitivityRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BeliefSensitivityReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(BELIEF_SENSITIVITY_SEEDS)) {
    throw new Error("existing result uses different seeds");
  }
  return report.runs;
}

function writeReport(report: BeliefSensitivityReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

if (process.argv.includes("--dry-run")) {
  printBeliefSensitivityDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const runs = loadRuns();
const done = new Set(runs.map((run) => run.seed));
for (const seed of BELIEF_SENSITIVITY_SEEDS) {
  if (done.has(seed)) continue;
  console.log(`belief sensitivity seed=${seed}`);
  const run = await runBeliefSensitivitySeed(seed);
  runs.push(run);
  done.add(seed);
  writeReport(buildBeliefSensitivityReport(runs, LLM_CONFIG.model));
  console.log(`done seed=${seed} calls=${run.calls} beliefCalls=${run.beliefCalls} nonmid=${run.nonMidpointShare.toFixed(3)} improvement=${run.lossImprovement.toFixed(4)}`);
}
const final = buildBeliefSensitivityReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify(final.summary));
