import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  REAL_SIGNAL_ARMS,
  REAL_SIGNAL_SEEDS,
  buildRealSignalReport,
  realSignalOrder,
  realSignalPrompt,
  type RealSignalReport,
} from "./founder-real-signal-transfer.ts";
import { runRealSignalSeed } from "./founder-real-signal-transfer-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-real-signal-transfer.json";
const PUBLIC_PATH = "public/data/founder-real-signal-transfer.json";

function loadRuns() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as RealSignalReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing real-signal data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(REAL_SIGNAL_SEEDS)) throw new Error("existing real-signal data uses different frozen seeds");
  return report.runs;
}

function writeReport(report: RealSignalReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function dryRun() {
  for (const signal of ["NO_EARLY_TRADE", "EARLY_TRADE"] as const) {
    for (const arm of REAL_SIGNAL_ARMS) console.log(`\n=== signal=${signal} arm=${arm} ===\n${realSignalPrompt(arm, signal)}`);
  }
  console.log(`\n=== seeds/orders ===\n${JSON.stringify(REAL_SIGNAL_SEEDS.map((seed) => ({ seed, order: realSignalOrder(seed) })), null, 2)}`);
}

if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);

const runs = loadRuns();
const done = new Set(runs.map((run) => run.seed));
console.log(`resume ${runs.length}; real-signal seeds=${REAL_SIGNAL_SEEDS.length}`);
for (const seed of REAL_SIGNAL_SEEDS) {
  if (done.has(seed)) { console.log(`skip seed=${seed}`); continue; }
  const run = await runRealSignalSeed(seed);
  runs.push(run);
  done.add(seed);
  const report = buildRealSignalReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(`done seed=${seed} signal=${run.signal} early=${run.earlyTrades} future=${run.futureTrades} schedule=${run.scheduleHash}`);
}
const final = buildRealSignalReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(`signal priorBrier=${final.signal.priorBrier?.toFixed(4)} posteriorBrier=${final.signal.posteriorBrier?.toFixed(4)} improvement=${final.signal.priorMinusPosterior?.mean.toFixed(4)} bootstrap=${final.signal.priorMinusPosterior?.bootstrap95?.map((x) => x.toFixed(4)).join(",")} direction=${final.signal.freshDirection?.toFixed(4)} pass=${final.signal.pass}`);
for (const arm of REAL_SIGNAL_ARMS) { const item = final.action.byArm[arm]!; console.log(`${arm}: accuracy=${item.accuracy.toFixed(3)} publish=${item.publishRate.toFixed(3)}`); }
console.log(`action earlyFlip=${final.action.earlyTypedFlip?.toFixed(3)} noEarlyStability=${final.action.noEarlyTypedStability?.toFixed(3)} controlStability=${final.action.controlStability?.toFixed(3)} pass=${final.action.pass}`);
