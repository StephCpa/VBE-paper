import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import {
  CANONICAL_POLICY,
  parseFounderDecision,
} from "./founder.ts";
import {
  founderRentPrompt,
  settleFounderRentDecision,
  validateFounderRentDecision,
  type FounderRentArm,
  type FounderRentDecisionRecord,
  type FounderRentRun,
} from "./founder-rent.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export function validateFounderRentAction(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON";
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    // The frozen protocol inherits the old Study I meeting prompt, including
    // its two descriptive belief fields. They are parsed but not scored and
    // do not enter the confirmatory endpoint.
    const expected = ["giveCheck", "giveChits", "pAccept", "pSecond", "requireChit"];
    if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(expected)) {
      return "action response has unexpected fields";
    }
    if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
    if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
    if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
    for (const key of ["pAccept", "pSecond"] as const) {
      if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) {
        return `${key} must be a finite number`;
      }
      if (obj[key] < 0 || obj[key] > 1) return `${key} must be in [0,1]`;
    }
    return null;
  } catch {
    return "invalid JSON";
  }
}

export async function runFounderRentArm(
  arm: FounderRentArm,
  seed: number,
): Promise<FounderRentRun> {
  const params = ORIGINATION_PARAMS;
  const speakerId = seed % params.n;
  let authorCalls = 0;
  let actionCalls = 0;
  let apiFails = 0;
  let parseFails = 0;
  let authorship: FounderRentDecisionRecord | null = null;

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t !== 1 || authorship) return;
    const speaker = agents[speakerId]!;
    authorCalls += 1;
    const response = await grokChat({
      prompt: founderRentPrompt(arm, speaker, t, params.T),
      system: "Follow the experimental rules. Return only the requested JSON object.",
      maxTokens: 128,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`founder-rent author ${arm} seed=${seed}: ${response.error}`);
    }
    const invalid = validateFounderRentDecision(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `founder-rent author ${arm} seed=${seed}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    authorship = settleFounderRentDecision(arm, speaker, parseFounderDecision(response.text));
    console.log(
      `  founder-rent author ${arm} seed=${seed} speaker=#${speakerId} founded=${authorship.founded} net=${authorship.netScoreChange}`,
    );
  };

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
  ): Promise<Proposal> => {
    actionCalls += 1;
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  founder-rent action ${arm} seed=${seed} round=${t}/${params.T} calls=${actionCalls}`);
    }
    const notice = authorship?.founded
      ? `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}`
      : "VERIFIED PUBLIC LEDGER: no institution proposal has been published.";
    const response = await grokChat({
      prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`founder-rent action ${arm} seed=${seed} t=${t}: ${response.error}`);
    }
    const invalid = validateFounderRentAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `founder-rent action ${arm} seed=${seed} t=${t}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(
    seed,
    decide,
    params,
    true,
    undefined,
    beforeMeetings,
  );
  if (!authorship) throw new Error(`missing founder-rent authorship decision ${arm}:${seed}`);
  const last = params.T - 1;
  const slice = coordinationSlice(result, () => true, 1, last);
  return {
    arm,
    seed,
    speakerId,
    authorCalls,
    actionCalls,
    apiFails,
    parseFails,
    scheduleHash: structuralScheduleHash(result),
    authorship,
    seller: slice,
    buyer: slice,
    trade: slice,
    founderFinalScore: result.scores[speakerId]!,
    meanScore: result.meanScore,
    result,
  };
}
