import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import { onlineSourceNotice, type OnlineSourceReport, type OnlineSourceRun } from "./online-source-quarantine.ts";
import type { AgentState, Meeting, MemoryItem, Proposal, RunResult } from "./types.ts";

export const BUYER_CONTEXT_SOURCE_PATH = "src/data/online-source-quarantine.json";
export const BUYER_CONTEXT_SOURCE_SHA256 = "4756d053a7533fffb4be5acf1e04f9c2caab3b4ca9bbb50dca89ff02ab0f32ff";
export const BUYER_CONTEXT_ARMS = [
  "standard-sealed",
  "real-state",
  "real-memory",
  "online-envelope",
  "online-replay",
] as const;
export type BuyerContextArm = (typeof BUYER_CONTEXT_ARMS)[number];
export type BuyerContextPhase = "early" | "late";

export const BUYER_CONTEXT_FLOORS = {
  sealedRate: 0.85,
  onlineRateCeiling: 0.15,
  sourceAgreement: 0.85,
  materialDrop: 0.50,
  alpha: 0.025,
} as const;

export type BuyerContextCase = {
  block: number;
  seed: number;
  phase: BuyerContextPhase;
  selectedRound: number;
  hardId: number;
  easyId: number;
  agent: AgentState;
  partner: AgentState;
  sourceProposal: Proposal;
  sourceBuy: boolean;
};

export type BuyerContextRecord = {
  block: number;
  seed: number;
  phase: BuyerContextPhase;
  arm: BuyerContextArm;
  position: number;
  contextHash: string;
  promptHash: string;
  sourceBuy: boolean;
  proposal: Proposal;
  buy: boolean;
};

export type BuyerContextRate = { n: number; buy: number; buyRate: number };
export type BuyerContextContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number;
  values: Array<{ seed: number; delta: number }>;
};

