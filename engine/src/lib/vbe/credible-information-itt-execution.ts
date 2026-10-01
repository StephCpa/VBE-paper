import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import {
  CREDIBLE_INFO_ROBOT_IDS,
  CREDIBLE_INFO_WINDOW,
  type CredibleInfoLevel,
  type CredibleInfoRun,
} from "./credible-information-itt.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal } from "./types.ts";

const SLOT_IDS = [0, 1, 2, 3] as const;

export function credibleInformationNotice(level: CredibleInfoLevel): string {
  const slots = SLOT_IDS.map((id) =>
    `slot_${id}: ${id < level ? "VERIFIED" : "WITHHELD"}`,
  ).join("\n");
  return `PUBLIC INDEPENDENT AUDIT RECORD CI-${level}.
The system certifies that this exact record is visible to every agent throughout the run, and that every agent sees this same visibility statement.
audited_population: agents #0, #1, #2, #3
disclosed_certificates: ${level} of 4
${slots}
STATUS DEFINITION. VERIFIED certifies that the named agent uses this fixed behavior: in every non-final round, when that agent is EASY with a leftover check and a HARD partner offers one mark, the agent gives the check and requires the mark. WITHHELD means only that the policy certificate is not disclosed; it is not evidence of refusal or of any opposite policy.
This record reports audited behavior and disclosure only. It prescribes no action, supplies no payoff calculation, requests no forecast, and carries no extra reward.`;
}

function parseObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function validateCredibleInformationResponse(text: string): string | null {
  const obj = parseObject(text);
  if (!obj) return "missing or invalid JSON object";
  const expected = ["giveCheck", "giveChits", "requireChit"].sort();
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(expected)) {
    return "response fields do not match the exact action-only contract";
  }
  if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
  if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
  return typeof obj.requireChit === "boolean" ? null : "requireChit must be boolean";
}

export function credibleInformationPrompt(
  me: AgentState,
  partner: AgentState,
  t: number,
  level: CredibleInfoLevel,
): string {
  return meetingPrompt(
    me,
    partner,
    t,
    DEFAULT_PARAMS,
    "label",
    credibleInformationNotice(level),
  );
}

export async function runCredibleInformationCell(
  seed: number,
  level: CredibleInfoLevel,
): Promise<CredibleInfoRun> {
  const robots = new Set<number>(CREDIBLE_INFO_ROBOT_IDS);
  let calls = 0;
  let apiFails = 0;
  let parseFails = 0;
  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    calls += 1;
    const response = await grokChat({
      prompt: credibleInformationPrompt(me, partner, t, level),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`credible information seed=${seed} level=${level} t=${t} agent=${me.id}: ${response.error}`);
    }
    const invalid = validateCredibleInformationResponse(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`credible information seed=${seed} level=${level} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`);
    }
    return parseProposal(response.text);
  };
  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  return {
    seed,
    level,
    calls,
    apiFails,
    parseFails,
    actionBeliefFields: 0,
    robotIds: [...CREDIBLE_INFO_ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: { ...CREDIBLE_INFO_WINDOW },
    notice: credibleInformationNotice(level),
    llmSeller: coordinationSlice(
      result,
      (easyId) => !robots.has(easyId),
      CREDIBLE_INFO_WINDOW.first,
      CREDIBLE_INFO_WINDOW.last,
    ),
    llmBuyer: coordinationSlice(
      result,
      (_easyId, hardId) => !robots.has(hardId),
      CREDIBLE_INFO_WINDOW.first,
      CREDIBLE_INFO_WINDOW.last,
    ),
    llmLlm: coordinationSlice(
      result,
      (easyId, hardId) => !robots.has(easyId) && !robots.has(hardId),
      CREDIBLE_INFO_WINDOW.first,
      CREDIBLE_INFO_WINDOW.last,
    ),
    meanScore: result.meanScore,
    result,
  };
}

export function printCredibleInformationDryRun(): void {
  const me: AgentState = {
    id: 4,
    type: "E",
    checks: 1,
    chits: 0,
    score: 12,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  const partner: AgentState = { ...me, id: 5, type: "H", chits: 1, solved: false };
  for (const level of [0, 2, 4] as const) {
    console.log(`\n=== disclose-${level} ===`);
    console.log(credibleInformationPrompt(me, partner, 5, level));
  }
}
