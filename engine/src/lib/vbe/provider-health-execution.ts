import {
  providerHealthAnchors,
  parseProviderHealthProposal,
  sha256ProviderHealth,
  type ProviderHealthPhase,
  type ProviderHealthRecord,
} from "./provider-health.ts";
import { LLM_CONFIG } from "./llm.ts";
import { observedChat } from "./observed-chat.ts";
import { RULES } from "./prompts.ts";

export async function fetchProviderModelCatalog(): Promise<string[]> {
  if (LLM_CONFIG.provider !== "deepseek") throw new Error("provider-health v1.1 supports the DeepSeek endpoint only");
  const apiKey = process.env[LLM_CONFIG.apiKeyEnv];
  if (!apiKey) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);
  const response = await fetch(new URL("/models", LLM_CONFIG.url), { headers: { Authorization: `Bearer ${apiKey}` } });
  const raw = await response.text();
  if (!response.ok) throw new Error(`model catalog ${response.status}: ${raw.slice(0, 180)}`);
  const json = JSON.parse(raw) as { data?: Array<{ id?: unknown }> };
  const models = (json.data ?? []).map((entry) => entry.id).filter((id): id is string => typeof id === "string").sort();
  if (!models.length) throw new Error("empty provider model catalog");
  return models;
}

export async function runProviderHealthRecords(phase: ProviderHealthPhase): Promise<ProviderHealthRecord[]> {
  const records: ProviderHealthRecord[] = [];
  for (const [index, anchor] of providerHealthAnchors().entries()) {
    const response = await observedChat({ prompt: anchor.prompt, system: RULES, maxTokens: 64, temperature: 0, json: true });
    if (!response.ok || !response.observation) throw new Error(`provider-health ${phase} ${anchor.id}: ${response.error ?? "missing observation"}`);
    const proposal = parseProviderHealthProposal(response.text);
    records.push({
      phase,
      position: index + 1,
      anchorId: anchor.id,
      kind: anchor.kind,
      promptHash: sha256ProviderHealth(anchor.prompt),
      requestBodySha256: response.requestBodySha256,
      rawResponse: response.text,
      rawResponseSha256: sha256ProviderHealth(response.text),
      proposal,
      provider: response.observation,
    });
  }
  return records;
}
