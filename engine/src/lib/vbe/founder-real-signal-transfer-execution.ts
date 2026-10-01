import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { CANONICAL_POLICY } from "./founder.ts";
import { validateFounderRentAction } from "./founder-rent-execution.ts";
import {
  isQualifyingTrade,
  parseRealSignalAction,
  qualifyingTradeCount,
  realSignalDecisionObject,
  realSignalOrder,
  realSignalPrompt,
  sha256RealSignal,
  signalFromEarlyTrades,
  type RealSignalObservation,
  type RealSignalRun,
} from "./founder-real-signal-transfer.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export async function runRealSignalSeed(seed: number): Promise<RealSignalRun> {
  const params = ORIGINATION_PARAMS;
  const speakerId = seed % params.n;
  let decisionCalls = 0, actionCalls = 0, apiFails = 0, parseFails = 0;
  let monitoredEarlyTrades = 0;
  let earlyTradesAtDecision: number | null = null;
  let signalAtDecision: RealSignalRun["signal"] | null = null;
  let order: RealSignalRun["order"] = [];
  const observations: RealSignalObservation[] = [];

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t !== 5 || observations.length) return;
    earlyTradesAtDecision = monitoredEarlyTrades;
    signalAtDecision = signalFromEarlyTrades(earlyTradesAtDecision);
    order = [...realSignalOrder(seed)];
    for (let position = 0; position < order.length; position++) {
      const arm = order[position]!;
      const prompt = realSignalPrompt(arm, signalAtDecision);
      decisionCalls += 1;
      const response = await grokChat({
        prompt,
        system: "Choose the higher expected-net-payoff action from the verified recommendation-free round-5 decision object. Return exactly one JSON object with one boolean key named publish.",
        maxTokens: 48,
        temperature: 0,
        json: true,
      });
      if (!response.ok) { apiFails += 1; throw new Error(`real-signal seed=${seed} arm=${arm}: ${response.error}`); }
      let publish: boolean;
      try { publish = parseRealSignalAction(response.text); }
      catch (error) { parseFails += 1; throw new Error(`real-signal seed=${seed} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 180)}`); }
      observations.push({ arm, position: position + 1, promptHash: sha256RealSignal(prompt), decisionObject: realSignalDecisionObject(arm, signalAtDecision), publish });
      console.log(`  real-signal decision seed=${seed} signal=${signalAtDecision} arm=${arm} publish=${publish}`);
    }
  };

  const afterMeetings = async (_agents: AgentState[], snapshot: RealSignalRun["result"]["rounds"][number]) => {
    if (snapshot.t <= 4) monitoredEarlyTrades += snapshot.meetings.filter(isQualifyingTrade).length;
  };

  const decide = async (me: AgentState, partner: AgentState, t: number): Promise<Proposal> => {
    actionCalls += 1;
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  real-signal forced-policy seed=${seed} round=${t}/${params.T} calls=${actionCalls}`);
    }
    const notice = `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}`;
    const response = await grokChat({ prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true), system: RULES, maxTokens: 64, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`real-signal action seed=${seed} t=${t}: ${response.error}`); }
    const invalid = validateFounderRentAction(response.text);
    if (invalid) { parseFails += 1; throw new Error(`real-signal action seed=${seed} t=${t}: ${invalid}; raw=${response.text.slice(0, 180)}`); }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(seed, decide, params, true, undefined, beforeMeetings, afterMeetings);
  if (earlyTradesAtDecision === null || signalAtDecision === null || observations.length !== 3) throw new Error(`missing real-signal decision seed=${seed}`);
  const early = coordinationSlice(result, () => true, 1, 4);
  const future = coordinationSlice(result, () => true, 5, 23);
  const earlyTrades = qualifyingTradeCount(result, 1, 4);
  const futureTrades = qualifyingTradeCount(result, 5, 23);
  if (earlyTradesAtDecision !== earlyTrades) throw new Error(`memory/trace early-trade mismatch seed=${seed}`);
  return {
    seed,
    speakerId,
    decisionRound: 5,
    earlyTrades,
    signal: signalAtDecision,
    decisionCalls: 3,
    actionCalls,
    apiFails,
    parseFails,
    order,
    observations,
    scheduleHash: structuralScheduleHash(result),
    futureTrades,
    outcomeY: Number(futureTrades >= 1) as 0 | 1,
    early,
    future,
    meanScore: result.meanScore,
    result,
  };
}
