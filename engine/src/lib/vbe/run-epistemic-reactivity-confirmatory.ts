import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  REACTIVITY_CONFIRMATORY_SEEDS,
  buildReactivityConfirmatoryReport,
  type ReactivityConfirmatoryReport,
} from "./epistemic-reactivity-confirmatory.ts";
import {
  REACTIVITY_ORDERS,
  reactivityCellKey,
  type ReactivityRun,
} from "./epistemic-reactivity.ts";
import {
  printReactivityDryRun,
  runReactivityCell,
} from "./epistemic-reactivity-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/epistemic-reactivity-confirmatory.json";
const PUBLIC_PATH = "public/data/epistemic-reactivity-confirmatory.json";

function loadRuns(): ReactivityRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ReactivityConfirmatoryReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(
      `existing E-R confirmation uses ${report.model}, current=${LLM_CONFIG.model}`,
    );
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(REACTIVITY_CONFIRMATORY_SEEDS)) {
    throw new Error("existing E-R confirmation uses a different frozen seed declaration");
  }
  return report.runs;
}

function writeReport(report: ReactivityConfirmatoryReport): void {
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
const jobs = REACTIVITY_CONFIRMATORY_SEEDS.flatMap((seed, index) =>
  REACTIVITY_ORDERS[index % REACTIVITY_ORDERS.length]!.map((cell) => ({ seed, cell })),
);

console.log(
  `resume ${runs.length}; confirmatory seeds=${REACTIVITY_CONFIRMATORY_SEEDS.join(",")}; jobs=${jobs.length}`,
);
for (const job of jobs) {
  const key = `${reactivityCellKey(job.cell)}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runReactivityCell(job.cell, job.seed, "reactivity-confirmatory");
  runs.push(run);
  done.add(key);
  const report = buildReactivityConfirmatoryReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)} p1=${run.belief.pAccept.toFixed(3)} p2=${run.belief.pSecond.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildReactivityConfirmatoryReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(
  `inline public-private buyer=${final.directionGuardrails.inlineObserved?.toFixed(3) ?? "NA"}`,
);
console.log(
  `sealed-replay public-private buyer=${final.directionGuardrails.sealedObserved?.toFixed(3) ?? "NA"}`,
);
if (final.primary) {
  console.log(
    `buyer interaction=${final.primary.mean.toFixed(3)} interval=[${final.primary.bootstrap95?.map((x) => x.toFixed(3)).join(", ")}] centered-p=${final.primary.centeredOneSidedP} two-sided-p=${final.primary.signFlipP}`,
  );
}
