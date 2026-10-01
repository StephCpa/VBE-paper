import { runPopulationAsyncPaired } from "./env.ts";
import {
  coordinationSlice,
  epistemicBeliefInstructionForK,
  epistemicNoticesForK,
  structuralScheduleHash,
  validateEpistemicResponse,
  type EpistemicKind,
} from "./epistemic.ts";
import {
  REACTIVITY_PRIMARY_ROUNDS,
  reactivityCellKey,
  type ReactivityBeliefRecord,
  type ReactivityCell,
  type ReactivityMode,
  type ReactivityRun,
} from "./epistemic-reactivity.ts";
import { grokChat, mapPool, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal, RunResult } from "./types.ts";

export const REACTIVITY_ROBOT_IDS = [0, 1] as const;
const NOTICES = epistemicNoticesForK(2);
const BELIEF_INSTRUCTION = epistemicBeliefInstructionForK(2);

export type ReactivityReplayContext = {
  me: AgentState;
  partner: AgentState;
  t: number;
  T: number;
};

function cloneAgent(agent: AgentState): AgentState {
  return {
    ...agent,
    memory: agent.memory.map((item) => ({ ...item })),
  };
}

export function reactivityCombinedPrompt(
  context: ReactivityReplayContext,
  delivery: EpistemicKind,
): string {
  return meetingPrompt(
    context.me,
    context.partner,
    context.t,
    DEFAULT_PARAMS,
    "label",
    NOTICES[delivery],
    "",
    false,
    true,
    BELIEF_INSTRUCTION,
  );
}

export function reactivityActionOnlyPrompt(
  context: ReactivityReplayContext,
  delivery: EpistemicKind,
): string {
  return meetingPrompt(
    context.me,
    context.partner,
    context.t,
    DEFAULT_PARAMS,
    "label",
    NOTICES[delivery],
    "",
    false,
    false,
  );
}

export function validateReactivityActionOnly(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON object";
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
    if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
    if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
    if ("pAccept" in obj || "pSecond" in obj) return "unexpected belief field";
    return null;
  } catch {
    return "invalid JSON";
  }
}

function beliefRecord(
  proposal: Proposal,
  context: ReactivityReplayContext,
  source: ReactivityMode,
): ReactivityBeliefRecord {
  if (typeof proposal.pAccept !== "number" || typeof proposal.pSecond !== "number") {
    throw new Error("validated combined response lost belief fields");
  }
  return {
    t: context.t,
    agentId: context.me.id,
    pAccept: proposal.pAccept,
    pSecond: proposal.pSecond,
    source,
  };
}

function countActionBeliefFields(result: RunResult): number {
  let count = 0;
  for (const round of result.rounds) {
    for (const meeting of round.meetings) {
      for (const proposal of [meeting.pi, meeting.pj]) {
        if (proposal.pAccept !== undefined) count += 1;
        if (proposal.pSecond !== undefined) count += 1;
      }
    }
  }
  return count;
}

function summarizeBeliefs(records: ReactivityBeliefRecord[]) {
  const selected = records.filter(
    (record) =>
      record.t >= REACTIVITY_PRIMARY_ROUNDS.first &&
      record.t <= REACTIVITY_PRIMARY_ROUNDS.last,
  );
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    n: selected.length,
    pAccept: average(selected.map((record) => record.pAccept)),
    pSecond: average(selected.map((record) => record.pSecond)),
  };
}

