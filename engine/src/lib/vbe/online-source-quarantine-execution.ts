import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { strictAction } from "./model-preserving-enforcement.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";
import {
  ONLINE_SOURCE_WINDOWS,
  onlineConcentration,
  onlineSourceNotice,
  type OnlineSourceArm,
  type OnlineSourceRun,
} from "./online-source-quarantine.ts";

export async function runOnlineSourceCell(arm: OnlineSourceArm, seed: number): Promise<OnlineSourceRun> {
  let calls = 0;
  let apiFails = 0;
  let parseFails = 0;
  const decide = async (me: AgentState, partner: AgentState, t: number): Promise<Proposal> => {
    calls += 1;
    const response = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", onlineSourceNotice(arm, t)),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`online-source arm=${arm} seed=${seed} t=${t} agent=${me.id}: ${response.error}`);
    }
    const invalid = strictAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`online-source arm=${arm} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`);
    }
    return parseProposal(response.text);
  };
  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  return {
    arm,
    seed,
    calls,
    apiFails,
    parseFails,
    robotCalls: 0,
    scheduleHash: structuralScheduleHash(result),
    noticeDuring: onlineSourceNotice(arm, ONLINE_SOURCE_WINDOWS.treatment.first),
    pre: coordinationSlice(result, () => true, ONLINE_SOURCE_WINDOWS.pre.first, ONLINE_SOURCE_WINDOWS.pre.last),
    treatment: coordinationSlice(result, () => true, ONLINE_SOURCE_WINDOWS.treatment.first, ONLINE_SOURCE_WINDOWS.treatment.last),
    withdrawal: coordinationSlice(result, () => true, ONLINE_SOURCE_WINDOWS.withdrawal.first, ONLINE_SOURCE_WINDOWS.withdrawal.last),
    treatmentConcentration: onlineConcentration(result, ONLINE_SOURCE_WINDOWS.treatment),
    withdrawalConcentration: onlineConcentration(result, ONLINE_SOURCE_WINDOWS.withdrawal),
    meanScore: result.meanScore,
    result,
  };
}

export function printOnlineSourceDryRun(): void {
  const me: AgentState = { id: 4, type: "E", checks: 1, chits: 0, score: 15, solved: true, receivedFrom: null, memory: [] };
  const partner: AgentState = { ...me, id: 6, type: "H", chits: 1, solved: false };
  for (const t of [4, 5, 17]) {
    for (const arm of ["valid-visible", "invalid-visible", "invalid-quarantined"] as const) {
      console.log(`\n=== t=${t} ${arm} ===`);
      console.log(meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", onlineSourceNotice(arm, t)));
    }
  }
}
