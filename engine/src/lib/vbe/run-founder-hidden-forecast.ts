import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { HIDDEN_FORECAST_COSTS, HIDDEN_FORECAST_SEEDS, buildHiddenForecastReport, hiddenAuditPrompt, hiddenDecisionPrompt, type HiddenForecastReport } from "./founder-hidden-forecast.ts";
import { runHiddenForecastSeed } from "./founder-hidden-forecast-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/founder-hidden-forecast.json";
const PUBLIC_PATH = "public/data/founder-hidden-forecast.json";
function loadRuns() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as HiddenForecastReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing hidden-forecast data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.seeds) !== JSON.stringify(HIDDEN_FORECAST_SEEDS)) throw new Error("existing hidden-forecast data uses different frozen seeds");
  return report.runs;
}
function writeReport(report: HiddenForecastReport) {
  mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json);
}
function dryRun() {
  const me: AgentState = { id: 1, type: "H", checks: 1, chits: 0, score: 0, solved: false, receivedFrom: null, memory: [] };
  const decisions = HIDDEN_FORECAST_COSTS.map((cost, i) => ({ cost, position: i + 1, promptHash: "0".repeat(64), decision: { publish: cost < 5, rationale: "dry" } }));
  for (let i = 0; i < HIDDEN_FORECAST_COSTS.length; i++) console.log(`\n=== cost ${HIDDEN_FORECAST_COSTS[i]} ===\n${hiddenDecisionPrompt(HIDDEN_FORECAST_COSTS[i]!, me, i + 1)}`);
  console.log(`\n=== sealed audit ===\n${hiddenAuditPrompt(decisions, me)}`);
}
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const runs = loadRuns();
const done = new Set(runs.map((r) => r.seed));
console.log(`resume ${runs.length}; hidden-forecast seeds=${HIDDEN_FORECAST_SEEDS.length}`);
for (const seed of HIDDEN_FORECAST_SEEDS) {
  if (done.has(seed)) { console.log(`skip seed=${seed}`); continue; }
  const run = await runHiddenForecastSeed(seed);
  runs.push(run); done.add(seed);
  const report = buildHiddenForecastReport(runs, LLM_CONFIG.model); writeReport(report);
  console.log(`done seed=${seed} trades=${run.realizedTrades} schedule=${run.scheduleHash}`);
}
const final = buildHiddenForecastReport(runs, LLM_CONFIG.model); writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(`forecast modelBrier=${final.forecast.modelBrier?.toFixed(4)} baseline=${final.forecast.baselineBrier?.toFixed(4)} effect=${final.forecast.baselineMinusModel?.mean.toFixed(4)} bootstrap=${final.forecast.baselineMinusModel?.bootstrap95?.map((x) => x.toFixed(4)).join(",")} TV=${final.forecast.totalVariation?.toFixed(4)} pass=${final.forecast.pass}`);
console.log(`decision agreement=${final.decision.overallBenchmarkAgreement?.toFixed(4)} min=${final.decision.minimumCellAgreement?.toFixed(4)} pass=${final.decision.pass}`);
console.log(`confidence brier=${final.confidence.brier?.toFixed(4)} ece=${final.confidence.ece5?.toFixed(4)} coherence=${final.confidence.coherenceMae?.toFixed(4)} pass=${final.confidence.pass}`);
