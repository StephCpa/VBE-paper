import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FOUNDER_ROYALTY_ORDERS, FOUNDER_ROYALTY_SEEDS, buildFounderRoyaltyReport, founderRoyaltyPrompt, type FounderRoyaltyReport } from "./founder-royalty.ts";
import { runFounderRoyaltyArm } from "./founder-royalty-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/founder-royalty.json";
const PUBLIC_PATH = "public/data/founder-royalty.json";
function loadRuns() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as FounderRoyaltyReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing founder-royalty data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(FOUNDER_ROYALTY_SEEDS)) throw new Error("existing founder-royalty data uses different frozen seeds");
  return report.runs;
}
function writeReport(report: FounderRoyaltyReport) {
  mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json);
}
function printDryRun() {
  const me: AgentState = { id: 3, type: "E", checks: 1, chits: 0, score: 1, solved: true, receivedFrom: null, memory: [] };
  for (const arm of FOUNDER_ROYALTY_ORDERS[0]!) { console.log(`\n=== ${arm} ===`); console.log(founderRoyaltyPrompt(arm, me, 1, 24)); }
}
if (process.argv.includes("--dry-run")) { printDryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const runs = loadRuns();
const done = new Set(runs.map((r) => `${r.arm}:${r.seed}`));
const jobs = FOUNDER_ROYALTY_SEEDS.flatMap((seed, index) => FOUNDER_ROYALTY_ORDERS[index % 3]!.map((arm) => ({ seed, arm })));
console.log(`resume ${runs.length}; founder-royalty seeds=${FOUNDER_ROYALTY_SEEDS.join(",")}; jobs=${jobs.length}`);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) { console.log(`skip ${key}`); continue; }
  const run = await runFounderRoyaltyArm(job.arm, job.seed); runs.push(run); done.add(key);
  const report = buildFounderRoyaltyReport(runs, LLM_CONFIG.model); writeReport(report);
  console.log(`done ${key} founded=${run.authorship.founded} trades=${run.settlement.qualifyingTrades} payout=${run.settlement.endPayout} seller=${run.seller.sellerIntentPerHe.toFixed(3)} buyer=${run.buyer.buyerIntentPerHe.toFixed(3)} schedule=${run.scheduleHash}`);
}
const final = buildFounderRoyaltyReport(runs, LLM_CONFIG.model); writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(`primary royalty-lottery=${final.primary?.mean.toFixed(3) ?? "NA"} exact-upper-p=${final.primary?.exactUpperP?.toFixed(6) ?? "NA"}`);
console.log(`rates royalty=${final.guardrails.royaltyObserved?.toFixed(3) ?? "NA"} lottery=${final.guardrails.lotteryObserved?.toFixed(3) ?? "NA"} refund=${final.guardrails.refundObserved?.toFixed(3) ?? "NA"}`);
