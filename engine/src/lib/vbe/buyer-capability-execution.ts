import { grokChat } from "./llm.ts";
import { RULES } from "./prompts.ts";
import {
  BUYER_CAPABILITY_CASES,
  buyerCapabilityContext,
  buyerCapabilityOrder,
  parseBuyerProposal,
  buyerCapabilityPrompt,
  sha256BuyerPrompt,
  type BuyerCapabilityArm,
  type BuyerCapabilityRecord,
} from "./buyer-capability.ts";

export async function runBuyerCapabilityRecord(block: number, arm: BuyerCapabilityArm): Promise<BuyerCapabilityRecord> {
  const item = BUYER_CAPABILITY_CASES[block - 1];
  if (!item) throw new Error(`invalid buyer-capability block ${block}`);
  const position = buyerCapabilityOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerCapabilityPrompt(arm, item);
  const response = await grokChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok) throw new Error(`buyer-capability block=${block} arm=${arm}: ${response.error}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try { proposal = parseBuyerProposal(response.text); }
  catch (error) { throw new Error(`buyer-capability block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
  return {
    block,
    arm,
    position,
    promptHash: sha256BuyerPrompt(prompt),
    context: buyerCapabilityContext(arm, item),
    proposal,
    buy: proposal.giveChits === 1,
  };
}

export function printBuyerCapabilityDryRun(): void {
  const item = BUYER_CAPABILITY_CASES.find((candidate) => candidate.agentId === 5 && candidate.score === 6 && candidate.history === "TWO_PRIOR_NO_TRADES")!;
  for (const arm of buyerCapabilityOrder(item.block)) console.log(`\n=== block=${item.block} ${arm} ===\n${buyerCapabilityPrompt(arm, item)}`);
  console.log(`\n=== frozen orders ===\n${JSON.stringify(BUYER_CAPABILITY_CASES.map((candidate) => ({ block: candidate.block, agentId: candidate.agentId, score: candidate.score, history: candidate.history, order: buyerCapabilityOrder(candidate.block) })), null, 2)}`);
}
