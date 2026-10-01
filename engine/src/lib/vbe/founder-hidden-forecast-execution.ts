import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { CANONICAL_POLICY } from "./founder.ts";
import { validateFounderRentAction } from "./founder-rent-execution.ts";
import { hiddenAuditPrompt, hiddenDecisionPrompt, hiddenForecastOrder, parseHiddenAudit, parseHiddenDecision, sha256, type HiddenForecastDecision, type HiddenForecastRun } from "./founder-hidden-forecast.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export async function runHiddenForecastSeed(seed: number): Promise<HiddenForecastRun> {
  const params = ORIGINATION_PARAMS;
  const speakerId = seed % params.n;
  let decisionCalls = 0, auditCalls = 0, actionCalls = 0, apiFails = 0, parseFails = 0;
  let decisions: HiddenForecastDecision[] = [];
  let audit: HiddenForecastRun["audit"] | null = null;
  let auditPromptHash = "";
  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t !== 1 || audit) return;
    const speaker = agents[speakerId]!;
    const order = hiddenForecastOrder(seed);
    for (let i = 0; i < order.length; i++) {
      const cost = order[i]!;
      const prompt = hiddenDecisionPrompt(cost, speaker, i + 1);
      decisionCalls += 1;
      const response = await grokChat({ prompt, system: "Make the sealed decision under the stated hidden-distribution contract. Return only the requested JSON object.", maxTokens: 256, temperature: 0, json: true });
      if (!response.ok) { apiFails += 1; throw new Error(`hidden-forecast decision cost=${cost} seed=${seed}: ${response.error}`); }
      let decision;
      try { decision = parseHiddenDecision(response.text); } catch (error) { parseFails += 1; throw new Error(`hidden-forecast decision cost=${cost} seed=${seed}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
      decisions.push({ cost, position: i + 1, promptHash: sha256(prompt), decision });
      console.log(`  hidden-forecast decision seed=${seed} cost=${cost} publish=${decision.publish}`);
    }
    const prompt = hiddenAuditPrompt(decisions, speaker);
    auditPromptHash = sha256(prompt);
    auditCalls += 1;
    const response = await grokChat({ prompt, system: "The actions are already sealed. Forecast the counterfactual outcome and report calibrated probabilities. Return only the requested JSON object.", maxTokens: 512, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`hidden-forecast audit seed=${seed}: ${response.error}`); }
    try { audit = parseHiddenAudit(response.text); } catch (error) { parseFails += 1; throw new Error(`hidden-forecast audit seed=${seed}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 240)}`); }
    console.log(`  hidden-forecast audit seed=${seed} p=[${audit.distribution.p0},${audit.distribution.p1},${audit.distribution.p2},${audit.distribution.p3plus}] E[N]=${audit.expected_trades}`);
  };
  const decide = async (me: AgentState, partner: AgentState, t: number): Promise<Proposal> => {
    actionCalls += 1;
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) { (decide as { _t?: number })._t = t; console.log(`  hidden-forecast forced-policy seed=${seed} round=${t}/${params.T} calls=${actionCalls}`); }
    const notice = `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}`;
    const response = await grokChat({ prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true), system: RULES, maxTokens: 64, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`hidden-forecast action seed=${seed} t=${t}: ${response.error}`); }
    const invalid = validateFounderRentAction(response.text);
    if (invalid) { parseFails += 1; throw new Error(`hidden-forecast action seed=${seed} t=${t}: ${invalid}; raw=${response.text.slice(0, 180)}`); }
    return parseProposal(response.text);
  };
  const result = await runPopulationAsyncPaired(seed, decide, params, true, undefined, beforeMeetings);
  if (!audit || decisions.length !== 3) throw new Error(`missing hidden-forecast instruments seed=${seed}`);
  const slice = coordinationSlice(result, () => true, 1, params.T - 1);
  return { seed, speakerId, decisionCalls: 3, auditCalls: 1, actionCalls, apiFails, parseFails, scheduleHash: structuralScheduleHash(result), decisions, auditPromptHash, audit, realizedTrades: slice.trades, seller: slice, buyer: slice, trade: slice, meanScore: result.meanScore, result };
}
