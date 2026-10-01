import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LLM_CONFIG, hasChatApiKey } from "./llm.ts";
import { runPeerConflictBlock } from "./peer-probability-conflict-execution.ts";
import {
  PEER_CONFLICT_ARMS,
  PEER_CONFLICT_CASES,
  buildPeerConflictReport,
  peerConflictOrder,
  peerConflictPrompt,
  type PeerConflictRecord,
  type PeerConflictReport,
} from "./peer-probability-conflict.ts";

const DATA_PATH = "src/data/peer-probability-conflict.json";
const PUBLIC_PATH = "public/data/peer-probability-conflict.json";

function loadRecords(): PeerConflictRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as PeerConflictReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing peer-conflict data uses ${report.model}, current=${LLM_CONFIG.model}`);
  return report.records;
}
function writeReport(records: PeerConflictRecord[]): void {
  mkdirSync("src/data", { recursive: true }); mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(buildPeerConflictReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, json); writeFileSync(PUBLIC_PATH, json);
}
function dryRun(): void {
  const item = PEER_CONFLICT_CASES.find((candidate) => candidate.highProbability === 0.9 && candidate.lowProbability === 0.1)!;
  for (const arm of PEER_CONFLICT_ARMS) console.log(`\n=== ${arm} ===\n${peerConflictPrompt(arm, item)}`);
  console.log(`\n=== order balance ===\n${JSON.stringify(PEER_CONFLICT_CASES.map((candidate) => ({ block: candidate.block, low: candidate.lowProbability, high: candidate.highProbability, order: peerConflictOrder(candidate.block) })), null, 2)}`);
}

if (process.argv.includes("--dry-run")) { dryRun(); process.exit(0); }
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);

const records = loadRecords();
const complete = new Set(PEER_CONFLICT_CASES.filter((item) => PEER_CONFLICT_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).map((item) => item.block));
const partial = PEER_CONFLICT_CASES.filter((item) => !complete.has(item.block) && records.some((record) => record.block === item.block));
if (partial.length) throw new Error(`partial block present; preserve records and disclose amendment before resuming: ${partial.map((item) => item.block).join(",")}`);
console.log(`resume ${records.length}; peer-conflict blocks=${PEER_CONFLICT_CASES.length}`);
for (const item of PEER_CONFLICT_CASES) {
  if (complete.has(item.block)) { console.log(`skip block=${item.block}`); continue; }
  const blockRecords = await runPeerConflictBlock(item.block);
  records.push(...blockRecords); complete.add(item.block); writeReport(records);
  console.log(`done block=${item.block} low=${item.lowProbability.toFixed(2)} high=${item.highProbability.toFixed(2)}`);
}
const final = buildPeerConflictReport(records, LLM_CONFIG.model); writeReport(records);
console.log(`verdict ${final.verdict}`);
for (const arm of PEER_CONFLICT_ARMS) { const summary = final.byArm[arm]!; console.log(`${arm}: sell=${summary.sellRate.toFixed(3)} reject=${summary.rejectRate.toFixed(3)}`); }
console.log(`agreements high=${final.agreement.contradictedWithHighControl?.toFixed(3)} history=${final.agreement.contradictedWithHistory?.toFixed(3)}`);
