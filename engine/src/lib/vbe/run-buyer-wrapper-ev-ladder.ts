import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BUYER_EV_ARMS,
  buildBuyerEvReport,
  buyerEvOrder,
  loadBuyerEvCases,
  type BuyerEvRecord,
  type BuyerEvReport,
} from "./buyer-wrapper-ev-ladder.ts";
import { printBuyerEvDryRun, runBuyerEvRecord } from "./buyer-wrapper-ev-ladder-execution.ts";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";

const DATA_PATH = "src/data/buyer-wrapper-ev-ladder.json";
const PUBLIC_PATH = "public/data/buyer-wrapper-ev-ladder.json";
const FREEZE_PATH = "src/data/buyer-wrapper-ev-ladder-freeze.json";

type FreezeManifest = {
  model: string;
  sourceCorpus: { path: string; sha256: string };
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
  const sourceActual = fileSha256(freeze.sourceCorpus.path);
  if (sourceActual !== freeze.sourceCorpus.sha256) throw new Error(`freeze source hash mismatch ${sourceActual} != ${freeze.sourceCorpus.sha256}`);
}

function loadRecords(): BuyerEvRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as BuyerEvReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${report.model}`);
  return report.records;
}

function writeReport(records: BuyerEvRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const value = JSON.stringify(buildBuyerEvReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, value);
  writeFileSync(PUBLIC_PATH, value);
}

const dryRun = process.argv.includes("--dry-run");
validateFreeze(!dryRun);

if (dryRun) {
  printBuyerEvDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const cases = loadBuyerEvCases();
const records = loadRecords();
const done = new Set(records.map((record) => `${record.block}|${record.arm}`));
console.log(`resume ${records.length}; buyer-EV jobs=${cases.length * BUYER_EV_ARMS.length}`);
for (const item of cases) {
  for (const arm of buyerEvOrder(item.block)) {
    const key = `${item.block}|${arm}`;
    if (done.has(key)) continue;
    const record = await runBuyerEvRecord(item.block, arm);
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} buy=${Number(record.buy)}`);
  }
}
const final = buildBuyerEvReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`linkStatus ${final.linkStatus}`);
console.log(`stepStatus ${JSON.stringify(final.stepStatus)}`);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, gates: final.gates, integrity: final.integrity }, null, 2));
