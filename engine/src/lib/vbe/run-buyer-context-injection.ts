import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import {
  BUYER_CONTEXT_ARMS,
  buildBuyerContextReport,
  buyerContextOrder,
  loadBuyerContextCases,
  type BuyerContextRecord,
  type BuyerContextReport,
} from "./buyer-context-injection.ts";
import { printBuyerContextDryRun, runBuyerContextRecord } from "./buyer-context-injection-execution.ts";

const DATA_PATH = "src/data/buyer-context-injection.json";
const PUBLIC_PATH = "public/data/buyer-context-injection.json";

function loadRecords(): BuyerContextRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerContextReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerContextRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const value = JSON.stringify(buildBuyerContextReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, value);
  writeFileSync(PUBLIC_PATH, value);
}

if (process.argv.includes("--dry-run")) {
  printBuyerContextDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const cases = loadBuyerContextCases();
const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-context jobs=${cases.length * BUYER_CONTEXT_ARMS.length}`);
for (const item of cases) {
  for (const arm of buyerContextOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerContextRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)}`);
  }
}
const final = buildBuyerContextReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, gates: final.gates, integrity: final.integrity }, null, 2));
