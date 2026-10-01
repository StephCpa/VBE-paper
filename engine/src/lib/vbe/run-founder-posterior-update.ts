import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { POSTERIOR_CASES, POSTERIOR_INTERFACES, buildPosteriorUpdateReport, posteriorOrder, posteriorPrompt, posteriorTruth, type PosteriorUpdateReport } from "./founder-posterior-update.ts";
import { runPosteriorCase } from "./founder-posterior-update-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-posterior-update.json";
const PUBLIC_PATH = "public/data/founder-posterior-update.json";
function loadCases() { if (!existsSync(DATA_PATH)) return []; const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as PosteriorUpdateReport; if (report.model !== LLM_CONFIG.model) throw new Error(`existing posterior data uses ${report.model}, current=${LLM_CONFIG.model}`); return report.cases; }
function writeReport(report: PosteriorUpdateReport) { mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true }); const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json); }
function dryRun() { for (const kind of POSTERIOR_INTERFACES) console.log(`\n=== ${kind} ===\n${posteriorPrompt(kind, POSTERIOR_CASES[0]!)}`); console.log(`\n=== cases/orders ===\n${JSON.stringify(POSTERIOR_CASES.map((item) => ({ ...item, order: posteriorOrder(item.caseId), truth: posteriorTruth(item) })), null, 2)}`); }
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const cases = loadCases();
const done = new Set(cases.map((item) => item.caseId));
console.log(`resume ${cases.length}; posterior cases=${POSTERIOR_CASES.length}`);
for (const item of POSTERIOR_CASES) {
  if (done.has(item.caseId)) { console.log(`skip case=${item.caseId}`); continue; }
  const result = await runPosteriorCase(item.caseId);
  cases.push(result); done.add(item.caseId);
  const report = buildPosteriorUpdateReport(cases, LLM_CONFIG.model); writeReport(report);
  console.log(`done case=${item.caseId} prior=${item.prior.toFixed(2)} signal=${item.signalModel}/${item.observed}`);
}
const final = buildPosteriorUpdateReport(cases, LLM_CONFIG.model); writeReport(final);
console.log(`verdict ${final.verdict}`);
for (const kind of POSTERIOR_INTERFACES) { const summary = final.byInterface[kind]!; console.log(`${kind}: accuracy=${summary.accuracy02.toFixed(3)} mae=${summary.mae.toFixed(4)} direction=${summary.directionAccuracy.toFixed(3)} copy=${summary.priorCopyRate.toFixed(3)} pass=${summary.pass}`); }
