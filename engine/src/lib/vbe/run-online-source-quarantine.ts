import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";
import {
  ONLINE_SOURCE_ARMS,
  ONLINE_SOURCE_SEEDS,
  buildOnlineSourceReport,
  onlineSourceOrder,
  type OnlineSourceReport,
  type OnlineSourceRun,
} from "./online-source-quarantine.ts";
import { printOnlineSourceDryRun, runOnlineSourceCell } from "./online-source-quarantine-execution.ts";

const DATA_PATH = "src/data/online-source-quarantine.json";
const PUBLIC_PATH = "public/data/online-source-quarantine.json";

function loadRuns(): OnlineSourceRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as OnlineSourceReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(ONLINE_SOURCE_SEEDS)) throw new Error("existing result uses different frozen seeds");
  return report.runs;
}

function writeReport(runs: OnlineSourceRun[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(buildOnlineSourceReport(runs, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

if (process.argv.includes("--dry-run")) {
  printOnlineSourceDryRun();
  console.log(JSON.stringify(ONLINE_SOURCE_SEEDS.map((seed) => ({ seed, order: onlineSourceOrder(seed) })), null, 2));
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const runs = loadRuns();
const done = new Set(runs.map((run) => `${run.seed}|${run.arm}`));
console.log(`resume ${runs.length}; online-source jobs=${ONLINE_SOURCE_SEEDS.length * ONLINE_SOURCE_ARMS.length}`);
for (const seed of ONLINE_SOURCE_SEEDS) {
  for (const arm of onlineSourceOrder(seed)) {
    const key = `${seed}|${arm}`;
    if (done.has(key)) {
      console.log(`skip ${key}`);
      continue;
    }
    console.log(`online-source ${key}`);
    const run = await runOnlineSourceCell(arm, seed);
    runs.push(run);
    done.add(key);
    writeReport(runs);
    console.log(`done ${key} calls=${run.calls} seller=${run.treatment.sellerIntentPerHe.toFixed(3)} buyer=${run.treatment.buyerIntentPerHe.toFixed(3)} trade=${run.treatment.tradePerHe.toFixed(3)} score=${run.meanScore.toFixed(3)}`);
  }
}
const final = buildOnlineSourceReport(runs, LLM_CONFIG.model);
writeReport(runs);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, effects: final.effects, gates: final.gates, integrity: final.integrity }, null, 2));
