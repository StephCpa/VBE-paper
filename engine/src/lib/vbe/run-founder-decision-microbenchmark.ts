import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  MICRO_BLOCKS,
  MICRO_CELLS,
  arithmeticOrder,
  buildMicroReport,
  decisionOrder,
  isArithmeticCorrect,
  microArithmeticPrompt,
  microDecisionPrompt,
  parseMicroArithmetic,
  parseMicroDecision,
  type MicroRecord,
  type MicroReport,
} from "./founder-decision-microbenchmark.ts";
import { LLM_CONFIG, grokChat, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-decision-microbenchmark.json";
const PUBLIC_PATH = "public/data/founder-decision-microbenchmark.json";
const SYSTEM = "Follow the stated payoff rules exactly. Return only the requested JSON object with no markdown.";
const ARITHMETIC_SYSTEM = "Return exactly one requested JSON object. Do not show reasoning, scratch work, or markdown.";

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function loadRecords(): MicroRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as MicroReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing microbenchmark uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.blocks) !== JSON.stringify(MICRO_BLOCKS) || JSON.stringify(report.cells) !== JSON.stringify(MICRO_CELLS)) throw new Error("existing microbenchmark does not match frozen design");
  return report.records;
}

function writeReport(records: MicroRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(buildMicroReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun(): void {
  const cells = [MICRO_CELLS[0]!, MICRO_CELLS[5]!, MICRO_CELLS[18]!];
  for (const cell of cells) {
    console.log(`\n=== DECISION ${cell.id} ===\n${microDecisionPrompt(cell, 1)}`);
    console.log(`\n=== ARITHMETIC ${cell.id} ===\n${microArithmeticPrompt(cell, 1)}`);
  }
}

if (process.argv.includes("--dry-run")) {
  printDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);

const records = loadRecords();
const recordMap = new Map(records.map((r) => [`${r.block}|${r.cellId}`, r]));

console.log(`resume records=${records.length}; phase=decisions; jobs=${MICRO_BLOCKS.length * MICRO_CELLS.length}`);
for (const block of MICRO_BLOCKS) {
  const order = decisionOrder(block);
  for (let position = 0; position < order.length; position++) {
    const cell = order[position]!;
    const key = `${block}|${cell.id}`;
    let record = recordMap.get(key);
    if (record?.decision) continue;
    const prompt = microDecisionPrompt(cell, block);
    const result = await grokChat({ prompt, maxTokens: 96, temperature: 0, json: true, system: SYSTEM });
    if (!result.ok) throw new Error(`decision API failure ${key}: ${result.error}`);
    const decision = parseMicroDecision(result.text);
    if (!record) {
      record = {
        block,
        cellId: cell.id,
        mode: cell.mode,
        role: cell.role,
        score: cell.score,
        decisionPosition: position + 1,
        arithmeticPosition: arithmeticOrder(block).findIndex((c) => c.id === cell.id) + 1,
        promptHash: hash(prompt),
      };
      records.push(record);
      recordMap.set(key, record);
    }
    record.decision = decision;
    writeReport(records);
    console.log(`decision ${key} position=${position + 1} publish=${decision.publish}`);
  }
}

const decisionComplete = records.filter((r) => r.decision).length;
if (decisionComplete !== MICRO_BLOCKS.length * MICRO_CELLS.length) throw new Error(`decision phase incomplete: ${decisionComplete}`);

console.log(`phase=sealed-arithmetic; jobs=${MICRO_BLOCKS.length * MICRO_CELLS.length}`);
for (const block of MICRO_BLOCKS) {
  const order = arithmeticOrder(block);
  for (let position = 0; position < order.length; position++) {
    const cell = order[position]!;
    const key = `${block}|${cell.id}`;
    const record = recordMap.get(key)!;
    if (record.arithmetic) continue;
    const prompt = microArithmeticPrompt(cell, block);
    const result = await grokChat({ prompt, maxTokens: 256, temperature: 0, json: true, system: ARITHMETIC_SYSTEM });
    if (!result.ok) throw new Error(`arithmetic API failure ${key}: ${result.error}`);
    const arithmetic = parseMicroArithmetic(result.text);
    record.arithmetic = arithmetic;
    record.arithmeticCorrect = isArithmeticCorrect(cell.mode, arithmetic);
    writeReport(records);
    console.log(`arithmetic ${key} position=${position + 1} correct=${record.arithmeticCorrect}`);
  }
}

const final = buildMicroReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(`calls decision=${final.decisionCalls} arithmetic=${final.arithmeticCalls}`);
console.log(`core=${final.corePublicationRate?.toFixed(3)} minimum-cell=${final.guardrails.minimumCellRate?.toFixed(3)} arithmetic=${final.arithmeticAccuracy?.toFixed(3)}`);
for (const [factor, effect] of Object.entries(final.factorEffects)) console.log(`${factor}=${effect.mean.toFixed(3)} p=${effect.exactUpperP?.toFixed(6)} triggers=${effect.triggers}`);
