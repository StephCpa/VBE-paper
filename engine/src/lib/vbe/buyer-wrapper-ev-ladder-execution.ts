import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  buyerEvCaseHash,
  buyerEvOrder,
  buyerEvPrompt,
  loadBuyerEvCases,
  sha256BuyerEv,
  type BuyerEvArm,
  type BuyerEvRecord,
} from "./buyer-wrapper-ev-ladder.ts";
import { grokChat } from "./llm.ts";
import { RULES } from "./prompts.ts";

export async function runBuyerEvRecord(block: number, arm: BuyerEvArm): Promise<BuyerEvRecord> {
  const item = loadBuyerEvCases()[block - 1];
  if (!item) throw new Error(`invalid buyer-EV block ${block}`);
  const position = buyerEvOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerEvPrompt(arm, item);
  const response = await grokChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok) throw new Error(`buyer-EV block=${block} arm=${arm}: ${response.error}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try {
    proposal = parseBuyerProposal(response.text);
  } catch (error) {
    throw new Error(`buyer-EV block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`);
  }
  return {
    block,
    seed: item.seed,
    phase: item.phase,
    arm,
    position,
    contextHash: buyerEvCaseHash(item),
    promptHash: sha256BuyerEv(prompt),
    sourceBuy: item.sourceBuy,
    proposal,
    buy: proposal.giveChits === 1,
  };
}

export function printBuyerEvDryRun(): void {
  const cases = loadBuyerEvCases();
  for (const block of [1, cases.length]) {
    const item = cases[block - 1]!;
    console.log(`\n=== block=${block} seed=${item.seed} phase=${item.phase} round=${item.selectedRound} hard=${item.hardId} easy=${item.easyId} ===`);
    for (const arm of buyerEvOrder(block)) console.log(`\n--- ${arm} ---\n${buyerEvPrompt(arm, item)}`);
  }
  console.log(`\n=== candidate cases and frozen orders ===\n${JSON.stringify(cases.map((item) => ({
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
    order: buyerEvOrder(item.block),
  })), null, 2)}`);
}
