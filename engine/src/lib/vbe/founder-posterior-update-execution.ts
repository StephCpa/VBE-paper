import { POSTERIOR_CASES, posteriorOrder, posteriorPrompt, parsePosterior, sha256Posterior, type PosteriorCaseResult, type PosteriorObservation } from "./founder-posterior-update.ts";
import { grokChat } from "./llm.ts";

export async function runPosteriorCase(caseId: number): Promise<PosteriorCaseResult> {
  const item = POSTERIOR_CASES[caseId - 1];
  if (!item) throw new Error(`invalid posterior case ${caseId}`);
  const order = [...posteriorOrder(caseId)];
  const observations: PosteriorObservation[] = [];
  let calls = 0, apiFails = 0, parseFails = 0;
  for (let position = 0; position < order.length; position++) {
    const kind = order[position]!;
    const prompt = posteriorPrompt(kind, item);
    calls += 1;
    const response = await grokChat({
      prompt,
      system: "Estimate the requested conditional probability from the supplied prior and evidence. Return exactly one JSON object with one key named posterior and a numeric value from 0 to 1.",
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) { apiFails += 1; throw new Error(`posterior case=${caseId} interface=${kind}: ${response.error}`); }
    let prediction: number;
    try { prediction = parsePosterior(response.text); }
    catch (error) { parseFails += 1; throw new Error(`posterior case=${caseId} interface=${kind}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
    observations.push({ interface: kind, position: position + 1, promptHash: sha256Posterior(prompt), prediction });
  }
  return { caseId, case: item, calls: 3, apiFails, parseFails, order, observations };
}
