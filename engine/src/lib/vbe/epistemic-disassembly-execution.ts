import { runPopulationAsyncPaired } from "./env.ts";
import {
  coordinationSlice,
  epistemicBeliefInstructionForK,
  epistemicNoticesForK,
  scoreEpistemicBeliefs,
  structuralScheduleHash,
} from "./epistemic.ts";
import {
  type DisassemblyAuxRecord,
  type DisassemblyCell,
  type DisassemblyMode,
  type DisassemblyRun,
  disassemblyCellKey,
} from "./epistemic-disassembly.ts";
import {
  REACTIVITY_PRIMARY_ROUNDS,
} from "./epistemic-reactivity.ts";
import {
  reactivityActionOnlyPrompt,
  reactivityCombinedPrompt,
  type ReactivityReplayContext,
} from "./epistemic-reactivity-execution.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal } from "./types.ts";

export const DISASSEMBLY_ROBOT_IDS = [0, 1] as const;
const NOTICES = epistemicNoticesForK(2);
const REWARDED_BELIEF_INSTRUCTION = epistemicBeliefInstructionForK(2);
const REWARD_MARKER = "These reports are not shown to any other agent before the run ends.";

export const SCHEMA_CONTROL_INSTRUCTION = `FORMAT CONTROL. Before acting, populate two numeric interface-check fields. These fields are mechanically fixed and are unrelated to agents, actions, outcomes, probabilities, beliefs, or rewards.
- formatA: output exactly 0.5.
- formatB: output exactly 0.5.
The fields are ignored by the economy, are not shown to another agent, never affect score, and should not be used to decide whether to trade.`;

export function disassemblyUnrewardedBeliefInstruction(): string {
  const markerAt = REWARDED_BELIEF_INSTRUCTION.indexOf(REWARD_MARKER);
  if (markerAt < 0) throw new Error("reward paragraph marker missing from belief instruction");
  return `${REWARDED_BELIEF_INSTRUCTION.slice(0, markerAt)}${REWARD_MARKER} These reports do not affect your score and receive no accuracy payment.`;
}

const ACTION_RESPONSE =
  'Reply with JSON only: {"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean}';
const SCHEMA_RESPONSE =
  'Reply with JSON only: {"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean,"formatA":number,"formatB":number}';

export function disassemblyPrompt(
  context: ReactivityReplayContext,
  cell: DisassemblyCell,
): string {
  if (cell.mode === "action-only") {
    return reactivityActionOnlyPrompt(context, cell.delivery);
  }
  if (cell.mode === "belief-rewarded") {
    return reactivityCombinedPrompt(context, cell.delivery);
  }
  if (cell.mode === "belief-unrewarded") {
    return meetingPrompt(
      context.me,
      context.partner,
      context.t,
      DEFAULT_PARAMS,
      "label",
      NOTICES[cell.delivery],
      "",
      false,
      true,
      disassemblyUnrewardedBeliefInstruction(),
    );
  }
  const base = reactivityActionOnlyPrompt(context, cell.delivery);
  if (!base.includes(ACTION_RESPONSE)) throw new Error("action response contract changed");
  return base.replace(ACTION_RESPONSE, `${SCHEMA_CONTROL_INSTRUCTION}\n${SCHEMA_RESPONSE}`);
}

function parseObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sameKeys(obj: Record<string, unknown>, expected: string[]): boolean {
  return JSON.stringify(Object.keys(obj).sort()) === JSON.stringify([...expected].sort());
}

export function validateDisassemblyResponse(
  text: string,
  mode: DisassemblyMode,
): string | null {
  const obj = parseObject(text);
  if (!obj) return "missing or invalid JSON object";
  if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
  if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
  if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
  const actionKeys = ["giveCheck", "giveChits", "requireChit"];
  if (mode === "action-only") {
    return sameKeys(obj, actionKeys) ? null : "action-only response has unexpected fields";
  }
  if (mode === "schema-control") {
    if (!sameKeys(obj, [...actionKeys, "formatA", "formatB"])) {
      return "schema-control response fields do not match contract";
    }
    if (obj.formatA !== 0.5 || obj.formatB !== 0.5) {
      return "schema-control fields must both equal 0.5";
    }
    return null;
  }
  if (!sameKeys(obj, [...actionKeys, "pAccept", "pSecond"])) {
    return "belief response fields do not match contract";
  }
  for (const key of ["pAccept", "pSecond"] as const) {
    if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) {
      return `${key} must be a finite number`;
    }
    if (obj[key] < 0 || obj[key] > 1) return `${key} must be in [0,1]`;
  }
  return null;
}

