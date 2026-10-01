import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  DISASSEMBLY_ORDERS,
  DISASSEMBLY_SEEDS,
  buildDisassemblyReport,
  disassemblyCellKey,
  type DisassemblyReport,
  type DisassemblyRun,
} from "./epistemic-disassembly.ts";
import {
  printDisassemblyDryRun,
  runDisassemblyCell,
} from "./epistemic-disassembly-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/epistemic-disassembly-pilot.json";
const PUBLIC_PATH = "public/data/epistemic-disassembly-pilot.json";

function loadRuns(): DisassemblyRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as DisassemblyReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing disassembly pilot uses ${report.model}, current=${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(DISASSEMBLY_SEEDS)) {
    throw new Error("existing disassembly pilot uses a different frozen seed declaration");
  }
  return report.runs;
}

function writeReport(report: DisassemblyReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

if (process.argv.includes("--dry-run")) {
  printDisassemblyDryRun();
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const runs = loadRuns();
const done = new Set(runs.map((run) => `${disassemblyCellKey(run)}:${run.seed}`));
const jobs = DISASSEMBLY_SEEDS.flatMap((seed, index) =>
  DISASSEMBLY_ORDERS[index]!.map((cell) => ({ seed, cell })),
);

console.log(
  `resume ${runs.length}; disassembly seeds=${DISASSEMBLY_SEEDS.join(",")}; jobs=${jobs.length}`,
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
  const report = buildDisassemblyReport(runs, LLM_CONFIG.model);
  writeReport(report);
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)} a=${run.aux.fieldA.toFixed(3)} b=${run.aux.fieldB.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildDisassemblyReport(runs, LLM_CONFIG.model);
writeReport(final);
console.log(`verdict ${final.verdict}`);
for (const mode of final.modes) {
  const effect = final.publicEffectInference[mode]?.buyerIntentRate;
  if (effect) console.log(`${mode} public-private buyer=${effect.mean.toFixed(3)}`);
}
for (const screen of final.componentScreen) {
  console.log(
    `${screen.component} buyer increment=${screen.mean?.toFixed(3) ?? "NA"} nonnegative=${screen.nonnegativeSeeds}/${DISASSEMBLY_SEEDS.length} candidate=${screen.positiveCandidate} offset=${screen.negativeOffset}`,
  );
}
