import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { CANONICAL_POLICY } from "./founder.ts";
import { forecastOrder, forecastPrompt, parseForecastProbabilities, serializeInitialState, sha256Forecast, type ForecastObservation, type ForecastScaffoldRun } from "./founder-forecast-scaffold.ts";
import { validateFounderRentAction } from "./founder-rent-execution.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export async function runForecastScaffoldSeed(seed: number): Promise<ForecastScaffoldRun> {
  const params = ORIGINATION_PARAMS; let forecastCalls = 0, actionCalls = 0, apiFails = 0, parseFails = 0;
  const order = [...forecastOrder(seed)]; const forecasts: ForecastObservation[] = []; let initialState: ReturnType<typeof serializeInitialState> = []; let initialStateHash = "";
  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t !== 1 || forecasts.length) return;
    initialState = serializeInitialState(agents); initialStateHash = sha256Forecast(JSON.stringify(initialState));
    for (let i = 0; i < order.length; i++) {
      const arm = order[i]!; const prompt = forecastPrompt(arm, initialState); forecastCalls += 1;
      const response = await grokChat({ prompt, system: "Forecast the requested four exhaustive buckets. Return exactly one JSON object with one probabilities array of exactly four numbers in order 0, 1, 2, 3-or-more.", maxTokens: 128, temperature: 0, json: true });
      if (!response.ok) { apiFails += 1; throw new Error(`forecast-scaffold seed=${seed} arm=${arm}: ${response.error}`); }
      let probabilities;
      try { probabilities = parseForecastProbabilities(response.text); } catch (error) { parseFails += 1; throw new Error(`forecast-scaffold seed=${seed} arm=${arm}: ${error instanceof Error ? error.message : String(error)}; raw=${response.text.slice(0, 220)}`); }
      forecasts.push({ arm, position: i + 1, promptHash: sha256Forecast(prompt), probabilities });
      console.log(`  forecast-scaffold seed=${seed} arm=${arm} p=[${probabilities.join(",")}]`);
    }
  };
  const decide = async (me: AgentState, partner: AgentState, t: number): Promise<Proposal> => {
    actionCalls += 1;
    const notice = `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}`;
    const response = await grokChat({ prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true), system: RULES, maxTokens: 64, temperature: 0, json: true });
    if (!response.ok) { apiFails += 1; throw new Error(`forecast-scaffold action seed=${seed} t=${t}: ${response.error}`); }
    const invalid = validateFounderRentAction(response.text); if (invalid) { parseFails += 1; throw new Error(`forecast-scaffold action seed=${seed} t=${t}: ${invalid}; raw=${response.text.slice(0, 180)}`); }
    return parseProposal(response.text);
  };
  const result = await runPopulationAsyncPaired(seed, decide, params, true, undefined, beforeMeetings);
  if (forecasts.length !== 3 || !initialStateHash) throw new Error(`missing forecasts seed=${seed}`);
  const slice = coordinationSlice(result, () => true, 1, params.T - 1);
  return { seed, forecastCalls: 3, actionCalls, apiFails, parseFails, order, initialState, initialStateHash, forecasts, scheduleHash: structuralScheduleHash(result), realizedTrades: slice.trades, seller: slice, buyer: slice, trade: slice, meanScore: result.meanScore, result };
}
