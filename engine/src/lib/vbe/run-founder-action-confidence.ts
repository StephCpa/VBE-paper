import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ACTION_CONFIDENCE_COSTS, ACTION_CONFIDENCE_DISTRIBUTIONS, ACTION_CONFIDENCE_INTERFACES, ACTION_MASKS, buildActionConfidenceReport, interfaceOrder, maskOrder, scalarCostOrder, scalarPrompt, vectorPrompt, type ActionConfidenceReport } from "./founder-action-confidence.ts";
import { runActionConfidenceBlock } from "./founder-action-confidence-execution.ts";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-action-confidence.json";
const PUBLIC_PATH = "public/data/founder-action-confidence.json";
function loadBlocks() {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ActionConfidenceReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing action-confidence data uses ${report.model}, current=${LLM_CONFIG.model}`);
  return report.blocks;
}
function writeReport(report: ActionConfidenceReport) {
  mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2); writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json);
}
function dryRun() {
  const distribution = ACTION_CONFIDENCE_DISTRIBUTIONS[0]!, mask = ACTION_MASKS[3]!;
  for (const kind of ACTION_CONFIDENCE_INTERFACES.filter((x) => x !== "compiled-scalar")) console.log(`\n=== ${kind} ===\n${vectorPrompt(kind, distribution, mask)}`);
  for (const cost of ACTION_CONFIDENCE_COSTS) console.log(`\n=== compiled-scalar cost ${cost} ===\n${scalarPrompt(distribution, mask, cost)}`);
  console.log(`\n=== frozen orders ===\n${JSON.stringify(ACTION_CONFIDENCE_DISTRIBUTIONS.map((_, i) => ({ block: i + 1, interfaces: interfaceOrder(i + 1), firstMasks: interfaceOrder(i + 1).map((__, p) => maskOrder(i + 1, p)[0]), firstScalarCosts: ACTION_MASKS.map((___, p) => scalarCostOrder(i + 1, p)[0]) })), null, 2)}`);
}
if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
const blocks = loadBlocks(); const done = new Set(blocks.map((b) => b.block));
console.log(`resume ${blocks.length}; action-confidence blocks=${ACTION_CONFIDENCE_DISTRIBUTIONS.length}`);
for (let block = 1; block <= ACTION_CONFIDENCE_DISTRIBUTIONS.length; block++) {
  if (done.has(block)) { console.log(`skip block=${block}`); continue; }
  const result = await runActionConfidenceBlock(block); blocks.push(result); done.add(block);
  const report = buildActionConfidenceReport(blocks, LLM_CONFIG.model); writeReport(report);
  console.log(`done block=${block} calls=${result.calls}`);
}
const final = buildActionConfidenceReport(blocks, LLM_CONFIG.model); writeReport(final);
console.log(`verdict ${final.verdict}`);
for (const kind of ACTION_CONFIDENCE_INTERFACES) { const s = final.byInterface[kind]!; console.log(`${kind}: accuracy=${s.accuracy02.toFixed(4)} mae=${s.mae.toFixed(4)} complement=${s.complementMae.toFixed(4)} pass=${s.pass}`); }
