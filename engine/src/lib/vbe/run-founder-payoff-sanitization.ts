import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  SANITIZATION_BLOCKS,
  SANITIZATION_CELLS,
  buildSanitizationReport,
  correctSanitizationDecision,
  parseSanitizationDecision,
  sanitizationOrder,
  sanitizationPrompt,
  type SanitizationRecord,
  type SanitizationReport,
} from "./founder-payoff-sanitization.ts";
import { LLM_CONFIG, grokChat, hasChatApiKey } from "./llm.ts";

const DATA_PATH = "src/data/founder-payoff-sanitization.json";
const PUBLIC_PATH = "public/data/founder-payoff-sanitization.json";
const SYSTEM = "Use only payoff information present in the current context. Respect validation and quarantine boundaries. Maximize expected final score. Return only the requested JSON object with no analysis or markdown.";

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function loadRecords(): SanitizationRecord[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SanitizationReport;
  if (report.model !== LLM_CONFIG.model) throw new Error(`existing sanitizer data uses ${report.model}, current=${LLM_CONFIG.model}`);
  if (JSON.stringify(report.blocks) !== JSON.stringify(SANITIZATION_BLOCKS) || JSON.stringify(report.cells) !== JSON.stringify(SANITIZATION_CELLS)) throw new Error("existing sanitizer data does not match frozen design");
  return report.records;
}

function writeReport(records: SanitizationRecord[]): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(buildSanitizationReport(records, LLM_CONFIG.model), null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function printDryRun(): void {
  for (const representation of ["inline-rejected", "redacted-rejected", "sanitized-canonical", "sanitized-recommendation"] as const) {
    const cell = SANITIZATION_CELLS.find((c) => c.state === "Hard-0" && c.scenario === "positive" && c.representation === representation)!;
    console.log(`\n=== ${cell.id} ===\n${sanitizationPrompt(cell, 1)}`);
  }
}

if (process.argv.includes("--dry-run")) {
  printDryRun();
  process.exit(0);
}
if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);

const records = loadRecords();
const done = new Set(records.map((r) => `${r.block}|${r.cellId}`));
console.log(`resume ${records.length}; blocks=${SANITIZATION_BLOCKS.length}; jobs=${SANITIZATION_BLOCKS.length * SANITIZATION_CELLS.length}`);
for (const block of SANITIZATION_BLOCKS) {
  const order = sanitizationOrder(block);
  for (let position = 0; position < order.length; position++) {
    const cell = order[position]!;
    const key = `${block}|${cell.id}`;
    if (done.has(key)) continue;
    const prompt = sanitizationPrompt(cell, block);
    const response = await grokChat({ prompt, maxTokens: 1024, temperature: 0, json: true, system: SYSTEM });
    if (!response.ok) throw new Error(`sanitizer API failure ${key}: ${response.error}`);
    const decision = parseSanitizationDecision(response.text);
    const record: SanitizationRecord = {
      block,
      cellId: cell.id,
      state: cell.state,
      scenario: cell.scenario,
      representation: cell.representation,
      position: position + 1,
      promptHash: hash(prompt),
      decision,
      correct: correctSanitizationDecision(cell.scenario, decision),
    };
    records.push(record);
    done.add(key);
    writeReport(records);
    console.log(`done ${key} position=${position + 1} publish=${decision.publish} correct=${record.correct}`);
  }
}

const final = buildSanitizationReport(records, LLM_CONFIG.model);
writeReport(records);
console.log(`verdict ${final.verdict}`);
console.log(`blocks ${final.completeBlocks}/${final.blocks.length}; calls=${final.calls}`);
console.log(`positive-redaction=${final.effects.positiveRedactionRescue?.mean.toFixed(3)} p=${final.effects.positiveRedactionRescue?.exactUpperP?.toFixed(8)} pass=${final.effects.positiveRedactionRescue?.passes}`);
console.log(`guards redacted=${final.guardrails.redactedOverall?.toFixed(3)} positive=${final.guardrails.redactedPositive?.toFixed(3)} canonical=${final.guardrails.canonicalOverall?.toFixed(3)} pass=${final.guardrails.pass}`);
console.log(`gate interventions=${final.actionGate.interventions}/${final.calls}`);
