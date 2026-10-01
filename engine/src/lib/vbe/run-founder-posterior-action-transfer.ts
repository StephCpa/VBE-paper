import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ACTION_TRANSFER_ARMS, actionTransferOrder, actionTransferPrompt, buildActionTransferReport, type ActionTransferReport } from "./founder-posterior-action-transfer.ts";
import { runActionTransferCase } from "./founder-posterior-action-transfer-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import { POSTERIOR_CASES } from "./founder-posterior-update.ts";

const DATA_PATH = "src/data/founder-posterior-action-transfer.json", PUBLIC_PATH = "public/data/founder-posterior-action-transfer.json";
function loadCases() { if (!existsSync(DATA_PATH)) return []; const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ActionTransferReport; if (report.model !== LLM_CONFIG.model) throw new Error(`existing action-transfer data uses ${report.model}, current=${LLM_CONFIG.model}`); return report.cases; }
function writeReport(report: ActionTransferReport) { mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true }); const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json); }
function dryRun() { for (const arm of ACTION_TRANSFER_ARMS) console.log(`\n=== ${arm} ===\n${actionTransferPrompt(arm, POSTERIOR_CASES[0]!)}`); console.log(`\n=== cases/orders ===\n${JSON.stringify(POSTERIOR_CASES.map((item) => ({ caseId: item.caseId, prior: item.prior, signal: item.observed, sensor: item.signalModel, order: actionTransferOrder(item.caseId) })), null, 2)}`); }
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); } if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const cases = loadCases(), done = new Set(cases.map((item) => item.caseId)); console.log(`resume ${cases.length}; action-transfer cases=${POSTERIOR_CASES.length}`);
for (const item of POSTERIOR_CASES) { if (done.has(item.caseId)) { console.log(`skip case=${item.caseId}`); continue; } const result = await runActionTransferCase(item.caseId); cases.push(result); done.add(item.caseId); const report = buildActionTransferReport(cases, LLM_CONFIG.model); writeReport(report); console.log(`done case=${item.caseId} prior=${item.prior.toFixed(2)} signal=${item.observed}`); }
const final = buildActionTransferReport(cases, LLM_CONFIG.model); writeReport(final); console.log(`verdict ${final.verdict}`); for (const arm of ACTION_TRANSFER_ARMS) { const s = final.byArm[arm]!; console.log(`${arm}: accuracy=${s.accuracy.toFixed(3)} publish=${s.publishRate.toFixed(3)}`); } console.log(`typedFlip=${final.typedFlipRate?.toFixed(3)} controlStability=${final.noninformativeStability?.toFixed(3)} gain=${final.posteriorTargetGain?.mean.toFixed(3)}`);
