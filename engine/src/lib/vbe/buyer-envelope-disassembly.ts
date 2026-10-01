import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import { onlineSourceNotice, type OnlineSourceReport, type OnlineSourceRun } from "./online-source-quarantine.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import type { AgentState, Meeting, MemoryItem, Proposal, RunResult } from "./types.ts";

export const BUYER_ENVELOPE_SOURCE_PATH = "src/data/online-source-quarantine.json";
export const BUYER_ENVELOPE_SOURCE_SHA256 = "4756d053a7533fffb4be5acf1e04f9c2caab3b4ca9bbb50dca89ff02ab0f32ff";
export const BUYER_ENVELOPE_ARMS = [
  "narrow-anchor",
  "public-hard-current-full",
  "public-dual-current-full",
  "public-dual-current-partial",
  "public-dual-population-full",
  "original-envelope",
] as const;
export type BuyerEnvelopeArm = (typeof BUYER_ENVELOPE_ARMS)[number];
export type BuyerEnvelopePhase = "early" | "late";

export const BUYER_ENVELOPE_FLOORS = {
  narrowRate: 0.75,
  originalRateCeiling: 0.15,
  sourceAgreement: 0.85,
  componentMres: 0.40,
  coreRepairMres: 0.50,
  alpha: 0.025,
} as const;

export type BuyerEnvelopeCase = {
  block: number;
  seed: number;
  phase: BuyerEnvelopePhase;
  selectedRound: number;
  hardId: number;
  easyId: number;
  agent: AgentState;
  partner: AgentState;
  sourceProposal: Proposal;
  sourceBuy: boolean;
};

export type BuyerEnvelopeRecord = {
  block: number;
  seed: number;
  phase: BuyerEnvelopePhase;
  arm: BuyerEnvelopeArm;
  position: number;
  contextHash: string;
  promptHash: string;
  sourceBuy: boolean;
  proposal: Proposal;
  buy: boolean;
};

export type BuyerEnvelopeRate = { n: number; buy: number; buyRate: number };
export type BuyerEnvelopeContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number;
  values: Array<{ seed: number; delta: number }>;
};

