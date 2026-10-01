import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  REWARD_CONFIRMATORY_ORDERS,
  REWARD_CONFIRMATORY_SEEDS,
  buildRewardConfirmatoryReport,
  type RewardConfirmatoryReport,
} from "./epistemic-reward-confirmatory.ts";
import { disassemblyCellKey, type DisassemblyRun } from "./epistemic-disassembly.ts";
import {
  disassemblyPrompt,
  runDisassemblyCell,
} from "./epistemic-disassembly-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { ReactivityReplayContext } from "./epistemic-reactivity-execution.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/epistemic-reward-confirmatory.json";
const PUBLIC_PATH = "public/data/epistemic-reward-confirmatory.json";

function loadRuns(): DisassemblyRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as RewardConfirmatoryReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing reward confirmation uses ${report.model}, current=${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(REWARD_CONFIRMATORY_SEEDS)) {
    throw new Error("existing reward confirmation uses a different frozen seed declaration");
  }
  return report.runs;
}

function writeReport(report: RewardConfirmatoryReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun(): void {
  const me: AgentState = {
    id: 2,
    type: "E",
    checks: 1,
    chits: 0,
    score: 0,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  const partner: AgentState = { ...me, id: 3, type: "H", chits: 1, solved: false };
  const context: ReactivityReplayContext = { me, partner, t: 5, T: 24 };
  for (const mode of ["belief-unrewarded", "belief-rewarded"] as const) {
    for (const delivery of ["private", "public"] as const) {
      console.log(`\n=== ${delivery}:${mode} ===`);
      console.log(disassemblyPrompt(context, { delivery, mode }));
    }
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
const done = new Set(runs.map((run) => `${disassemblyCellKey(run)}:${run.seed}`));
const jobs = REWARD_CONFIRMATORY_SEEDS.flatMap((seed, index) =>
  REWARD_CONFIRMATORY_ORDERS[index % REWARD_CONFIRMATORY_ORDERS.length]!.map((cell) => ({
    seed,
    cell,
  })),
);

console.log(
  `resume ${runs.length}; reward-confirmatory seeds=${REWARD_CONFIRMATORY_SEEDS.join(",")}; jobs=${jobs.length}`,
);
for (const job of jobs) {
  const key = `${disassemblyCellKey(job.cell)}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runDisassemblyCell(job.cell, job.seed);
  runs.push(run);
  done.add(key);
  const report = buildRewardConfirmatoryReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)} a=${run.aux.fieldA.toFixed(3)} b=${run.aux.fieldB.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildRewardConfirmatoryReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(
  `primary reward interaction=${final.primary?.mean.toFixed(3) ?? "NA"} exact-upper-p=${final.primary?.exactUpperP.toFixed(6) ?? "NA"}`,
);
console.log(
  `rewarded public=${final.directionGuardrails.rewardedObserved?.toFixed(3) ?? "NA"}; unrewarded public=${final.directionGuardrails.unrewardedObserved?.toFixed(3) ?? "NA"}`,
);
