import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FORECAST_ARMS, FORECAST_SCAFFOLD_SEEDS, buildForecastScaffoldReport, forecastPrompt, serializeInitialState, type ForecastScaffoldReport } from "./founder-forecast-scaffold.ts";
import { runForecastScaffoldSeed } from "./founder-forecast-scaffold-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import type { AgentState } from "./types.ts";

const DATA_PATH = "src/data/founder-forecast-scaffold.json", PUBLIC_PATH = "public/data/founder-forecast-scaffold.json";
function loadRuns() { if (!existsSync(DATA_PATH)) return []; const r = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ForecastScaffoldReport; if (r.model !== LLM_CONFIG.model) throw new Error(`existing forecast-scaffold data uses ${r.model}, current=${LLM_CONFIG.model}`); if (JSON.stringify(r.seeds) !== JSON.stringify(FORECAST_SCAFFOLD_SEEDS)) throw new Error("existing forecast-scaffold data uses different seeds"); return r.runs; }
function writeReport(report: ForecastScaffoldReport) { mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true }); const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json); }
function dryRun() { const agents: AgentState[] = Array.from({ length: 8 }, (_, id) => ({ id, type: id < 4 ? "H" : "E", checks: 1, chits: id % 2, score: id < 4 ? 0 : 3, solved: id >= 4, receivedFrom: null, memory: [] })); const state = serializeInitialState(agents); for (const arm of FORECAST_ARMS) console.log(`\n=== ${arm} ===\n${forecastPrompt(arm, state)}`); }
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const runs = loadRuns(), done = new Set(runs.map((r) => r.seed)); console.log(`resume ${runs.length}; forecast-scaffold seeds=${FORECAST_SCAFFOLD_SEEDS.length}`);
for (const seed of FORECAST_SCAFFOLD_SEEDS) { if (done.has(seed)) { console.log(`skip seed=${seed}`); continue; } const run = await runForecastScaffoldSeed(seed); runs.push(run); done.add(seed); const report = buildForecastScaffoldReport(runs, LLM_CONFIG.model); writeReport(report); console.log(`done seed=${seed} trades=${run.realizedTrades} calls=${run.actionCalls + 3}`); }
const final = buildForecastScaffoldReport(runs, LLM_CONFIG.model); writeReport(final); console.log(`verdict ${final.verdict}`); for (const arm of FORECAST_ARMS) { const s = final.byArm[arm]!; console.log(`${arm}: brier=${s.brier.toFixed(4)} tv=${s.totalVariation.toFixed(4)} mean=[${s.meanPrediction.map((x) => x.toFixed(3)).join(",")}]`); } console.log(`baseline: brier=${final.baseline?.brier.toFixed(4)} tv=${final.baseline?.totalVariation.toFixed(4)}`);
