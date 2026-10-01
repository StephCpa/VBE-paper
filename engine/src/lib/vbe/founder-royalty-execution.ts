import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { CANONICAL_POLICY, parseFounderDecision } from "./founder.ts";
import { validateFounderRentAction } from "./founder-rent-execution.ts";
import {
  founderRoyaltyPrompt,
  royaltySettlement,
  settleRoyaltyDecision,
  validateFounderRoyaltyDecision,
  type FounderRoyaltyArm,
  type FounderRoyaltyDecisionRecord,
  type FounderRoyaltyRun,
} from "./founder-royalty.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export async function runFounderRoyaltyArm(arm: FounderRoyaltyArm, seed: number): Promise<FounderRoyaltyRun> {
  const params = ORIGINATION_PARAMS;
  const speakerId = seed % params.n;
  let authorCalls = 0, actionCalls = 0, apiFails = 0, parseFails = 0;
  let authorship: FounderRoyaltyDecisionRecord | null = null;
  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t !== 1 || authorship) return;
    const speaker = agents[speakerId]!;
    authorCalls += 1;
    const response = await grokChat({ prompt: founderRoyaltyPrompt(arm, speaker, t, params.T), system: "Follow the experimental rules. Return only the requested JSON object.", maxTokens: 128, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`founder-royalty author ${arm} seed=${seed}: ${response.error}`); }
    const invalid = validateFounderRoyaltyDecision(response.text);
    if (invalid) { parseFails += 1; throw new Error(`founder-royalty author ${arm} seed=${seed}: ${invalid}; raw=${response.text.slice(0, 180)}`); }
    authorship = settleRoyaltyDecision(arm, speaker, parseFounderDecision(response.text));
    console.log(`  founder-royalty author ${arm} seed=${seed} speaker=#${speakerId} founded=${authorship.founded} immediate=${authorship.immediateNet}`);
  };
  const decide = async (me: AgentState, partner: AgentState, t: number): Promise<Proposal> => {
    actionCalls += 1;
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) { (decide as { _t?: number })._t = t; console.log(`  founder-royalty action ${arm} seed=${seed} round=${t}/${params.T} calls=${actionCalls}`); }
    const notice = authorship?.founded ? `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}` : "VERIFIED PUBLIC LEDGER: no institution proposal has been published.";
    const response = await grokChat({ prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true), system: RULES, maxTokens: 64, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`founder-royalty action ${arm} seed=${seed} t=${t}: ${response.error}`); }
    const invalid = validateFounderRentAction(response.text);
    if (invalid) { parseFails += 1; throw new Error(`founder-royalty action ${arm} seed=${seed} t=${t}: ${invalid}; raw=${response.text.slice(0, 180)}`); }
    return parseProposal(response.text);
  };
  const result = await runPopulationAsyncPaired(seed, decide, params, true, undefined, beforeMeetings);
  if (!authorship) throw new Error(`missing founder-royalty authorship ${arm}:${seed}`);
  const slice = coordinationSlice(result, () => true, 1, params.T - 1);
  const settlement = royaltySettlement(arm, seed, authorship.founded, slice.trades);
  result.scores[speakerId]! += settlement.endPayout;
  result.meanScore = result.scores.reduce((sum, score) => sum + score, 0) / result.scores.length;
  return {
    arm, seed, speakerId, authorCalls, actionCalls, apiFails, parseFails,
    scheduleHash: structuralScheduleHash(result), authorship, settlement,
    seller: slice, buyer: slice, trade: slice,
    founderFinalScore: result.scores[speakerId]!, meanScore: result.meanScore, result,
  };
}
