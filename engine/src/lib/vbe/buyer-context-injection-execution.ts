import { grokChat } from "./llm.ts";
import { RULES } from "./prompts.ts";
import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  buyerContextCaseHash,
  buyerContextOrder,
  buyerContextPrompt,
  loadBuyerContextCases,
  sha256BuyerContext,
  type BuyerContextArm,
  type BuyerContextRecord,
} from "./buyer-context-injection.ts";

export async function runBuyerContextRecord(block: number, arm: BuyerContextArm): Promise<BuyerContextRecord> {
  const item = loadBuyerContextCases()[block - 1];
  if (!item) throw new Error(`invalid buyer-context block ${block}`);
  const position = buyerContextOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerContextPrompt(arm, item);
  const response = await grokChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok) throw new Error(`buyer-context block=${block} arm=${arm}: ${response.error}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try { proposal = parseBuyerProposal(response.text); }
  catch (error) { throw new Error(`buyer-context block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
  return {
    block,
    seed: item.seed,
    phase: item.phase,
    arm,
    position,
    contextHash: buyerContextCaseHash(item),
    promptHash: sha256BuyerContext(prompt),
    sourceBuy: item.sourceBuy,
    proposal,
    buy: proposal.giveChits === 1,
  };
}

export function printBuyerContextDryRun(): void {
  const cases = loadBuyerContextCases();
  for (const block of [1, cases.length]) {
    const item = cases[block - 1]!;
    console.log(`\n=== block=${block} seed=${item.seed} phase=${item.phase} round=${item.selectedRound} hard=${item.hardId} easy=${item.easyId} ===`);
    for (const arm of buyerContextOrder(block)) console.log(`\n--- ${arm} ---\n${buyerContextPrompt(arm, item)}`);
  }
  console.log(`\n=== frozen cases and orders ===\n${JSON.stringify(cases.map((item) => ({
    block: item.block,
    seed: item.seed,
    phase: item.phase,
    selectedRound: item.selectedRound,
    hardId: item.hardId,
    easyId: item.easyId,
    hardMarks: item.agent.chits,
    hardScore: item.agent.score,
    memoryLength: item.agent.memory.length,
    sourceBuy: item.sourceBuy,
    order: buyerContextOrder(item.block),
  })), null, 2)}`);
}