export type BuyerEnvelopeReport = {
  study: "VBE-E-BUY-ENV-D-BUYER-ENVELOPE-DISASSEMBLY";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-envelope-disassembly-protocol.md";
  model: string;
  sourceCorpus: { path: string; sha256: string; arm: "valid-visible"; selectedSeeds: number[] };
  excludedPriorContexts: number;
  cases: BuyerEnvelopeCase[];
  arms: BuyerEnvelopeArm[];
  records: BuyerEnvelopeRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<BuyerEnvelopeArm, BuyerEnvelopeRate>>;
  contrasts: {
    wrapperBridge: BuyerEnvelopeContrast | null;
    nestingBridge: BuyerEnvelopeContrast | null;
    targetMain: BuyerEnvelopeContrast | null;
    materializationMain: BuyerEnvelopeContrast | null;
    coreRepair: BuyerEnvelopeContrast | null;
    targetUnderFull: BuyerEnvelopeContrast | null;
    targetUnderPartial: BuyerEnvelopeContrast | null;
    materializationUnderCurrent: BuyerEnvelopeContrast | null;
    materializationUnderPopulation: BuyerEnvelopeContrast | null;
    targetMaterializationInteraction: BuyerEnvelopeContrast | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    narrowBaseline: boolean;
    originalEnvelope: boolean;
    sourceAgreement: boolean;
    wrapperBridge: boolean;
    nestingBridge: boolean;
    targetMain: boolean;
    materializationMain: boolean;
    coreRepair: boolean;
  };
  integrity: {
    expectedCalls: 108;
    retainedCalls: number;
    completeBlocks: number;
    uniqueSeeds: number;
    corpusHashMatched: boolean;
    casesValid: boolean;
    priorContextsExcluded: boolean;
    phaseBalanced: boolean;
    contextsMatched: boolean;
    promptsMatched: boolean;
    schemasValid: boolean;
    originalPromptsExact: boolean;
    factorialAxesValid: boolean;
    positionBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "NARROW BASELINE NOT REPLICATED" | "ONLINE ENVELOPE NULL NOT REPRODUCED" | "PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR" | "DUAL-ROLE NESTING SUPPRESSOR" | "TARGET AND PROPOSAL MATERIALIZATION JOINT SUPPRESSORS" | "POPULATION TARGET SUPPRESSOR" | "PROPOSAL-LEVEL MATERIALIZATION SUPPRESSOR" | "TARGET × MATERIALIZATION INTERACTION OR DISTRIBUTED CORE" | "NO ENVELOPE COMPONENT LOCALIZED";
  caveat: string;
  generatedAt: string;
};

export function sha256BuyerEnvelope(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buyerEnvelopeCorpusHash(): string {
  return sha256BuyerEnvelope(readFileSync(BUYER_ENVELOPE_SOURCE_PATH, "utf8"));
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

type Candidate = { meeting: Meeting; hardId: number; easyId: number; phase: BuyerEnvelopePhase };

function unusedCandidates(run: OnlineSourceRun, used: ReadonlySet<string>): Candidate[] {
  return run.result.rounds
    .filter((round) => round.t >= 5 && round.t <= 16)
    .flatMap((round) => round.meetings)
    .flatMap((meeting) => {
      const ids = hardEasyIds(meeting);
      if (!ids || meeting.hardHadChit !== true || meeting.easyHadCheck !== true) return [];
      const key = `${run.seed}|${meeting.t}|${ids.hardId}|${ids.easyId}`;
      return used.has(key) ? [] : [{ meeting, ...ids, phase: meeting.t <= 10 ? "early" as const : "late" as const }];
    })
    .sort((a, b) => a.meeting.t - b.meeting.t || a.hardId - b.hardId || a.easyId - b.easyId);
}

export function loadBuyerEnvelopeCases(): BuyerEnvelopeCase[] {
  const report = JSON.parse(readFileSync(BUYER_ENVELOPE_SOURCE_PATH, "utf8")) as OnlineSourceReport;
  const used = new Set(loadBuyerContextCases().map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const runs = report.runs.filter((run) => run.arm === "valid-visible").sort((a, b) => a.seed - b.seed);
  let early = 0, late = 0;
  return runs.map((run, index) => {
    const available = unusedCandidates(run, used);
    const earlyRows = available.filter((item) => item.phase === "early");
    const lateRows = available.filter((item) => item.phase === "late");
    if (!available.length) throw new Error(`no unused buyer-envelope candidate for seed ${run.seed}`);
    let phase: BuyerEnvelopePhase;
    if (!earlyRows.length) phase = "late";
    else if (!lateRows.length) phase = "early";
    else phase = early <= late ? "early" : "late";
    if (phase === "early") early++; else late++;
    const chosen = (phase === "early" ? earlyRows : lateRows)[0]!;
    const agent = preDecisionState(run.result, chosen.hardId, chosen.meeting.t);
    const partner = preDecisionState(run.result, chosen.easyId, chosen.meeting.t);
    const sourceProposal = sourceHardProposal(chosen.meeting);
    return {
      block: index + 1,
      seed: run.seed,
      phase,
      selectedRound: chosen.meeting.t,
      hardId: chosen.hardId,
      easyId: chosen.easyId,
      agent,
      partner,
      sourceProposal,
      sourceBuy: sourceProposal.giveChits === 1,
    };
  });
}

const WILLIAMS_BASE = [0, 1, 5, 2, 4, 3] as const;
const WILLIAMS_ORDERS: readonly (readonly BuyerEnvelopeArm[])[] = BUYER_ENVELOPE_ARMS.map((_, shift) =>
  WILLIAMS_BASE.map((index) => BUYER_ENVELOPE_ARMS[(index + shift) % BUYER_ENVELOPE_ARMS.length]!),
);

export function buyerEnvelopeOrder(block: number): readonly BuyerEnvelopeArm[] {
  if (!Number.isInteger(block) || block < 1 || block > 18) throw new Error(`invalid buyer-envelope block ${block}`);
  return WILLIAMS_ORDERS[(block - 1) % WILLIAMS_ORDERS.length]!;
}

type Target = "CURRENT_HARD_BUYER_PROPOSAL" | "CURRENT_VBE_POPULATION_ROUNDS_5_16";
type HardPayload = {
  proposalNoTradeCost: 0;
  partnerCheckIncrement: 1.83;
  savedMarkOpportunityValue: 1.647;
  expectedNetIfExecuted: 0.183;
  sellerExecutionProbability?: 0.25;
  proposalExpectedNet?: 0.04575;
};
type EnvelopePayload = {
  target: Target;
  easySeller?: {
    futureAcceptanceProbability: 0.9;
    acquiredMarkExpectedValue: 1.647;
    keepCheckValue: 0.5;
    expectedNetIfExecuted: 1.147;
  };
  hardBuyer: HardPayload;
};

function hardPayload(full: boolean): HardPayload {
  const base: HardPayload = {
    proposalNoTradeCost: 0,
    partnerCheckIncrement: 1.83,
    savedMarkOpportunityValue: 1.647,
    expectedNetIfExecuted: 0.183,
  };
  return full ? { ...base, sellerExecutionProbability: 0.25, proposalExpectedNet: 0.04575 } : base;
}

export function buyerEnvelopePayload(arm: Exclude<BuyerEnvelopeArm, "narrow-anchor" | "original-envelope">): EnvelopePayload {
  const target: Target = arm === "public-dual-population-full"
    ? "CURRENT_VBE_POPULATION_ROUNDS_5_16"
    : "CURRENT_HARD_BUYER_PROPOSAL";
  const full = arm !== "public-dual-current-partial";
  const dual = arm !== "public-hard-current-full";
  return {
    target,
    ...(dual ? { easySeller: { futureAcceptanceProbability: 0.9, acquiredMarkExpectedValue: 1.647, keepCheckValue: 0.5, expectedNetIfExecuted: 1.147 } } : {}),
    hardBuyer: hardPayload(full),
  };
}

function narrowNotice(item: BuyerEnvelopeCase): string {
  const context = {
    caseId: `BUY-ENV-D-${String(item.block).padStart(2, "0")}`,
    state: {
      round: item.selectedRound,
      horizon: DEFAULT_PARAMS.T,
      role: "HARD",
      ownCheck: item.agent.checks,
      marks: item.agent.chits,
      partnerRole: "EASY",
      partnerCheck: item.partner.checks,
      score: item.agent.score,
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

function publicNotice(arm: Exclude<BuyerEnvelopeArm, "narrow-anchor" | "original-envelope">): string {
  const payload = buyerEnvelopePayload(arm);
  const envelope = {
    sourceId: "OSQ-1",
    validatorStatus: "PASS",
    temporalScope: "CURRENT",
    populationScope: "MATCH",
    numericPayloadStatus: "VISIBLE",
    payloadSha256: sha256BuyerEnvelope(JSON.stringify(payload)),
    numericPayload: payload,
  };
  return `PUBLIC RUNTIME SOURCE ENVELOPE. Every agent receives this same envelope during the treatment window.
SOURCE CONTRACT: numericPayload is admissible for the current decision if and only if validatorStatus=PASS, temporalScope=CURRENT, and populationScope=MATCH. If any condition fails, ignore every numericPayload field and use only the economy rules, current state, and your own meeting memory. REMOVED_BEFORE_INVOCATION means the failed payload is unavailable to this model call.
${JSON.stringify(envelope)}
This object reports typed decision-support quantities and issues no action command. Optimize your own score under the source contract.`;
}

export function buyerEnvelopePrompt(arm: BuyerEnvelopeArm, item: BuyerEnvelopeCase): string {
  const notice = arm === "narrow-anchor" ? narrowNotice(item)
    : arm === "original-envelope" ? onlineSourceNotice("valid-visible", item.selectedRound)
    : publicNotice(arm);
  return meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", notice);
}

export function buyerEnvelopeCaseHash(item: BuyerEnvelopeCase): string {
  return sha256BuyerEnvelope(JSON.stringify(item));
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

function rate(records: readonly BuyerEnvelopeRecord[], arm: BuyerEnvelopeArm): BuyerEnvelopeRate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function linearContrast(
  records: readonly BuyerEnvelopeRecord[],
  cases: readonly BuyerEnvelopeCase[],
  weights: Partial<Record<BuyerEnvelopeArm, number>>,
): BuyerEnvelopeContrast | null {
  const values = cases.map((item) => {
    let delta = 0;
    for (const [arm, weight] of Object.entries(weights) as Array<[BuyerEnvelopeArm, number]>) {
      const row = records.find((record) => record.block === item.block && record.arm === arm);
      if (!row) return null;
      delta += weight * Number(row.buy);
    }
    return { seed: item.seed, delta };
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

function pairContrast(records: readonly BuyerEnvelopeRecord[], cases: readonly BuyerEnvelopeCase[], left: BuyerEnvelopeArm, right: BuyerEnvelopeArm): BuyerEnvelopeContrast | null {
  return linearContrast(records, cases, { [left]: 1, [right]: -1 });
}

function orderIntegrity(cases: readonly BuyerEnvelopeCase[]): { positionBalanced: boolean; pairwisePrecedenceBalanced: boolean } {
  const positionBalanced = BUYER_ENVELOPE_ARMS.every((arm) =>
    [0, 1, 2, 3, 4, 5].every((position) => cases.filter((item) => buyerEnvelopeOrder(item.block)[position] === arm).length === 3),
  );
  const pairwisePrecedenceBalanced = BUYER_ENVELOPE_ARMS.every((left, i) => BUYER_ENVELOPE_ARMS.slice(i + 1).every((right) =>
    cases.filter((item) => buyerEnvelopeOrder(item.block).indexOf(left) < buyerEnvelopeOrder(item.block).indexOf(right)).length === 9,
  ));
  return { positionBalanced, pairwisePrecedenceBalanced };
}

function passes(effect: BuyerEnvelopeContrast | null, mres = BUYER_ENVELOPE_FLOORS.componentMres): boolean {
  return Boolean(effect && effect.mean >= mres && effect.exactUpperP <= BUYER_ENVELOPE_FLOORS.alpha);
}

export function buyerEnvelopeVerdict(gates: BuyerEnvelopeReport["gates"]): BuyerEnvelopeReport["verdict"] {
  if (!gates.complete) return "INCOMPLETE";
  if (!gates.integrity) return "INVALID";
  if (!gates.narrowBaseline) return "NARROW BASELINE NOT REPLICATED";
  if (!gates.originalEnvelope || !gates.sourceAgreement) return "ONLINE ENVELOPE NULL NOT REPRODUCED";
  if (gates.wrapperBridge) return "PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR";
  if (gates.nestingBridge) return "DUAL-ROLE NESTING SUPPRESSOR";
  if (gates.targetMain && gates.materializationMain) return "TARGET AND PROPOSAL MATERIALIZATION JOINT SUPPRESSORS";
  if (gates.targetMain) return "POPULATION TARGET SUPPRESSOR";
  if (gates.materializationMain) return "PROPOSAL-LEVEL MATERIALIZATION SUPPRESSOR";
  if (gates.coreRepair) return "TARGET × MATERIALIZATION INTERACTION OR DISTRIBUTED CORE";
  return "NO ENVELOPE COMPONENT LOCALIZED";
}

export function buildBuyerEnvelopeReport(rawRecords: readonly BuyerEnvelopeRecord[], model: string): BuyerEnvelopeReport {
  const cases = loadBuyerEnvelopeCases();
  const prior = loadBuyerContextCases();
  const priorKeys = new Set(prior.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const seen = new Set<string>();
  for (const record of rawRecords) {
    const item = cases[record.block - 1];
    if (!item || !BUYER_ENVELOPE_ARMS.includes(record.arm)) throw new Error(`unknown buyer-envelope record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-envelope record ${key}`);
    seen.add(key);
    if (record.seed !== item.seed || record.phase !== item.phase || record.sourceBuy !== item.sourceBuy) throw new Error(`source coding mismatch ${key}`);
    if (record.position !== buyerEnvelopeOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
  }
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = cases.filter((item) => BUYER_ENVELOPE_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const byArm: BuyerEnvelopeReport["byArm"] = {};
  for (const arm of BUYER_ENVELOPE_ARMS) byArm[arm] = rate(records, arm);
  const contrasts = {
    wrapperBridge: pairContrast(records, cases, "narrow-anchor", "public-hard-current-full"),
    nestingBridge: pairContrast(records, cases, "public-hard-current-full", "public-dual-current-full"),
    targetMain: linearContrast(records, cases, { "public-dual-current-full": 0.5, "public-dual-current-partial": 0.5, "public-dual-population-full": -0.5, "original-envelope": -0.5 }),
    materializationMain: linearContrast(records, cases, { "public-dual-current-full": 0.5, "public-dual-population-full": 0.5, "public-dual-current-partial": -0.5, "original-envelope": -0.5 }),
    coreRepair: pairContrast(records, cases, "public-dual-current-full", "original-envelope"),
    targetUnderFull: pairContrast(records, cases, "public-dual-current-full", "public-dual-population-full"),
    targetUnderPartial: pairContrast(records, cases, "public-dual-current-partial", "original-envelope"),
    materializationUnderCurrent: pairContrast(records, cases, "public-dual-current-full", "public-dual-current-partial"),
    materializationUnderPopulation: pairContrast(records, cases, "public-dual-population-full", "original-envelope"),
    targetMaterializationInteraction: linearContrast(records, cases, { "public-dual-current-full": 1, "public-dual-current-partial": -1, "public-dual-population-full": -1, "original-envelope": 1 }),
  };
  const order = orderIntegrity(cases);
  const contextsMatched = records.every((record) => record.contextHash === buyerEnvelopeCaseHash(cases[record.block - 1]!));
  const promptsMatched = records.every((record) => record.promptHash === sha256BuyerEnvelope(buyerEnvelopePrompt(record.arm, cases[record.block - 1]!)));
  const originalPromptsExact = cases.every((item) => buyerEnvelopePrompt("original-envelope", item) === meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", onlineSourceNotice("valid-visible", item.selectedRound)));
  const coreArms = ["public-dual-current-full", "public-dual-current-partial", "public-dual-population-full"] as const;
  const factorialAxesValid = coreArms.every((arm) => {
    const payload = buyerEnvelopePayload(arm);
    return payload.easySeller?.futureAcceptanceProbability === 0.9 && payload.hardBuyer.expectedNetIfExecuted === 0.183;
  });
  const currentKeys = new Set(cases.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const seeds = [...new Set(cases.map((item) => item.seed))];
  const casesValid = cases.length === 18 && seeds.length === 18 && cases.every((item) => item.agent.type === "H" && item.partner.type === "E" && item.agent.chits >= 1 && item.partner.checks >= 1 && !item.sourceBuy);
  const integrity = {
    expectedCalls: 108 as const,
    retainedCalls: records.length,
    completeBlocks,
    uniqueSeeds: seeds.length,
    corpusHashMatched: buyerEnvelopeCorpusHash() === BUYER_ENVELOPE_SOURCE_SHA256,
    casesValid,
    priorContextsExcluded: [...currentKeys].every((key) => !priorKeys.has(key)),
    phaseBalanced: cases.filter((item) => item.phase === "early").length === 9 && cases.filter((item) => item.phase === "late").length === 9,
    contextsMatched,
    promptsMatched,
    schemasValid: records.every((record) => validProposal(record.proposal)),
    originalPromptsExact,
    factorialAxesValid,
    ...order,
  };
  const complete = records.length === 108 && completeBlocks === 18;
  const integrityPass = complete && Object.entries(integrity).every(([key, value]) => ["expectedCalls", "retainedCalls", "completeBlocks", "uniqueSeeds"].includes(key) ? true : value === true);
  const originalRows = records.filter((record) => record.arm === "original-envelope");
  const agreement = originalRows.length ? originalRows.filter((record) => record.buy === record.sourceBuy).length / originalRows.length : 0;
  const gates = {
    complete,
    integrity: integrityPass,
    narrowBaseline: complete && byArm["narrow-anchor"]!.buyRate >= BUYER_ENVELOPE_FLOORS.narrowRate,
    originalEnvelope: complete && byArm["original-envelope"]!.buyRate <= BUYER_ENVELOPE_FLOORS.originalRateCeiling,
    sourceAgreement: complete && agreement >= BUYER_ENVELOPE_FLOORS.sourceAgreement,
    wrapperBridge: complete && passes(contrasts.wrapperBridge),
    nestingBridge: complete && passes(contrasts.nestingBridge),
    targetMain: complete && passes(contrasts.targetMain),
    materializationMain: complete && passes(contrasts.materializationMain),
    coreRepair: complete && passes(contrasts.coreRepair, BUYER_ENVELOPE_FLOORS.coreRepairMres),
  };
  return {
    study: "VBE-E-BUY-ENV-D-BUYER-ENVELOPE-DISASSEMBLY",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-envelope-disassembly-protocol.md",
    model,
    sourceCorpus: { path: BUYER_ENVELOPE_SOURCE_PATH, sha256: buyerEnvelopeCorpusHash(), arm: "valid-visible", selectedSeeds: seeds.sort((a, b) => a - b) },
    excludedPriorContexts: prior.length,
    cases,
    arms: [...BUYER_ENVELOPE_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    contrasts,
    gates,
    integrity,
    verdict: buyerEnvelopeVerdict(gates),
    caveat: "A new-context sealed replay on one frozen corpus identifies prompt-component sensitivity, not a new online policy effect, internal attention mechanism, downstream trade, welfare, belief, privacy, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
