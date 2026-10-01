import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  FOUNDER_RENT_ORDERS,
  FOUNDER_RENT_SEEDS,
  buildFounderRentReport,
  founderRentPrompt,
  type FounderRentReport,
} from "./founder-rent.ts";
import { runFounderRentArm } from "./founder-rent-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/founder-rent.json";
const PUBLIC_PATH = "public/data/founder-rent.json";

function loadRuns() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as FounderRentReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing founder-rent data uses ${report.model}, current=${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(FOUNDER_RENT_SEEDS)) {
    throw new Error("existing founder-rent data uses a different frozen seed declaration");
  }
  return report.runs;
}

function writeReport(report: FounderRentReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun(): void {
  const me: AgentState = {
    id: 3,
    type: "E",
    checks: 1,
    chits: 0,
    score: 1,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  for (const arm of FOUNDER_RENT_ORDERS[0]!) {
    console.log(`\n=== ${arm} ===`);
    console.log(founderRentPrompt(arm, me, 1, 24));
  }
}

if (process.argv.includes("--dry-run")) {
  printDryRun();
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const runs = loadRuns();
const done = new Set(runs.map((run) => `${run.arm}:${run.seed}`));
const jobs = FOUNDER_RENT_SEEDS.flatMap((seed, index) =>
  FOUNDER_RENT_ORDERS[index % FOUNDER_RENT_ORDERS.length]!.map((arm) => ({ seed, arm })),
);

console.log(
  `resume ${runs.length}; founder-rent seeds=${FOUNDER_RENT_SEEDS.join(",")}; jobs=${jobs.length}`,
);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runFounderRentArm(job.arm, job.seed);
  runs.push(run);
  done.add(key);
  const report = buildFounderRentReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} founded=${run.authorship.founded} net=${run.authorship.netScoreChange} seller=${run.seller.sellerIntentPerHe.toFixed(3)} buyer=${run.buyer.buyerIntentPerHe.toFixed(3)} trade=${run.trade.tradePerHe.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildFounderRentReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(
  `primary profit-wealth=${final.primary?.mean.toFixed(3) ?? "NA"} exact-upper-p=${final.primary?.exactUpperP?.toFixed(6) ?? "NA"}`,
);
console.log(
  `rates profit=${final.guardrails.profitObserved?.toFixed(3) ?? "NA"} wealth=${final.guardrails.wealthObserved?.toFixed(3) ?? "NA"} refund=${final.guardrails.refundObserved?.toFixed(3) ?? "NA"}`,
);
