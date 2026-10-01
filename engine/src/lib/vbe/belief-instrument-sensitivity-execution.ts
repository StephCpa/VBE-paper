import { runPopulationAsyncPaired } from "./env.ts";
import { epistemicNoticesForK, structuralScheduleHash } from "./epistemic.ts";
import {
  BELIEF_SENSITIVITY_ROBOT_IDS,
  BELIEF_SENSITIVITY_WINDOW,
  scoreRepairedBeliefs,
  type BeliefSensitivityRun,
  type SensitivityRecord,
} from "./belief-instrument-sensitivity.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal } from "./types.ts";

const NOTICE = epistemicNoticesForK(4).public;

export const REPAIRED_BELIEF_INSTRUCTION = `REPAIRED PRIVATE REPORTING INSTRUMENT. Report fractions from 0 to 1, not counts or percentages.
- pAccept: among eligible Easy-seller decisions made by your other seven peers in rounds 5–21, the fraction you predict will offer a leftover check and require one mark.
- pSecond: the average pAccept report you predict those seven peers will produce about their own respective peers.

Agents #0–#3 are mechanical KW agents. At settlement, the system generates each mechanical agent's pAccept report truthfully from its realized peer target; those four reports enter your pSecond target. Reports from the other model agents enter as their individual run averages. Therefore an all-0.5 model profile does not make pSecond=0.5 automatically correct.

EVERY report is settled separately at the end, without averaging your reports first. Each field earns 0.25 × (1 − squared error), so every two-field report earns up to 0.5 points. A typical run contains several reports and therefore places several score points at stake. Reports stay private until the run ends.`;

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

export function validateRepairedBeliefResponse(text: string): string | null {
  const obj = parseObject(text);
  if (!obj) return "missing or invalid JSON object";
  const expected = ["giveCheck", "giveChits", "pAccept", "pSecond", "requireChit"].sort();
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(expected)) {
    return "response fields do not match the exact contract";
  }
  if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
  if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
  if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
  for (const key of ["pAccept", "pSecond"] as const) {
    if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) return `${key} must be finite`;
    if (obj[key] < 0 || obj[key] > 1) return `${key} must be in [0,1]`;
  }
  return null;
}

function validateActionResponse(text: string): string | null {
  const obj = parseObject(text);
  if (!obj) return "missing or invalid JSON object";
  const expected = ["giveCheck", "giveChits", "requireChit"].sort();
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(expected)) {
    return "action response fields do not match the exact contract";
  }
  if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
  if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
  return typeof obj.requireChit === "boolean" ? null : "requireChit must be boolean";
}

export function repairedBeliefPrompt(me: AgentState, partner: AgentState, t: number): string {
  return meetingPrompt(
    me,
    partner,
    t,
    DEFAULT_PARAMS,
    "label",
    NOTICE,
    "",
    false,
    true,
    REPAIRED_BELIEF_INSTRUCTION,
  );
}

function actionOnlyPrompt(me: AgentState, partner: AgentState, t: number): string {
  return meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", NOTICE);
}

export async function runBeliefSensitivitySeed(seed: number): Promise<BeliefSensitivityRun> {
  const robots = new Set<number>(BELIEF_SENSITIVITY_ROBOT_IDS);
  const records: SensitivityRecord[] = [];
  let calls = 0;
  let beliefCalls = 0;
  let apiFails = 0;
  let parseFails = 0;
  const decide = async (me: AgentState, partner: AgentState, t: number, T: number): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    calls += 1;
    const inWindow = t >= BELIEF_SENSITIVITY_WINDOW.first && t <= BELIEF_SENSITIVITY_WINDOW.last;
    if (inWindow) beliefCalls += 1;
    const response = await grokChat({
      prompt: inWindow ? repairedBeliefPrompt(me, partner, t) : actionOnlyPrompt(me, partner, t),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`belief sensitivity seed=${seed} t=${t} agent=${me.id}: ${response.error}`);
    }
    const invalid = inWindow
      ? validateRepairedBeliefResponse(response.text)
      : validateActionResponse(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`belief sensitivity seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`);
    }
    const proposal = parseProposal(response.text);
    if (inWindow) {
      records.push({
        t,
        agentId: me.id,
        pAccept: proposal.pAccept!,
        pSecond: proposal.pSecond!,
      });
    }
    return proposal;
  };
  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  const scored = scoreRepairedBeliefs(result, records);
  return {
    seed,
    calls,
    beliefCalls,
    apiFails,
    parseFails,
    scheduleHash: structuralScheduleHash(result),
    robotIds: [...BELIEF_SENSITIVITY_ROBOT_IDS],
    records,
    ...scored,
    result,
  };
}

export function printBeliefSensitivityDryRun(): void {
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
  const partner: AgentState = { ...me, id: 0, type: "H", chits: 1, solved: false };
  console.log(repairedBeliefPrompt(me, partner, 5));
}
