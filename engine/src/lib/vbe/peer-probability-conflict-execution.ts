import { grokChat } from "./llm.ts";
import {
  PEER_CONFLICT_CASES,
  peerConflictContext,
  peerConflictOrder,
  peerConflictPrompt,
  parsePeerConflict,
  sha256PeerConflict,
  type PeerConflictRecord,
} from "./peer-probability-conflict.ts";

const SYSTEM = "Maximize expected score in the one-shot decision. Treat PRESENT and PASS evidence as supplied, and WITHHELD fields as absent rather than negative. Return exactly one JSON object with one boolean key named sell.";

export async function runPeerConflictBlock(block: number): Promise<PeerConflictRecord[]> {
  const item = PEER_CONFLICT_CASES[block - 1];
  if (!item) throw new Error(`invalid peer-conflict block ${block}`);
  const records: PeerConflictRecord[] = [];
  const order = peerConflictOrder(block);
  for (let position = 0; position < order.length; position++) {
    const arm = order[position]!;
    const prompt = peerConflictPrompt(arm, item);
    const response = await grokChat({ prompt, system: SYSTEM, maxTokens: 48, temperature: 0, json: true });
    if (!response.ok) throw new Error(`peer-conflict block=${block} arm=${arm}: ${response.error}`);
    let sell: boolean;
    try { sell = parsePeerConflict(response.text); }
    catch (error) { throw new Error(`peer-conflict block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
    records.push({ block, arm, position: position + 1, promptHash: sha256PeerConflict(prompt), context: peerConflictContext(arm, item), sell });
  }
  return records;
}
