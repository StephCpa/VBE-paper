import { grokChat } from "./llm.ts";
import {
  CXT_PHASES,
  cxtAcceptanceProbability,
  cxtEnvironmentHash,
  cxtOrder,
  cxtPrompt,
  parseCxtSell,
  sha256Cxt,
  type CxtEnvironmentContext,
  type CxtRecord,
} from "./source-validity-context-transfer.ts";

const SYSTEM = "Apply the explicit source-admissibility contract exactly. Failed typed numbers remain visible only in the diagnostic arm and are inadmissible. The trajectory-derived environment is immutable context, while sealedDecision defines the current one-shot payoff. Maximize expected score and return exactly one JSON object with one boolean key named sell.";

export async function runCxtBlock(block: number, environment: CxtEnvironmentContext): Promise<CxtRecord[]> {
  const q = cxtAcceptanceProbability(block);
  const order = cxtOrder(block);
  const records: CxtRecord[] = [];
  for (let index = 0; index < order.length; index++) {
    const arm = order[index]!;
    const prompt = cxtPrompt(environment, arm, q);
    const response = await grokChat({ prompt, system: SYSTEM, maxTokens: 48, temperature: 0, json: true });
    if (!response.ok) throw new Error(`CXT block=${block} arm=${arm}: ${response.error}`);
    let sell: boolean;
    try {
      sell = parseCxtSell(response.text);
    } catch (error) {
      throw new Error(`CXT block=${block} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`);
    }
    records.push({
      block,
      seed: environment.seed,
      phase: environment.phase,
      arm,
      position: index + 1,
      acceptanceProbability: q,
      environmentHash: cxtEnvironmentHash(environment),
      promptHash: sha256Cxt(prompt),
      sell,
    });
  }
  return records;
}

export function printCxtDryRun(contexts: readonly CxtEnvironmentContext[]): void {
  const indices = [0, CXT_PHASES.length - 1, contexts.length - 1];
  for (const index of indices) {
    const environment = contexts[index]!;
    const block = index + 1;
    console.log(`\n=== CXT block=${block} seed=${environment.seed} phase=${environment.phase} round=${environment.selectedRound} ===`);
    for (const arm of cxtOrder(block)) {
      console.log(`\n--- ${arm} ---`);
      console.log(cxtPrompt(environment, arm, cxtAcceptanceProbability(block)));
    }
  }
}
