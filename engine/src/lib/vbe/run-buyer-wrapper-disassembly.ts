import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  BUYER_WRAPPER_ARMS,
  buildBuyerWrapperReport,
  buyerWrapperOrder,
  loadBuyerWrapperCases,
  type BuyerWrapperRecord,
  type BuyerWrapperReport,
} from "./buyer-wrapper-disassembly.ts";
import { printBuyerWrapperDryRun, runBuyerWrapperRecord } from "./buyer-wrapper-disassembly-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/buyer-wrapper-disassembly.json";
const PUBLIC_PATH = "public/data/buyer-wrapper-disassembly.json";

function loadRecords(): BuyerWrapperRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerWrapperReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerWrapperRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const value = JSON.stringify(buildBuyerWrapperReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, value);
  writeFileSync(PUBLIC_PATH, value);
}

if (process.argv.includes("--dry-run")) {
  printBuyerWrapperDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const cases = loadBuyerWrapperCases();
const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-wrapper jobs=${cases.length * BUYER_WRAPPER_ARMS.length}`);
for (const item of cases) {
  for (const arm of buyerWrapperOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerWrapperRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)}`);
  }
}
const final = buildBuyerWrapperReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, gates: final.gates, integrity: final.integrity }, null, 2));
