import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import {
  BUYER_CAPABILITY_ARMS,
  BUYER_CAPABILITY_CASES,
  buildBuyerCapabilityReport,
  buyerCapabilityOrder,
  type BuyerCapabilityRecord,
  type BuyerCapabilityReport,
} from "./buyer-capability.ts";
import { printBuyerCapabilityDryRun, runBuyerCapabilityRecord } from "./buyer-capability-execution.ts";

const DATA_PATH = "src/data/buyer-capability.json";
const PUBLIC_PATH = "public/data/buyer-capability.json";

function loadRecords(): BuyerCapabilityRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerCapabilityReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerCapabilityRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(buildBuyerCapabilityReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

if (process.argv.includes("--dry-run")) {
  printBuyerCapabilityDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-capability jobs=${BUYER_CAPABILITY_CASES.length * BUYER_CAPABILITY_ARMS.length}`);
for (const item of BUYER_CAPABILITY_CASES) {
  for (const arm of buyerCapabilityOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerCapabilityRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)}`);
  }
}
const final = buildBuyerCapabilityReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, gates: final.gates, integrity: final.integrity }, null, 2));