export async function runReactivityCell(
  cell: ReactivityCell,
  seed: number,
  studyLabel = "reactivity",
): Promise<ReactivityRun> {
  const robots = new Set<number>(REACTIVITY_ROBOT_IDS);
  const replayContexts: ReactivityReplayContext[] = [];
  const beliefRecords: ReactivityBeliefRecord[] = [];
  let actionCalls = 0;
  let replayCalls = 0;
  let apiFails = 0;
  let parseFails = 0;

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    actionCalls += 1;
    const context: ReactivityReplayContext = {
      me: cloneAgent(me),
      partner: cloneAgent(partner),
      t,
      T,
    };
    if (cell.mode === "sealed-replay") replayContexts.push(context);
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(
        `  ${studyLabel} action ${reactivityCellKey(cell)} seed=${seed} round=${t}/${T} calls=${actionCalls}`,
      );
    }
    const inline = cell.mode === "inline";
    const response = await grokChat({
      prompt: inline
        ? reactivityCombinedPrompt(context, cell.delivery)
        : reactivityActionOnlyPrompt(context, cell.delivery),
      system: RULES,
      maxTokens: inline ? 96 : 48,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(
        `${studyLabel} action ${reactivityCellKey(cell)} seed=${seed} t=${t} agent=${me.id}: ${response.error}`,
      );
    }
    const invalid = inline
      ? validateEpistemicResponse(response.text)
      : validateReactivityActionOnly(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `${studyLabel} action ${reactivityCellKey(cell)} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    const proposal = parseProposal(response.text);
    if (inline) beliefRecords.push(beliefRecord(proposal, context, "inline"));
    return proposal;
  };

  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  let replayStartedAfterEnvironment = false;
  if (cell.mode === "sealed-replay") {
    replayStartedAfterEnvironment = true;
    console.log(
      `  ${studyLabel} sealed replay ${cell.delivery} seed=${seed} contexts=${replayContexts.length}`,
    );
    const replayed = await mapPool(replayContexts, 6, async (context, index) => {
      replayCalls += 1;
      if (index === 0 || (index + 1) % 24 === 0) {
        console.log(
          `    ${studyLabel} replay ${cell.delivery} seed=${seed} ${index + 1}/${replayContexts.length}`,
        );
      }
      const response = await grokChat({
        prompt: reactivityCombinedPrompt(context, cell.delivery),
        system: RULES,
        maxTokens: 96,
        temperature: 0,
        json: true,
      });
      if (!response.ok) {
        apiFails += 1;
        throw new Error(
          `${studyLabel} replay ${cell.delivery} seed=${seed} t=${context.t} agent=${context.me.id}: ${response.error}`,
        );
      }
      const invalid = validateEpistemicResponse(response.text);
      if (invalid) {
        parseFails += 1;
        throw new Error(
          `${studyLabel} replay ${cell.delivery} seed=${seed} t=${context.t} agent=${context.me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
        );
      }
      return beliefRecord(parseProposal(response.text), context, "sealed-replay");
    });
    beliefRecords.push(...replayed);
  }

  const llmSeller = coordinationSlice(
    result,
    (easyId) => !robots.has(easyId),
    REACTIVITY_PRIMARY_ROUNDS.first,
    REACTIVITY_PRIMARY_ROUNDS.last,
  );
  const llmBuyer = coordinationSlice(
    result,
    (_easyId, hardId) => !robots.has(hardId),
    REACTIVITY_PRIMARY_ROUNDS.first,
    REACTIVITY_PRIMARY_ROUNDS.last,
  );
  const llmLlm = coordinationSlice(
    result,
    (easyId, hardId) => !robots.has(easyId) && !robots.has(hardId),
    REACTIVITY_PRIMARY_ROUNDS.first,
    REACTIVITY_PRIMARY_ROUNDS.last,
  );
  return {
    delivery: cell.delivery,
    mode: cell.mode,
    seed,
    actionCalls,
    replayCalls,
    apiFails,
    parseFails,
    actionBeliefFields: countActionBeliefFields(result),
    replayStartedAfterEnvironment,
    robotIds: [...REACTIVITY_ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    llmSeller,
    llmBuyer,
    llmLlm,
    beliefRecords,
    belief: summarizeBeliefs(beliefRecords),
    meanScore: result.meanScore,
    result,
  };
}

export function printReactivityDryRun(): void {
  const me: AgentState = {
    id: 2,
    type: "E",
    checks: 1,
    chits: 0,
    score: 0,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  const partner: AgentState = { ...me, id: 3, type: "H", chits: 1, solved: false };
  const context = { me, partner, t: 5, T: DEFAULT_PARAMS.T };
  console.log("===== ACTION ONLY =====");
  console.log(reactivityActionOnlyPrompt(context, "public"));
  console.log("\n===== INLINE / SEALED REPLAY COMBINED =====");
  console.log(reactivityCombinedPrompt(context, "public"));
}
