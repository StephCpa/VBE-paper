import { actionTransferObject, actionTransferOrder, actionTransferPrompt, parseActionTransfer, sha256ActionTransfer, type ActionTransferCaseResult, type ActionTransferObservation } from "./founder-posterior-action-transfer.ts";
import { POSTERIOR_CASES } from "./founder-posterior-update.ts";
import { grokChat } from "./llm.ts";

export async function runActionTransferCase(caseId: number): Promise<ActionTransferCaseResult> {
  const item = POSTERIOR_CASES[caseId - 1]; if (!item) throw new Error(`invalid action-transfer case ${caseId}`);
  const order = [...actionTransferOrder(caseId)], observations: ActionTransferObservation[] = []; let apiFails = 0, parseFails = 0;
  for (let position = 0; position < order.length; position++) { const arm = order[position]!, prompt = actionTransferPrompt(arm, item); const response = await grokChat({ prompt, system: "Choose the higher expected-net-payoff action from the verified recommendation-free decision object. Return exactly one JSON object with one boolean key named publish.", maxTokens: 48, temperature: 0, json: true }); if (!response.ok) { apiFails += 1; throw new Error(`action-transfer case=${caseId} arm=${arm}: ${response.error}`); } let publish: boolean; try { publish = parseActionTransfer(response.text); } catch (error) { parseFails += 1; throw new Error(`action-transfer case=${caseId} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); } observations.push({ arm, position: position + 1, promptHash: sha256ActionTransfer(prompt), decisionObject: actionTransferObject(arm, item), publish }); }
  return { caseId, case: item, calls: 3, apiFails, parseFails, order, observations };
}