function auxRecord(
  text: string,
  mode: DisassemblyMode,
  me: AgentState,
  t: number,
): DisassemblyAuxRecord | null {
  if (mode === "action-only") return null;
  const obj = parseObject(text);
  if (!obj) throw new Error("validated response could not be reparsed");
  const fieldA = Number(mode === "schema-control" ? obj.formatA : obj.pAccept);
  const fieldB = Number(mode === "schema-control" ? obj.formatB : obj.pSecond);
  return { t, agentId: me.id, fieldA, fieldB };
}

function summarizeAux(records: DisassemblyAuxRecord[]) {
  const selected = records.filter(
    (record) =>
      record.t >= REACTIVITY_PRIMARY_ROUNDS.first &&
      record.t <= REACTIVITY_PRIMARY_ROUNDS.last,
  );
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    n: selected.length,
    fieldA: average(selected.map((record) => record.fieldA)),
    fieldB: average(selected.map((record) => record.fieldB)),
  };
}

export async function runDisassemblyCell(
  cell: DisassemblyCell,
  seed: number,
): Promise<DisassemblyRun> {
  const robots = new Set<number>(DISASSEMBLY_ROBOT_IDS);
  const auxRecords: DisassemblyAuxRecord[] = [];
  let calls = 0;
  let apiFails = 0;
  let parseFails = 0;
  let beliefFieldCount = 0;
  let formatFieldCount = 0;

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(
        `  disassembly action ${disassemblyCellKey(cell)} seed=${seed} round=${t}/${T} calls=${calls}`,
      );
    }
    const context: ReactivityReplayContext = { me, partner, t, T };
    const response = await grokChat({
      prompt: disassemblyPrompt(context, cell),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(
        `disassembly ${disassemblyCellKey(cell)} seed=${seed} t=${t} agent=${me.id}: ${response.error}`,
      );
    }
    const invalid = validateDisassemblyResponse(response.text, cell.mode);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `disassembly ${disassemblyCellKey(cell)} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    const record = auxRecord(response.text, cell.mode, me, t);
    if (record) auxRecords.push(record);
    if (cell.mode === "schema-control") formatFieldCount += 2;
    if (cell.mode.startsWith("belief-")) beliefFieldCount += 2;
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  const beliefBonus =
    cell.mode === "belief-rewarded"
      ? scoreEpistemicBeliefs(
          result,
          DISASSEMBLY_ROBOT_IDS,
          0.25,
          REACTIVITY_PRIMARY_ROUNDS.first,
          REACTIVITY_PRIMARY_ROUNDS.last,
        ).meanBonus
      : 0;
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
    calls,
    apiFails,
    parseFails,
    beliefFieldCount,
    formatFieldCount,
    robotIds: [...DISASSEMBLY_ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: { ...REACTIVITY_PRIMARY_ROUNDS },
    llmSeller,
    llmBuyer,
    llmLlm,
    auxRecords,
    aux: summarizeAux(auxRecords),
    beliefBonus,
    meanScore: result.meanScore,
    totalMeanScore: result.meanScore + beliefBonus,
    result,
  };
}

export function printDisassemblyDryRun(): void {
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
  const partner: AgentState = {
    ...me,
    id: 3,
    type: "H",
    chits: 1,
    solved: false,
  };
  const context: ReactivityReplayContext = { me, partner, t: 5, T: 24 };
  for (const mode of [
    "action-only",
    "schema-control",
    "belief-unrewarded",
    "belief-rewarded",
  ] as const) {
    console.log(`\n=== private:${mode} ===`);
    console.log(disassemblyPrompt(context, { delivery: "private", mode }));
    console.log(`\n=== public:${mode} ===`);
    console.log(disassemblyPrompt(context, { delivery: "public", mode }));
  }
}
