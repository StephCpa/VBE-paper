import { RED_BRANCH_CASES, redBranchOrder, redBranchPrompt, sha256RedBranch, type RedBranchCaseResult, type RedBranchObservation } from "./founder-posterior-red-branch.ts";
import { parsePosterior } from "./founder-posterior-update.ts";
import { grokChat } from "./llm.ts";

export async function runRedBranchCase(caseIndex: number): Promise<RedBranchCaseResult> {
  const item = RED_BRANCH_CASES[caseIndex - 1]; if (!item) throw new Error(`invalid red-branch case ${caseIndex}`);
  const order = [...redBranchOrder(caseIndex)], observations: RedBranchObservation[] = []; let apiFails = 0, parseFails = 0;
  for (let position = 0; position < order.length; position++) {
    const kind = order[position]!, prompt = redBranchPrompt(kind, item);
    const response = await grokChat({ prompt, system: "Estimate the requested conditional probability from the supplied prior and sensor evidence. Return exactly one JSON object with one key named posterior and a numeric value from 0 to 1.", maxTokens: 64, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`red-branch case=${caseIndex} interface=${kind}: ${response.error}`); }
    let prediction: number; try { prediction = parsePosterior(response.text); } catch (error) { parseFails += 1; throw new Error(`red-branch case=${caseIndex} interface=${kind}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
    observations.push({ interface: kind, position: position + 1, promptHash: sha256RedBranch(prompt), prediction });
  }
  return { caseIndex, sourceCaseId: item.caseId, case: item, calls: 3, apiFails, parseFails, order, observations };
}
