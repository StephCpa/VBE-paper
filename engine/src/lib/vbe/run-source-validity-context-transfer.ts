import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hasChatApiKey, LLM_CONFIG } from "./llm.ts";
import {
  CXT_EXPECTED_BLOCKS,
  CXT_SOURCE_PATH,
  buildCxtContexts,
  buildCxtReport,
  cxtCorpusHash,
  type CxtRecord,
  type CxtReport,
  type CxtSourceRun,
} from "./source-validity-context-transfer.ts";
import { printCxtDryRun, runCxtBlock } from "./source-validity-context-transfer-execution.ts";

const DATA_PATH = "src/data/source-validity-context-transfer.json";
const PUBLIC_PATH = "public/data/source-validity-context-transfer.json";
const FREEZE_PATH = "src/data/source-validity-context-transfer-freeze.json";

type SourceReport = { runs: CxtSourceRun[] };
type Freeze = { sourceCorpusSha256: string };

function writeReport(report: CxtReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

const sourceReport = JSON.parse(readFileSync(CXT_SOURCE_PATH, "utf8")) as SourceReport;
const contexts = buildCxtContexts(sourceReport.runs);
const corpusHash = cxtCorpusHash();
const freeze = JSON.parse(readFileSync(FREEZE_PATH, "utf8")) as Freeze;
if (corpusHash !== freeze.sourceCorpusSha256) throw new Error(`source corpus hash mismatch: ${corpusHash}`);

if (process.argv.includes("--dry-run")) {
  printCxtDryRun(contexts);
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

let records: CxtRecord[] = [];
if (existsSync(DATA_PATH)) {
  const existing = JSON.parse(readFileSync(DATA_PATH, "utf8")) as CxtReport;
  if (existing.model !== LLM_CONFIG.model) throw new Error(`model mismatch ${existing.model}`);
  if (existing.sourceCorpus.sha256 !== corpusHash) throw new Error("existing result uses a different source corpus");
  records = existing.records;
}
const done = new Set(records.map((record) => record.block));
console.log(`resume records=${records.length}; CXT blocks=${CXT_EXPECTED_BLOCKS}`);
for (let block = 1; block <= CXT_EXPECTED_BLOCKS; block++) {
  if (done.has(block)) {
    console.log(`skip block=${block}`);
    continue;
  }
  const environment = contexts[block - 1]!;
  console.log(`CXT block=${block} seed=${environment.seed} phase=${environment.phase} round=${environment.selectedRound} history=${environment.fullPriorTrajectory.length}`);
  const blockRecords = await runCxtBlock(block, environment);
  records.push(...blockRecords);
  done.add(block);
  const report = buildCxtReport(records, LLM_CONFIG.model, corpusHash, freeze.sourceCorpusSha256, contexts);
  writeReport(report);
  console.log(`done block=${block} ${blockRecords.map((record) => `${record.arm}:${record.sell ? 1 : 0}`).join(" ")}`);
}
const final = buildCxtReport(records, LLM_CONFIG.model, corpusHash, freeze.sourceCorpusSha256, contexts);
writeReport(final);
console.log(`verdict ${final.verdict}`);
console.log(JSON.stringify({ byArm: final.byArm, contrasts: final.contrasts, contractAccuracy: final.contractAccuracy, gates: final.gates }));
