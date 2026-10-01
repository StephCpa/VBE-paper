import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  REACTIVITY_ORDERS,
  REACTIVITY_SEEDS,
  buildReactivityReport,
  reactivityCellKey,
  type ReactivityReport,
  type ReactivityRun,
} from "./epistemic-reactivity.ts";
import {
  printReactivityDryRun,
  runReactivityCell,
} from "./epistemic-reactivity-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/epistemic-reactivity-pilot.json";
const PUBLIC_PATH = "public/data/epistemic-reactivity-pilot.json";

function loadRuns(): ReactivityRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ReactivityReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing reactivity pilot uses ${report.model}, current=${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(REACTIVITY_SEEDS)) {
    throw new Error("existing reactivity report uses a different seed declaration");
  }
  return report.runs;
}

function writeReport(report: ReactivityReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

if (process.argv.includes("--dry-run")) {
  printReactivityDryRun();
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const runs = loadRuns();
const done = new Set(runs.map((run) => `${reactivityCellKey(run)}:${run.seed}`));
const jobs = REACTIVITY_SEEDS.flatMap((seed, index) =>
  REACTIVITY_ORDERS[index % REACTIVITY_ORDERS.length]!.map((cell) => ({ seed, cell })),
);

console.log(`resume ${runs.length}; seeds=${REACTIVITY_SEEDS.join(",")}; jobs=${jobs.length}`);
for (const job of jobs) {
  const key = `${reactivityCellKey(job.cell)}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runReactivityCell(job.cell, job.seed);
  runs.push(run);
  done.add(key);
  const report = buildReactivityReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)} p1=${run.belief.pAccept.toFixed(3)} p2=${run.belief.pSecond.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildReactivityReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
for (const mode of ["inline", "sealed-replay"] as const) {
  const effect = final.publicEffectInference[mode]?.buyerIntentRate;
  if (effect) {
    console.log(
      `${mode} public-private buyer=${effect.mean.toFixed(3)} interval=[${effect.bootstrap95?.map((x) => x.toFixed(3)).join(", ")}] p=${effect.signFlipP}`,
    );
  }
}
const interaction = final.interactionInference.buyerIntentRate;
if (interaction) {
  console.log(
    `buyer interaction=${interaction.mean.toFixed(3)} interval=[${interaction.bootstrap95?.map((x) => x.toFixed(3)).join(", ")}] p=${interaction.signFlipP}`,
  );
}
