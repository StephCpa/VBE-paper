import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  buyerEnvelopeCaseHash,
  buyerEnvelopeOrder,
  buyerEnvelopePrompt,
  loadBuyerEnvelopeCases,
  sha256BuyerEnvelope,
  type BuyerEnvelopeArm,
  type BuyerEnvelopeRecord,
} from "./buyer-envelope-disassembly.ts";
import { grokChat } from "./llm.ts";
import { RULES } from "./prompts.ts";

export async function runBuyerEnvelopeRecord(block: number, arm: BuyerEnvelopeArm): Promise<BuyerEnvelopeRecord> {
  const item = loadBuyerEnvelopeCases()[block - 1];
  if (!item) throw new Error(`invalid buyer-envelope block ${block}`);
  const position = buyerEnvelopeOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerEnvelopePrompt(arm, item);
  const response = await grokChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok) throw new Error(`buyer-envelope block=${block} arm=${arm}: ${response.error}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try { proposal = parseBuyerProposal(response.text); }
  catch (error) { throw new Error(`buyer-envelope block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
  return {
    block,
    seed: item.seed,
    phase: item.phase,
    arm,
    position,
    contextHash: buyerEnvelopeCaseHash(item),
    promptHash: sha256BuyerEnvelope(prompt),
    sourceBuy: item.sourceBuy,
    proposal,
    buy: proposal.giveChits === 1,
  };
}

export function printBuyerEnvelopeDryRun(): void {
  const cases = loadBuyerEnvelopeCases();
  for (const block of [1, cases.length]) {
    const item = cases[block - 1]!;
    console.log(`\n=== block=${block} seed=${item.seed} phase=${item.phase} round=${item.selectedRound} hard=${item.hardId} easy=${item.easyId} ===`);
    for (const arm of buyerEnvelopeOrder(block)) console.log(`\n--- ${arm} ---\n${buyerEnvelopePrompt(arm, item)}`);
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
    order: buyerEnvelopeOrder(item.block),
  })), null, 2)}`);
}
