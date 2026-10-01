import { parseBuyerProposal } from "./buyer-capability.ts";
import {
  buyerTemporalHistoricalRecord,
  buyerTemporalOrder,
  buyerTemporalPrompt,
  loadBuyerTemporalCases,
  sha256BuyerTemporal,
  type BuyerTemporalArm,
  type BuyerTemporalRecord,
} from "./buyer-temporal-replay.ts";
import { observedChat } from "./observed-chat.ts";
import { RULES } from "./prompts.ts";

export async function runBuyerTemporalRecord(block: number, arm: BuyerTemporalArm): Promise<BuyerTemporalRecord> {
  const item = loadBuyerTemporalCases()[block - 1];
  if (!item) throw new Error(`invalid buyer-temporal block ${block}`);
  const position = buyerTemporalOrder(block).indexOf(arm) + 1;
  if (!position) throw new Error(`arm ${arm} missing from block ${block}`);
  const prompt = buyerTemporalPrompt(arm, item);
  const historical = buyerTemporalHistoricalRecord(arm, item);
  const response = await observedChat({ prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
  if (!response.ok || !response.observation) throw new Error(`buyer-temporal block=${block} arm=${arm}: ${response.error ?? "missing provider observation"}`);
  let proposal: ReturnType<typeof parseBuyerProposal>;
  try {
    proposal = parseBuyerProposal(response.text);
  } catch (error) {
    throw new Error(`buyer-temporal block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`);
  }
  return {
    block,
    arm,
    position,
    sourceStudy: arm === "historical-wrapper-narrow" ? "E-BUY-WRAP-D" : "E-BUY",
    sourceBlock: arm === "historical-wrapper-narrow" ? item.wrapperBlock : item.controlBlock,
    historicalPromptHash: historical.promptHash,
    promptHash: sha256BuyerTemporal(prompt),
    requestBodySha256: response.requestBodySha256,
    priorBuy: true,
    rawResponse: response.text,
    rawResponseSha256: sha256BuyerTemporal(response.text),
    proposal,
    buy: proposal.giveChits === 1,
    provider: response.observation,
  };
}

export function printBuyerTemporalDryRun(): void {
  const cases = loadBuyerTemporalCases();
  for (const item of cases) {
    for (const arm of buyerTemporalOrder(item.block)) {
      const prompt = buyerTemporalPrompt(arm, item);
      const historical = buyerTemporalHistoricalRecord(arm, item);
      console.log(`\n=== block=${item.block} arm=${arm} sourceBlock=${arm === "historical-wrapper-narrow" ? item.wrapperBlock : item.controlBlock} priorBuy=${Number(historical.buy)} historicalHash=${historical.promptHash} currentHash=${sha256BuyerTemporal(prompt)} ===\n${prompt}`);
    }
  }
}
