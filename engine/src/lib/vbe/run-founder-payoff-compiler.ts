import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  COMPILER_BLOCKS,
  COMPILER_CELLS,
  buildCompilerReport,
  compilerOrder,
  compilerPrompt,
  correctCompilerDecision,
  parseCompilerDecision,
  type CompilerRecord,
  type CompilerReport,
} from "./founder-payoff-compiler.ts";
import { LLM_CONFIG, grokChat, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-payoff-compiler.json";
const PUBLIC_PATH = "public/data/founder-payoff-compiler.json";
const SYSTEM = "Use the authoritative table and any checker result exactly as stated. Maximize expected final score. Return only the requested JSON object with no analysis or markdown.";

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function loadRecords(): CompilerRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as CompilerReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing compiler data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.blocks) !== JSON.stringify(COMPILER_BLOCKS) || JSON.stringify(report.cells) !== JSON.stringify(COMPILER_CELLS)) throw new Error("existing compiler data does not match frozen design");
  return report.records;
}

function writeReport(records: CompilerRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(buildCompilerReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun(): void {
  for (const cell of [COMPILER_CELLS[0]!, COMPILER_CELLS[7]!, COMPILER_CELLS[14]!, COMPILER_CELLS[19]!]) {
    console.log(`\n=== ${cell.id} ===\n${compilerPrompt(cell, 1)}`);
  }
}

if (process.argv.includes("--dry-run")) {
  printDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);

const records = loadRecords();
const done = new Set(records.map((r) => `${r.block}|${r.cellId}`));
console.log(`resume ${records.length}; blocks=${COMPILER_BLOCKS.length}; jobs=${COMPILER_BLOCKS.length * COMPILER_CELLS.length}`);
for (const block of COMPILER_BLOCKS) {
  const order = compilerOrder(block);
  for (let position = 0; position < order.length; position++) {
    const cell = order[position]!;
    const key = `${block}|${cell.id}`;
    if (done.has(key)) continue;
    const prompt = compilerPrompt(cell, block);
    const response = await grokChat({ prompt, maxTokens: 1024, temperature: 0, json: true, system: SYSTEM });
    if (!response.ok) throw new Error(`compiler API failure ${key}: ${response.error}`);
    const decision = parseCompilerDecision(response.text);
    const record: CompilerRecord = {
      block,
      cellId: cell.id,
      state: cell.state,
      scenario: cell.scenario,
      representation: cell.representation,
      position: position + 1,
      promptHash: hash(prompt),
      decision,
      correct: correctCompilerDecision(cell.scenario, decision),
    };
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} position=${position + 1} publish=${decision.publish} correct=${record.correct}`);
  }
}

const final = buildCompilerReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(`blocks ${final.completeBlocks}/${final.blocks.length}; calls=${final.calls}`);
console.log(`rescue=${final.effects.compilerRescue?.mean.toFixed(3)} p=${final.effects.compilerRescue?.exactUpperP?.toFixed(6)} pass=${final.effects.compilerRescue?.passes}`);
console.log(`recovery=${final.effects.verificationRecovery?.mean.toFixed(3)} p=${final.effects.verificationRecovery?.exactUpperP?.toFixed(6)} pass=${final.effects.verificationRecovery?.passes}`);
console.log(`guards verified=${final.guardrails.verifiedCorrectAccuracy?.toFixed(3)} rejected=${final.guardrails.rejectedFalseAccuracy?.toFixed(3)} pass=${final.guardrails.pass}`);