export type BuyerContextReport = {
  study: "VBE-E-BUY-CXT-BUYER-CONTEXT-INJECTION";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-context-injection-protocol.md";
  model: string;
  sourceCorpus: { path: string; sha256: string; arm: "valid-visible"; selectedSeeds: number[] };
  cases: BuyerContextCase[];
  arms: BuyerContextArm[];
  records: BuyerContextRecord[];
  calls: number;
  completeBlocks: number;
  completeSeeds: number;
  byArm: Partial<Record<BuyerContextArm, BuyerContextRate>>;
  contrasts: {
    dynamicState: BuyerContextContrast | null;
    realMemory: BuyerContextContrast | null;
    envelopeUnderMemory: BuyerContextContrast | null;
    envelopeWithoutMemory: BuyerContextContrast | null;
    memoryUnderEnvelope: BuyerContextContrast | null;
    totalTransfer: BuyerContextContrast | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    sealedBaseline: boolean;
    onlineReplay: boolean;
    sourceAgreement: boolean;
    dynamicState: boolean;
    realMemory: boolean;
    envelopeUnderMemory: boolean;
    envelopeWithoutMemory: boolean;
    memoryUnderEnvelope: boolean;
    totalTransfer: boolean;
  };
  integrity: {
    expectedCalls: 150;
    retainedCalls: number;
    completeBlocks: number;
    completeSeeds: number;
    corpusHashMatched: boolean;
    casesValid: boolean;
    contextsMatched: boolean;
    promptsMatched: boolean;
    schemasValid: boolean;
    onlineReplayPromptsExact: boolean;
    positionBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "SEALED BASELINE NOT REPLICATED" | "ONLINE NULL NOT REPRODUCED" | "DYNAMIC STATE/HORIZON SUPPRESSOR" | "REAL K=4 MEMORY SUPPRESSOR" | "PUBLIC POPULATION ENVELOPE SUPPRESSOR" | "ENVELOPE × MEMORY INTERACTION" | "DISTRIBUTED CONTEXT SUPPRESSION" | "NO MATERIAL CONTEXT SUPPRESSOR LOCALIZED";
  caveat: string;
  generatedAt: string;
};

export function sha256BuyerContext(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buyerContextCorpusHash(): string {
  return sha256BuyerContext(readFileSync(BUYER_CONTEXT_SOURCE_PATH, "utf8"));
}

function memoryFromMeeting(meId: number, meeting: Meeting): MemoryItem {
  const isI = meeting.i === meId;
  const partnerId = isI ? meeting.j : meeting.i;
  const partnerType = isI ? meeting.jType : meeting.iType;
  const own = isI ? meeting.pi : meeting.pj;
  const partner = isI ? meeting.pj : meeting.pi;
  const gaveCheck = meeting.kind === "swap" || meeting.seller === meId;
  const gotCheck = meeting.kind === "swap" || meeting.buyer === meId;
  const gaveChits = meeting.kind === "chit-for-check" && meeting.buyer === meId ? 1 :
    meeting.kind === "gift" && meeting.seller === meId ? Math.max(0, Math.min(1, own.giveChits)) : 0;
  const gotChits = meeting.kind === "chit-for-check" && meeting.seller === meId ? 1 :
    meeting.kind === "gift" && meeting.buyer === meId ? Math.max(0, Math.min(1, partner.giveChits)) : 0;
  return { t: meeting.t, partnerId, partnerType, gaveCheck, gotCheck, gaveChits, gotChits, kind: meeting.kind };
}

function priorMeetings(result: RunResult, id: number, beforeRound: number): Meeting[] {
  return result.rounds
    .filter((round) => round.t < beforeRound)
    .flatMap((round) => round.meetings)
    .filter((meeting) => meeting.i === id || meeting.j === id)
    .sort((a, b) => a.t - b.t);
}

function preDecisionState(result: RunResult, id: number, t: number): AgentState {
  const current = result.rounds[t - 1]!;
  const previous = result.rounds[t - 2];
  const type = current.types[id]!;
  const history = priorMeetings(result, id, t).map((meeting) => memoryFromMeeting(id, meeting));
  return {
    id,
    type,
    checks: 1,
    chits: previous?.chits[id] ?? 0,
    score: (previous?.scores[id] ?? 0) + (type === "E" ? DEFAULT_PARAMS.R : 0),
    solved: type === "E",
    receivedFrom: null,
    memory: history.slice(-DEFAULT_PARAMS.K),
  };
}

function hardEasyIds(meeting: Meeting): { hardId: number; easyId: number } | null {
  if (meeting.iType === "H" && meeting.jType === "E") return { hardId: meeting.i, easyId: meeting.j };
  if (meeting.iType === "E" && meeting.jType === "H") return { hardId: meeting.j, easyId: meeting.i };
  return null;
}

function sourceHardProposal(meeting: Meeting): Proposal {
  return meeting.iType === "H" ? meeting.pi : meeting.pj;
}

function candidates(run: OnlineSourceRun, phase: BuyerContextPhase): Array<{ meeting: Meeting; hardId: number; easyId: number }> {
  const first = phase === "early" ? 5 : 11;
  const last = phase === "early" ? 10 : 16;
  return run.result.rounds
    .filter((round) => round.t >= first && round.t <= last)
    .flatMap((round) => round.meetings)
    .flatMap((meeting) => {
      const ids = hardEasyIds(meeting);
      return ids && meeting.hardHadChit === true && meeting.easyHadCheck === true ? [{ meeting, ...ids }] : [];
    })
    .sort((a, b) => a.meeting.t - b.meeting.t || a.hardId - b.hardId || a.easyId - b.easyId);
}

export function loadBuyerContextCases(): BuyerContextCase[] {
  const report = JSON.parse(readFileSync(BUYER_CONTEXT_SOURCE_PATH, "utf8")) as OnlineSourceReport;
  const runs = report.runs.filter((run) => run.arm === "valid-visible").sort((a, b) => a.seed - b.seed);
  const eligible = runs.filter((run) => candidates(run, "early").length > 0 && candidates(run, "late").length > 0).slice(0, 15);
  if (eligible.length !== 15) throw new Error(`expected 15 eligible source seeds, found ${eligible.length}`);
  const cases: BuyerContextCase[] = [];
  for (const run of eligible) {
    for (const phase of ["early", "late"] as const) {
      const chosen = candidates(run, phase)[0]!;
      const agent = preDecisionState(run.result, chosen.hardId, chosen.meeting.t);
      const partner = preDecisionState(run.result, chosen.easyId, chosen.meeting.t);
      const sourceProposal = sourceHardProposal(chosen.meeting);
      cases.push({
        block: cases.length + 1,
        seed: run.seed,
        phase,
        selectedRound: chosen.meeting.t,
        hardId: chosen.hardId,
        easyId: chosen.easyId,
        agent,
        partner,
        sourceProposal,
        sourceBuy: sourceProposal.giveChits === 1,
      });
    }
  }
  return cases;
}

const rotations = BUYER_CONTEXT_ARMS.map((_, shift) => [
  ...BUYER_CONTEXT_ARMS.slice(shift),
  ...BUYER_CONTEXT_ARMS.slice(0, shift),
]);
const ORDERS: readonly (readonly BuyerContextArm[])[] = [...rotations, ...rotations.map((order) => [...order].reverse())];

export function buyerContextOrder(block: number): readonly BuyerContextArm[] {
  if (!Number.isInteger(block) || block < 1 || block > 30) throw new Error(`invalid buyer-context block ${block}`);
  return ORDERS[(block - 1) % ORDERS.length]!;
}

function withoutMemory(agent: AgentState): AgentState {
  return { ...agent, memory: [] };
}

function standardAgent(item: BuyerContextCase): AgentState {
  return { id: item.hardId, type: "H", checks: 1, chits: 1, score: 6, solved: false, receivedFrom: null, memory: [] };
}

function standardPartner(item: BuyerContextCase): AgentState {
  return { id: item.easyId, type: "E", checks: 1, chits: 0, score: 6, solved: true, receivedFrom: null, memory: [] };
}

function currentBuyerNotice(me: AgentState, partner: AgentState, t: number, item: BuyerContextCase): string {
  const context = {
    caseId: `BUY-CXT-${String(item.block).padStart(2, "0")}`,
    state: {
      round: t,
      horizon: DEFAULT_PARAMS.T,
      role: "HARD",
      ownCheck: me.checks,
      marks: me.chits,
      partnerRole: "EASY",
      partnerCheck: partner.checks,
      score: me.score,
    },
    decisionSupport: {
      sourceId: "BUY-GATE-1",
      validatorStatus: "PASS",
      target: "CURRENT_HARD_BUYER_PROPOSAL",
      proposalNoTradeCost: 0,
      partnerCheckIncrement: 1.83,
      savedMarkOpportunityValue: 1.647,
      conditionalNetIfExecuted: 0.183,
      sellerExecutionProbability: 0.25,
      proposalExpectedNet: 0.04575,
      actionCompiler: null,
    },
  };
  return `SEALED BUYER-CAPABILITY DIAGNOSTIC. The following object applies only to this current Hard-buyer proposal. Its arithmetic is exact for this diagnostic. If no exchange executes, no mark moves and your score is unchanged. If you offer one mark and the seller executes, you receive the partner check and pay exactly one mark.\n${JSON.stringify(context)}\nNo action recommendation is supplied. Use the verified quantities to maximize your own expected score.`;
}

export function buyerContextPrompt(arm: BuyerContextArm, item: BuyerContextCase): string {
  if (arm === "standard-sealed") {
    const me = standardAgent(item), partner = standardPartner(item), t = 10;
    return meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", currentBuyerNotice(me, partner, t, item));
  }
  const realAgent = arm === "real-memory" || arm === "online-replay" ? item.agent : withoutMemory(item.agent);
  const notice = arm === "online-envelope" || arm === "online-replay"
    ? onlineSourceNotice("valid-visible", item.selectedRound)
    : currentBuyerNotice(realAgent, item.partner, item.selectedRound, item);
  return meetingPrompt(realAgent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", notice);
}

export function buyerContextCaseHash(item: BuyerContextCase): string {
  return sha256BuyerContext(JSON.stringify(item));
}

function validProposal(proposal: Proposal): boolean {
  return JSON.stringify(Object.keys(proposal).sort()) === JSON.stringify(["giveCheck", "giveChits", "requireChit"].sort())
    && typeof proposal.giveCheck === "boolean"
    && (proposal.giveChits === 0 || proposal.giveChits === 1)
    && typeof proposal.requireChit === "boolean";
}

function choose(n: number, k: number): number {
  let out = 1;
  for (let i = 1; i <= k; i++) out = out * (n - k + i) / i;
  return out;
}

function exactUpper(positive: number, negative: number): number {
  const n = positive + negative;
  if (!n) return 1;
  let p = 0;
  for (let k = positive; k <= n; k++) p += choose(n, k) * 0.5 ** n;
  return Math.min(1, p);
}

function rate(records: readonly BuyerContextRecord[], arm: BuyerContextArm): BuyerContextRate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function contrast(records: readonly BuyerContextRecord[], left: BuyerContextArm, right: BuyerContextArm, cases: readonly BuyerContextCase[]): BuyerContextContrast | null {
  const seeds = [...new Set(cases.map((item) => item.seed))].sort((a, b) => a - b);
  const values = seeds.map((seed) => {
    const seedCases = cases.filter((item) => item.seed === seed);
    const deltas = seedCases.map((item) => {
      const l = records.find((record) => record.block === item.block && record.arm === left);
      const r = records.find((record) => record.block === item.block && record.arm === right);
      return l && r ? Number(l.buy) - Number(r.buy) : null;
    });
    return deltas.every((value) => value !== null)
      ? { seed, delta: (deltas as number[]).reduce((sum, value) => sum + value, 0) / deltas.length }
      : null;
  }).filter((value): value is { seed: number; delta: number } => value !== null);
  if (!values.length) return null;
  const positive = values.filter((value) => value.delta > 0).length;
  const negative = values.filter((value) => value.delta < 0).length;
  return {
    n: values.length,
    mean: values.reduce((sum, value) => sum + value.delta, 0) / values.length,
    positive,
    negative,
    ties: values.length - positive - negative,
    exactUpperP: exactUpper(positive, negative),
    values,
  };
}

function orderIntegrity(cases: readonly BuyerContextCase[]): { positionBalanced: boolean; pairwisePrecedenceBalanced: boolean } {
  const positionBalanced = BUYER_CONTEXT_ARMS.every((arm) =>
    [0, 1, 2, 3, 4].every((position) => cases.filter((item) => buyerContextOrder(item.block)[position] === arm).length === 6),
  );
  const pairwisePrecedenceBalanced = BUYER_CONTEXT_ARMS.every((left, i) => BUYER_CONTEXT_ARMS.slice(i + 1).every((right) =>
    cases.filter((item) => buyerContextOrder(item.block).indexOf(left) < buyerContextOrder(item.block).indexOf(right)).length === 15,
  ));
  return { positionBalanced, pairwisePrecedenceBalanced };
}

function passes(effect: BuyerContextContrast | null): boolean {
  return Boolean(effect && effect.mean >= BUYER_CONTEXT_FLOORS.materialDrop && effect.exactUpperP <= BUYER_CONTEXT_FLOORS.alpha);
}

export function buyerContextVerdict(gates: BuyerContextReport["gates"]): BuyerContextReport["verdict"] {
  if (!gates.complete) return "INCOMPLETE";
  if (!gates.integrity) return "INVALID";
  if (!gates.sealedBaseline) return "SEALED BASELINE NOT REPLICATED";
  if (!gates.onlineReplay || !gates.sourceAgreement) return "ONLINE NULL NOT REPRODUCED";
  if (gates.dynamicState) return "DYNAMIC STATE/HORIZON SUPPRESSOR";
  if (gates.realMemory) return "REAL K=4 MEMORY SUPPRESSOR";
  if (gates.envelopeUnderMemory && gates.envelopeWithoutMemory) return "PUBLIC POPULATION ENVELOPE SUPPRESSOR";
  if (gates.envelopeUnderMemory) return "ENVELOPE × MEMORY INTERACTION";
  if (gates.totalTransfer) return "DISTRIBUTED CONTEXT SUPPRESSION";
  return "NO MATERIAL CONTEXT SUPPRESSOR LOCALIZED";
}

export function buildBuyerContextReport(rawRecords: readonly BuyerContextRecord[], model: string): BuyerContextReport {
  const cases = loadBuyerContextCases();
  const seen = new Set<string>();
  for (const record of rawRecords) {
    const item = cases[record.block - 1];
    if (!item || !BUYER_CONTEXT_ARMS.includes(record.arm)) throw new Error(`unknown buyer-context record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-context record ${key}`);
    seen.add(key);
    if (record.seed !== item.seed || record.phase !== item.phase || record.sourceBuy !== item.sourceBuy) throw new Error(`source coding mismatch ${key}`);
    if (record.position !== buyerContextOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
  }
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = cases.filter((item) => BUYER_CONTEXT_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const seeds = [...new Set(cases.map((item) => item.seed))].sort((a, b) => a - b);
  const completeSeeds = seeds.filter((seed) => {
    const seedCases = cases.filter((item) => item.seed === seed);
    return seedCases.length === 2 && seedCases.every((item) => BUYER_CONTEXT_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm)));
  }).length;
  const byArm: BuyerContextReport["byArm"] = {};
  for (const arm of BUYER_CONTEXT_ARMS) byArm[arm] = rate(records, arm);
  const contrasts = {
    dynamicState: contrast(records, "standard-sealed", "real-state", cases),
    realMemory: contrast(records, "real-state", "real-memory", cases),
    envelopeUnderMemory: contrast(records, "real-memory", "online-replay", cases),
    envelopeWithoutMemory: contrast(records, "real-state", "online-envelope", cases),
    memoryUnderEnvelope: contrast(records, "online-envelope", "online-replay", cases),
    totalTransfer: contrast(records, "standard-sealed", "online-replay", cases),
  };
  const order = orderIntegrity(cases);
  const contextsMatched = records.every((record) => record.contextHash === buyerContextCaseHash(cases[record.block - 1]!));
  const promptsMatched = records.every((record) => record.promptHash === sha256BuyerContext(buyerContextPrompt(record.arm, cases[record.block - 1]!)));
  const onlineReplayPromptsExact = cases.every((item) => buyerContextPrompt("online-replay", item) === meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", onlineSourceNotice("valid-visible", item.selectedRound)));
  const casesValid = cases.length === 30 && seeds.length === 15 && seeds.every((seed) => {
    const rows = cases.filter((item) => item.seed === seed);
    return rows.length === 2 && new Set(rows.map((item) => item.phase)).size === 2 && rows.every((item) => item.agent.type === "H" && item.partner.type === "E" && item.agent.chits >= 1 && item.partner.checks >= 1 && !item.sourceBuy);
  });
  const integrity = {
    expectedCalls: 150 as const,
    retainedCalls: records.length,
    completeBlocks,
    completeSeeds,
    corpusHashMatched: buyerContextCorpusHash() === BUYER_CONTEXT_SOURCE_SHA256,
    casesValid,
    contextsMatched,
    promptsMatched,
    schemasValid: records.every((record) => validProposal(record.proposal)),
    onlineReplayPromptsExact,
    ...order,
  };
  const complete = records.length === 150 && completeBlocks === 30 && completeSeeds === 15;
  const integrityPass = complete && Object.entries(integrity).every(([key, value]) => key === "expectedCalls" || key === "retainedCalls" || key === "completeBlocks" || key === "completeSeeds" ? true : value === true);
  const replayRows = records.filter((record) => record.arm === "online-replay");
  const agreement = replayRows.length ? replayRows.filter((record) => record.buy === record.sourceBuy).length / replayRows.length : 0;
  const gates = {
    complete,
    integrity: integrityPass,
    sealedBaseline: complete && byArm["standard-sealed"]!.buyRate >= BUYER_CONTEXT_FLOORS.sealedRate,
    onlineReplay: complete && byArm["online-replay"]!.buyRate <= BUYER_CONTEXT_FLOORS.onlineRateCeiling,
    sourceAgreement: complete && agreement >= BUYER_CONTEXT_FLOORS.sourceAgreement,
    dynamicState: complete && passes(contrasts.dynamicState),
    realMemory: complete && passes(contrasts.realMemory),
    envelopeUnderMemory: complete && passes(contrasts.envelopeUnderMemory),
    envelopeWithoutMemory: complete && passes(contrasts.envelopeWithoutMemory),
    memoryUnderEnvelope: complete && passes(contrasts.memoryUnderEnvelope),
    totalTransfer: complete && passes(contrasts.totalTransfer),
  };
  return {
    study: "VBE-E-BUY-CXT-BUYER-CONTEXT-INJECTION",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-context-injection-protocol.md",
    model,
    sourceCorpus: { path: BUYER_CONTEXT_SOURCE_PATH, sha256: buyerContextCorpusHash(), arm: "valid-visible", selectedSeeds: seeds },
    cases,
    arms: [...BUYER_CONTEXT_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    completeSeeds,
    byArm,
    contrasts,
    gates,
    integrity,
    verdict: buyerContextVerdict(gates),
    caveat: "A sealed shadow replay on one frozen valid-visible corpus identifies prompt/workload sensitivity, not a new online policy effect, downstream trade, welfare, belief, privacy, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
