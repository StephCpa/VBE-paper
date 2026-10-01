import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BUYER_TEMPORAL_ARMS,
  buildBuyerTemporalReport,
  buyerTemporalOrder,
  loadBuyerTemporalCases,
  type BuyerTemporalRecord,
  type BuyerTemporalReport,
} from "./buyer-temporal-replay.ts";
import { printBuyerTemporalDryRun, runBuyerTemporalRecord } from "./buyer-temporal-replay-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/buyer-temporal-replay.json";
const PUBLIC_PATH = "public/data/buyer-temporal-replay.json";
const FREEZE_PATH = "src/data/buyer-temporal-replay-freeze.json";

type FreezeManifest = {
  model: string;
  files: Record<string, { path: string; sha256: string }>;
};

function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

function validateFreeze(checkModel: boolean): void {
  const freeze = JSON.parse(readFileSync(FREEZE_PATH, "utf8")) as FreezeManifest;
  if (checkModel && freeze.model !== LLM_CONFIG.model) throw new Error(`freeze model mismatch ${freeze.model} != ${LLM_CONFIG.model}`);
  for (const [name, entry] of Object.entries(freeze.files)) {
    const actual = fileSha256(entry.path);
    if (actual !== entry.sha256) throw new Error(`freeze hash mismatch ${name}: ${actual} != ${entry.sha256}`);
  }
}

function loadRecords(): BuyerTemporalRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerTemporalReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerTemporalRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const value = JSON.stringify(buildBuyerTemporalReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, value);
  writeFileSync(PUBLIC_PATH, value);
}

const dryRun = process.argv.includes("--dry-run");
validateFreeze(!dryRun);
if (dryRun) {
  printBuyerTemporalDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const cases = loadBuyerTemporalCases();
const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-temporal jobs=${cases.length * BUYER_TEMPORAL_ARMS.length}`);
for (const item of cases) {
  for (const arm of buyerTemporalOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerTemporalRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)} responseId=${record.provider.responseId ?? "unavailable"}`);
  }
}
const final = buildBuyerTemporalReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, responseShape: final.responseShape, gates: final.gates, integrity: final.integrity }, null, 2));
