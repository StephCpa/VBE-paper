import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  CREDIBLE_INFO_ORDERS,
  CREDIBLE_INFO_SEEDS,
  buildCredibleInformationReport,
  type CredibleInformationReport,
  type CredibleInfoRun,
} from "./credible-information-itt.ts";
import {
  printCredibleInformationDryRun,
  runCredibleInformationCell,
} from "./credible-information-itt-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/credible-information-itt.json";
const PUBLIC_PATH = "public/data/credible-information-itt.json";

function loadRuns(): CredibleInfoRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as CredibleInformationReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(CREDIBLE_INFO_SEEDS)) {
    throw new Error("existing result uses different frozen seeds");
  }
  return report.runs;
}

function writeReport(report: CredibleInformationReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

if (process.argv.includes("--dry-run")) {
  printCredibleInformationDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const runs = loadRuns();
const done = new Set(runs.map((run) => `${run.seed}:${run.level}`));
const jobs = CREDIBLE_INFO_SEEDS.flatMap((seed, index) =>
  CREDIBLE_INFO_ORDERS[index % CREDIBLE_INFO_ORDERS.length]!.map((level) => ({ seed, level })),
);
console.log(`resume ${runs.length}; credible-information jobs=${jobs.length}`);
for (const job of jobs) {
  const key = `${job.seed}:${job.level}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  console.log(`credible information seed=${job.seed} level=${job.level}`);
  const run = await runCredibleInformationCell(job.seed, job.level);
  runs.push(run);
  done.add(key);
  const report = buildCredibleInformationReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} calls=${run.calls} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)}`,
  );
}
const final = buildCredibleInformationReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify(final.primary));
