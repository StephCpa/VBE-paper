import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  buyerWrapperCaseHash,
  buyerWrapperOrder,
  buyerWrapperPrompt,
  loadBuyerWrapperCases,
  sha256BuyerWrapper,
  type BuyerWrapperArm,
  type BuyerWrapperRecord,
} from "./buyer-wrapper-disassembly.ts";
import { grokChat } from "./llm.ts";
import { RULES } from "./prompts.ts";

export async function runBuyerWrapperRecord(block: number, arm: BuyerWrapperArm): Promise<BuyerWrapperRecord> {
  const item = loadBuyerWrapperCases()[block - 1];
  if (!item) throw new Error(`invalid buyer-wrapper block ${block}`);
  const position = buyerWrapperOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerWrapperPrompt(arm, item);
  const response = await grokChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok) throw new Error(`buyer-wrapper block=${block} arm=${arm}: ${response.error}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try {
    proposal = parseBuyerProposal(response.text);
  } catch (error) {
    throw new Error(`buyer-wrapper block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`);
  }
  return {
    block,
    seed: item.seed,
    phase: item.phase,
    arm,
    position,
    contextHash: buyerWrapperCaseHash(item),
    promptHash: sha256BuyerWrapper(prompt),
    sourceBuy: item.sourceBuy,
    proposal,
    buy: proposal.giveChits === 1,
  };
}

export function printBuyerWrapperDryRun(): void {
  const cases = loadBuyerWrapperCases();
  for (const block of [1, cases.length]) {
    const item = cases[block - 1]!;
    console.log(`\n=== block=${block} seed=${item.seed} phase=${item.phase} round=${item.selectedRound} hard=${item.hardId} easy=${item.easyId} ===`);
    for (const arm of buyerWrapperOrder(block)) console.log(`\n--- ${arm} ---\n${buyerWrapperPrompt(arm, item)}`);
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
    order: buyerWrapperOrder(item.block),
  })), null, 2)}`);
}
