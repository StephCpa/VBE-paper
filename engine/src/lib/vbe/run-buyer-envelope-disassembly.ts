import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  BUYER_ENVELOPE_ARMS,
  buildBuyerEnvelopeReport,
  buyerEnvelopeOrder,
  loadBuyerEnvelopeCases,
  type BuyerEnvelopeRecord,
  type BuyerEnvelopeReport,
} from "./buyer-envelope-disassembly.ts";
import { printBuyerEnvelopeDryRun, runBuyerEnvelopeRecord } from "./buyer-envelope-disassembly-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/buyer-envelope-disassembly.json";
const PUBLIC_PATH = "public/data/buyer-envelope-disassembly.json";

function loadRecords(): BuyerEnvelopeRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerEnvelopeReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerEnvelopeRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const value = JSON.stringify(buildBuyerEnvelopeReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, value);
  writeFileSync(PUBLIC_PATH, value);
}

if (process.argv.includes("--dry-run")) {
  printBuyerEnvelopeDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const cases = loadBuyerEnvelopeCases();
const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-envelope jobs=${cases.length * BUYER_ENVELOPE_ARMS.length}`);
for (const item of cases) {
  for (const arm of buyerEnvelopeOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerEnvelopeRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)}`);
  }
}
const final = buildBuyerEnvelopeReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, gates: final.gates, integrity: final.integrity }, null, 2));
