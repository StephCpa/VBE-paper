import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SANITIZED_ROYALTY_ORDERS, SANITIZED_ROYALTY_SEEDS, buildSanitizedRoyaltyReport, sanitizedRoyaltyPrompt, type SanitizedRoyaltyReport } from "./founder-sanitized-royalty.ts";
import { runSanitizedRoyaltyArm } from "./founder-sanitized-royalty-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/founder-sanitized-royalty.json";
const PUBLIC_PATH = "public/data/founder-sanitized-royalty.json";

function loadRuns() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SanitizedRoyaltyReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing sanitized-royalty data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(SANITIZED_ROYALTY_SEEDS)) throw new Error("existing sanitized-royalty data uses different frozen seeds");
  return report.runs;
}

function writeReport(report: SanitizedRoyaltyReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun() {
  const me: AgentState = { id: 3, type: "E", checks: 1, chits: 0, score: 1, solved: true, receivedFrom: null, memory: [] };
  for (const arm of SANITIZED_ROYALTY_ORDERS[0]!) console.log(`\n=== ${arm} ===\n${sanitizedRoyaltyPrompt(arm, me, 1, 24)}`);
}

if (process.argv.includes("--dry-run")) { printDryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const runs = loadRuns();
const done = new Set(runs.map((r) => `${r.arm}:${r.seed}`));
const jobs = SANITIZED_ROYALTY_SEEDS.flatMap((seed, index) => SANITIZED_ROYALTY_ORDERS[index % 3]!.map((arm) => ({ seed, arm })));
console.log(`resume ${runs.length}; sanitized-royalty seeds=${SANITIZED_ROYALTY_SEEDS.join(",")}; jobs=${jobs.length}`);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) { console.log(`skip ${key}`); continue; }
  const run = await runSanitizedRoyaltyArm(job.arm, job.seed);
  runs.push(run); done.add(key);
  const report = buildSanitizedRoyaltyReport(runs, LLM_CONFIG.model); writeReport(report);
  console.log(`done ${key} founded=${run.authorship.founded} trades=${run.settlement.qualifyingTrades} payout=${run.settlement.endPayout} schedule=${run.scheduleHash}`);
}
const final = buildSanitizedRoyaltyReport(runs, LLM_CONFIG.model); writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(`representation=${final.effects.representationRescue?.mean.toFixed(3) ?? "NA"} p=${final.effects.representationRescue?.exactUpperP?.toFixed(8) ?? "NA"}`);
console.log(`contingency=${final.effects.contingencyFidelity?.mean.toFixed(3) ?? "NA"} p=${final.effects.contingencyFidelity?.exactUpperP?.toFixed(8) ?? "NA"}`);
console.log(`rates canonical-trade=${final.guardrails.canonicalTradeObserved?.toFixed(3) ?? "NA"} canonical-lottery=${final.guardrails.canonicalLotteryObserved?.toFixed(3) ?? "NA"}`);
