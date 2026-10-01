import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RED_BRANCH_CASES, RED_BRANCH_INTERFACES, buildRedBranchReport, redBranchOrder, redBranchPrompt, type RedBranchReport } from "./founder-posterior-red-branch.ts";
import { runRedBranchCase } from "./founder-posterior-red-branch-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-posterior-red-branch.json", PUBLIC_PATH = "public/data/founder-posterior-red-branch.json";
function loadCases() { if (!existsSync(DATA_PATH)) return []; const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as RedBranchReport; if (report.model !== LLM_CONFIG.model) throw new Error(`existing red-branch data uses ${report.model}, current=${LLM_CONFIG.model}`); return report.cases; }
function writeReport(report: RedBranchReport) { mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true }); const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json); }
function dryRun() { for (const kind of RED_BRANCH_INTERFACES) console.log(`\n=== ${kind} ===\n${redBranchPrompt(kind, RED_BRANCH_CASES[0]!)}`); console.log(`\n=== cases/orders ===\n${JSON.stringify(RED_BRANCH_CASES.map((item, index) => ({ caseIndex: index + 1, sourceCaseId: item.caseId, prior: item.prior, signalModel: item.signalModel, order: redBranchOrder(index + 1) })), null, 2)}`); }
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const cases = loadCases(), done = new Set(cases.map((item) => item.caseIndex)); console.log(`resume ${cases.length}; red-branch cases=${RED_BRANCH_CASES.length}`);
for (let caseIndex = 1; caseIndex <= RED_BRANCH_CASES.length; caseIndex++) { if (done.has(caseIndex)) { console.log(`skip case=${caseIndex}`); continue; } const result = await runRedBranchCase(caseIndex); cases.push(result); done.add(caseIndex); const report = buildRedBranchReport(cases, LLM_CONFIG.model); writeReport(report); console.log(`done case=${caseIndex} prior=${result.case.prior.toFixed(2)} signal=${result.case.signalModel}/RED`); }
const final = buildRedBranchReport(cases, LLM_CONFIG.model); writeReport(final); console.log(`verdict ${final.verdict}`); for (const kind of RED_BRANCH_INTERFACES) { const s = final.byInterface[kind]!; console.log(`${kind}: accuracy=${s.accuracy02.toFixed(3)} mae=${s.mae.toFixed(4)} direction=${s.directionAccuracy.toFixed(3)} copy=${s.priorCopyRate.toFixed(3)} pass=${s.pass}`); }
