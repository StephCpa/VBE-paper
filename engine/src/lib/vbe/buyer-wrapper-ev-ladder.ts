import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import {
  buyerEnvelopePayload,
  buyerEnvelopePrompt,
  loadBuyerEnvelopeCases,
  sha256BuyerEnvelope,
  type BuyerEnvelopeCase,
} from "./buyer-envelope-disassembly.ts";
import { loadBuyerWrapperCases } from "./buyer-wrapper-disassembly.ts";
import { type OnlineSourceReport, type OnlineSourceRun } from "./online-source-quarantine.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, Meeting, MemoryItem, Proposal, RunResult } from "./types.ts";

export const BUYER_EV_SOURCE_PATH = "src/data/online-source-quarantine.json";
export const BUYER_EV_SOURCE_SHA256 = "4756d053a7533fffb4be5acf1e04f9c2caab3b4ca9bbb50dca89ff02ab0f32ff";

export const BUYER_EV_ARMS = [
  "weak-narrow-anchor",
  "weak-public-hard-anchor",
  "medium-narrow",
  "medium-public-hard",
  "strong-narrow",
  "strong-public-hard",
] as const;
export type BuyerEvArm = (typeof BUYER_EV_ARMS)[number];
export type BuyerEvTier = "weak" | "medium" | "strong";
export type BuyerEvInterface = "narrow" | "public-hard";
export type BuyerEvPhase = "early" | "late";

export const BUYER_EV_TIERS = {
  weak: {
    savedMarkOpportunityValue: 1.647,
    expectedNetIfExecuted: 0.183,
    sellerExecutionProbability: 0.25,
    proposalExpectedNet: 0.04575,
  },
  medium: {
    savedMarkOpportunityValue: 0.5,
    expectedNetIfExecuted: 1.33,
    sellerExecutionProbability: 0.25,
    proposalExpectedNet: 0.3325,
  },
  strong: {
    savedMarkOpportunityValue: 0.5,
    expectedNetIfExecuted: 1.33,
    sellerExecutionProbability: 1,
    proposalExpectedNet: 1.33,
  },
} as const;

export const BUYER_EV_FLOORS = {
  narrowRate: 0.75,
  weakPublicCeiling: 0.15,
  strongPublicCeiling: 0.25,
  primaryMres: 0.50,
  immaterialGapCeiling: 0.25,
  partialResponse: 0.25,
  alpha: 0.025,
} as const;

export type BuyerEvCase = BuyerEnvelopeCase;

export type BuyerEvRecord = {
  block: number;
  seed: number;
  phase: BuyerEvPhase;
  arm: BuyerEvArm;
  position: number;
  contextHash: string;
  promptHash: string;
  sourceBuy: boolean;
  proposal: Proposal;
  buy: boolean;
};

export type BuyerEvRate = { n: number; buy: number; buyRate: number };
export type BuyerEvContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number;
  values: Array<{ seed: number; delta: number }>;
};

export type BuyerEvLinkStatus = "PENDING" | "WEAK LINK REPLICATED" | "WEAK LINK DRIFTED";
export type BuyerEvStepStatus = "PENDING" | "MARGIN STEP SUPPORTED" | "MARGIN STEP NOT SUPPORTED"
  | "MARGIN STEP NOT INTERPRETABLE" | "CERTAINTY STEP SUPPORTED" | "CERTAINTY STEP NOT SUPPORTED"
  | "CERTAINTY STEP NOT INTERPRETABLE";
export type BuyerEvVerdict = "INCOMPLETE"
  | "INVALID"
  | "TIER MANIPULATION NOT VALIDATED"
  | "WRAPPER GAP PERSISTS AT STRONG EV"
  | "NEAR-INDIFFERENCE INTERFACE THRESHOLD SHIFT"
  | "PARTIAL EV DOSE RESPONSE WITH RESIDUAL WRAPPER GAP"
  | "DESCRIPTIVE EV RECOVERY — LINK OR THRESHOLD GATE NOT MET"
  | "SINGLE-AXIS EV RESPONSE WITHOUT STRONG-ENDPOINT RECOVERY"
  | "NO ECONOMIC ROBUSTNESS LOCALIZED";

export type BuyerEvReport = {
  study: "VBE-E-BUY-EV-L-BUYER-WRAPPER-ECONOMIC-SENSITIVITY";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-wrapper-ev-ladder-protocol.md";
  model: string;
  sourceCorpus: { path: string; sha256: string; arm: "valid-visible"; selectedSeeds: number[] };
  excludedPriorContexts: 60;
  unusedCandidateMeetings: 35;
  overlappingWrapperSeeds: number[];
  newRelativeToWrapperSeeds: number[];
  cases: BuyerEvCase[];
  tiers: typeof BUYER_EV_TIERS;
  arms: BuyerEvArm[];
  records: BuyerEvRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<BuyerEvArm, BuyerEvRate>>;
  contrasts: {
    weakWrapperGap: BuyerEvContrast | null;
    mediumWrapperGap: BuyerEvContrast | null;
    strongWrapperGap: BuyerEvContrast | null;
    publicMarginStep: BuyerEvContrast | null;
    publicCertaintyStep: BuyerEvContrast | null;
    publicTotalDose: BuyerEvContrast | null;
    narrowMarginStep: BuyerEvContrast | null;
    narrowCertaintyStep: BuyerEvContrast | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    narrowFloorHeld: boolean;
    narrowStepMonotone: boolean;
    tierManipulationValid: boolean;
    weakLink: boolean;
    strongRobustness: boolean;
    thresholdShift: boolean;
    marginStep: boolean;
    certaintyStep: boolean;
    partialResidual: boolean;
    descriptiveRecovery: boolean;
    singleAxisResponse: boolean;
  };
  linkStatus: BuyerEvLinkStatus;
  stepStatus: { margin: BuyerEvStepStatus; certainty: BuyerEvStepStatus };
  integrity: {
    expectedCalls: 72;
    retainedCalls: number;
    completeBlocks: number;
    uniqueSeeds: number;
    corpusHashMatched: boolean;
    casesValid: boolean;
    priorContextsExcluded: boolean;
    unusedCandidateCountMatched: boolean;
    phaseBalanced: boolean;
    seedOverlapDisclosed: boolean;
    contextsMatched: boolean;
    promptsMatched: boolean;
    schemasValid: boolean;
    weakAnchorsExact: boolean;
    tierArithmeticValid: boolean;
    axisSeparationValid: boolean;
    positionBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: BuyerEvVerdict;
  caveat: string;
  generatedAt: string;
};

export function sha256BuyerEv(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buyerEvCorpusHash(): string {
  return sha256BuyerEv(readFileSync(BUYER_EV_SOURCE_PATH, "utf8"));
}

function memoryFromMeeting(meId: number, meeting: Meeting): MemoryItem {
  const isI = meeting.i === meId;
  const partnerId = isI ? meeting.j : meeting.i;
  const partnerType = isI ? meeting.jType : meeting.iType;
  const own = isI ? meeting.pi : meeting.pj;
  const partner = isI ? meeting.pj : meeting.pi;
  const gaveCheck = meeting.kind === "swap" || meeting.seller === meId;
  const gotCheck = meeting.kind === "swap" || meeting.buyer === meId;
  const gaveChits = meeting.kind === "chit-for-check" && meeting.buyer === meId ? 1
    : meeting.kind === "gift" && meeting.seller === meId ? Math.max(0, Math.min(1, own.giveChits)) : 0;
  const gotChits = meeting.kind === "chit-for-check" && meeting.seller === meId ? 1
    : meeting.kind === "gift" && meeting.buyer === meId ? Math.max(0, Math.min(1, partner.giveChits)) : 0;
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

type Candidate = {
  run: OnlineSourceRun;
  meeting: Meeting;
  hardId: number;
  easyId: number;
  phase: BuyerEvPhase;
};

function contextKey(seed: number, round: number, hardId: number, easyId: number): string {
  return `${seed}|${round}|${hardId}|${easyId}`;
}

function priorContextKeys(): Set<string> {
  return new Set([...loadBuyerContextCases(), ...loadBuyerEnvelopeCases(), ...loadBuyerWrapperCases()]
    .map((item) => contextKey(item.seed, item.selectedRound, item.hardId, item.easyId)));
}

function unusedCandidates(): Candidate[] {
  const report = JSON.parse(readFileSync(BUYER_EV_SOURCE_PATH, "utf8")) as OnlineSourceReport;
  const used = priorContextKeys();
  return report.runs
    .filter((run) => run.arm === "valid-visible")
    .sort((a, b) => a.seed - b.seed)
    .flatMap((run) => run.result.rounds
      .filter((round) => round.t >= 5 && round.t <= 16)
      .flatMap((round) => round.meetings)
      .flatMap((meeting) => {
        const ids = hardEasyIds(meeting);
        if (!ids || meeting.hardHadChit !== true || meeting.easyHadCheck !== true) return [];
        if (used.has(contextKey(run.seed, meeting.t, ids.hardId, ids.easyId))) return [];
        return [{
          run,
          meeting,
          ...ids,
          phase: meeting.t <= 10 ? "early" as const : "late" as const,
        }];
      })
      .sort((a, b) => a.meeting.t - b.meeting.t || a.hardId - b.hardId || a.easyId - b.easyId));
}

export function buyerEvUnusedCandidateKeys(): string[] {
  return unusedCandidates().map((item) => contextKey(item.run.seed, item.meeting.t, item.hardId, item.easyId));
}

export function loadBuyerEvCases(): BuyerEvCase[] {
  const candidates = unusedCandidates();
  const seeds = [...new Set(candidates.map((item) => item.run.seed))].sort((a, b) => a - b);
  const selected: BuyerEvCase[] = [];
  let early = 0;
  let late = 0;
  for (const seed of seeds) {
    const available = candidates.filter((item) => item.run.seed === seed);
    const earlyRows = available.filter((item) => item.phase === "early");
    const lateRows = available.filter((item) => item.phase === "late");
    let phase: BuyerEvPhase;
    if (!earlyRows.length) phase = "late";
    else if (!lateRows.length) phase = "early";
    else phase = early <= late ? "early" : "late";
    if (phase === "early") early++; else late++;
    const chosen = (phase === "early" ? earlyRows : lateRows)[0]!;
    const agent = preDecisionState(chosen.run.result, chosen.hardId, chosen.meeting.t);
    const partner = preDecisionState(chosen.run.result, chosen.easyId, chosen.meeting.t);
    const sourceProposal = sourceHardProposal(chosen.meeting);
    selected.push({
      block: selected.length + 1,
      seed,
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
  if (selected.length !== 12) throw new Error(`expected 12 buyer-EV seeds, found ${selected.length}`);
  return selected;
}

const WILLIAMS_BASE = [0, 1, 5, 2, 4, 3] as const;
const WILLIAMS_ORDERS: readonly (readonly BuyerEvArm[])[] = BUYER_EV_ARMS.map((_, shift) =>
  WILLIAMS_BASE.map((index) => BUYER_EV_ARMS[(index + shift) % BUYER_EV_ARMS.length]!),
);

export function buyerEvOrder(block: number): readonly BuyerEvArm[] {
  if (!Number.isInteger(block) || block < 1 || block > 12) throw new Error(`invalid buyer-EV block ${block}`);
  return WILLIAMS_ORDERS[(block - 1) % WILLIAMS_ORDERS.length]!;
}

export function buyerEvTier(arm: BuyerEvArm): BuyerEvTier {
  return arm.startsWith("weak-") ? "weak" : arm.startsWith("medium-") ? "medium" : "strong";
}

export function buyerEvInterface(arm: BuyerEvArm): BuyerEvInterface {
  return arm.includes("public-hard") ? "public-hard" : "narrow";
}

function replaceExactlyOnce(text: string, from: string, to: string): string {
  const pieces = text.split(from);
  if (pieces.length !== 2) throw new Error(`expected exactly one prompt field ${from}, found ${pieces.length - 1}`);
  return `${pieces[0]}${to}${pieces[1]}`;
}

function replaceEconomicFields(text: string, tier: Exclude<BuyerEvTier, "weak">, narrow: boolean): string {
  const values = BUYER_EV_TIERS[tier];
  let out = replaceExactlyOnce(text, '"savedMarkOpportunityValue":1.647', `"savedMarkOpportunityValue":${values.savedMarkOpportunityValue}`);
  const netKey = narrow ? "conditionalNetIfExecuted" : "expectedNetIfExecuted";
  out = replaceExactlyOnce(out, `"${netKey}":0.183`, `"${netKey}":${values.expectedNetIfExecuted}`);
  out = replaceExactlyOnce(out, '"sellerExecutionProbability":0.25', `"sellerExecutionProbability":${values.sellerExecutionProbability}`);
  out = replaceExactlyOnce(out, '"proposalExpectedNet":0.04575', `"proposalExpectedNet":${values.proposalExpectedNet}`);
  return out;
}

export function buyerEvPrompt(arm: BuyerEvArm, item: BuyerEvCase): string {
  const tier = buyerEvTier(arm);
  const interfaceKind = buyerEvInterface(arm);
  const base = buyerEnvelopePrompt(interfaceKind === "narrow" ? "narrow-anchor" : "public-hard-current-full", item);
  if (tier === "weak") return base;
  let out = replaceEconomicFields(base, tier, interfaceKind === "narrow");
  if (interfaceKind === "public-hard") {
    const basePayload = buyerEnvelopePayload("public-hard-current-full");
    const nextPayload = {
      ...basePayload,
      hardBuyer: {
        ...basePayload.hardBuyer,
        ...BUYER_EV_TIERS[tier],
      },
    };
    out = replaceExactlyOnce(
      out,
      `"payloadSha256":"${sha256BuyerEnvelope(JSON.stringify(basePayload))}"`,
      `"payloadSha256":"${sha256BuyerEnvelope(JSON.stringify(nextPayload))}"`,
    );
  }
  return out;
}

export function buyerEvCaseHash(item: BuyerEvCase): string {
  return sha256BuyerEv(JSON.stringify(item));
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

function rate(records: readonly BuyerEvRecord[], arm: BuyerEvArm): BuyerEvRate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function pairContrast(
  records: readonly BuyerEvRecord[],
  cases: readonly BuyerEvCase[],
  left: BuyerEvArm,
  right: BuyerEvArm,
): BuyerEvContrast | null {
  const values = cases.map((item) => {
    const l = records.find((record) => record.block === item.block && record.arm === left);
    const r = records.find((record) => record.block === item.block && record.arm === right);
    return l && r ? { seed: item.seed, delta: Number(l.buy) - Number(r.buy) } : null;
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

function passes(effect: BuyerEvContrast | null, mres = BUYER_EV_FLOORS.primaryMres): boolean {
  return Boolean(effect && effect.mean >= mres && effect.exactUpperP <= BUYER_EV_FLOORS.alpha);
}

function orderIntegrity(cases: readonly BuyerEvCase[]): { positionBalanced: boolean; pairwisePrecedenceBalanced: boolean } {
  const positionBalanced = BUYER_EV_ARMS.every((arm) =>
    [0, 1, 2, 3, 4, 5].every((position) => cases.filter((item) => buyerEvOrder(item.block)[position] === arm).length === 2),
  );
  const pairwisePrecedenceBalanced = BUYER_EV_ARMS.every((left, i) => BUYER_EV_ARMS.slice(i + 1).every((right) =>
    cases.filter((item) => buyerEvOrder(item.block).indexOf(left) < buyerEvOrder(item.block).indexOf(right)).length === 6,
  ));
  return { positionBalanced, pairwisePrecedenceBalanced };
}

export function buyerEvVerdict(input: {
  complete: boolean;
  integrity: boolean;
  tierManipulationValid: boolean;
  strongRobustness: boolean;
  thresholdShift: boolean;
  singleAxisResponse: boolean;
  publicTotalDose: number;
  strongWrapperGap: number;
}): BuyerEvVerdict {
  if (!input.complete) return "INCOMPLETE";
  if (!input.integrity) return "INVALID";
  if (!input.tierManipulationValid) return "TIER MANIPULATION NOT VALIDATED";
  if (input.strongRobustness) return "WRAPPER GAP PERSISTS AT STRONG EV";
  if (input.thresholdShift) return "NEAR-INDIFFERENCE INTERFACE THRESHOLD SHIFT";
  if (input.publicTotalDose >= BUYER_EV_FLOORS.partialResponse && input.strongWrapperGap >= BUYER_EV_FLOORS.partialResponse) {
    return "PARTIAL EV DOSE RESPONSE WITH RESIDUAL WRAPPER GAP";
  }
  if (input.publicTotalDose >= BUYER_EV_FLOORS.partialResponse) return "DESCRIPTIVE EV RECOVERY — LINK OR THRESHOLD GATE NOT MET";
  if (input.singleAxisResponse) return "SINGLE-AXIS EV RESPONSE WITHOUT STRONG-ENDPOINT RECOVERY";
  return "NO ECONOMIC ROBUSTNESS LOCALIZED";
}

export function buildBuyerEvReport(rawRecords: readonly BuyerEvRecord[], model: string): BuyerEvReport {
  const cases = loadBuyerEvCases();
  const prior = [...loadBuyerContextCases(), ...loadBuyerEnvelopeCases(), ...loadBuyerWrapperCases()];
  if (prior.length !== 60) throw new Error(`expected 60 prior contexts, found ${prior.length}`);
  const priorKeys = priorContextKeys();
  const seen = new Set<string>();
  for (const record of rawRecords) {
    const item = cases[record.block - 1];
    if (!item || !BUYER_EV_ARMS.includes(record.arm)) throw new Error(`unknown buyer-EV record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-EV record ${key}`);
    seen.add(key);
    if (record.seed !== item.seed || record.phase !== item.phase || record.sourceBuy !== item.sourceBuy) throw new Error(`source coding mismatch ${key}`);
    if (record.position !== buyerEvOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
  }
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = cases.filter((item) => BUYER_EV_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const byArm: BuyerEvReport["byArm"] = {};
  for (const arm of BUYER_EV_ARMS) byArm[arm] = rate(records, arm);
  const contrasts = {
    weakWrapperGap: pairContrast(records, cases, "weak-narrow-anchor", "weak-public-hard-anchor"),
    mediumWrapperGap: pairContrast(records, cases, "medium-narrow", "medium-public-hard"),
    strongWrapperGap: pairContrast(records, cases, "strong-narrow", "strong-public-hard"),
    publicMarginStep: pairContrast(records, cases, "medium-public-hard", "weak-public-hard-anchor"),
    publicCertaintyStep: pairContrast(records, cases, "strong-public-hard", "medium-public-hard"),
    publicTotalDose: pairContrast(records, cases, "strong-public-hard", "weak-public-hard-anchor"),
    narrowMarginStep: pairContrast(records, cases, "medium-narrow", "weak-narrow-anchor"),
    narrowCertaintyStep: pairContrast(records, cases, "strong-narrow", "medium-narrow"),
  };
  const currentKeys = new Set(cases.map((item) => contextKey(item.seed, item.selectedRound, item.hardId, item.easyId)));
  const selectedSeeds = cases.map((item) => item.seed);
  const wrapperSeeds = new Set(loadBuyerWrapperCases().map((item) => item.seed));
  const overlappingWrapperSeeds = selectedSeeds.filter((seed) => wrapperSeeds.has(seed));
  const newRelativeToWrapperSeeds = selectedSeeds.filter((seed) => !wrapperSeeds.has(seed));
  const tierArithmeticValid = Object.values(BUYER_EV_TIERS).every((tier) =>
    Math.abs(1.83 - tier.savedMarkOpportunityValue - tier.expectedNetIfExecuted) < 1e-12
    && Math.abs(tier.sellerExecutionProbability * tier.expectedNetIfExecuted - tier.proposalExpectedNet) < 1e-12,
  );
  const axisSeparationValid = BUYER_EV_TIERS.weak.sellerExecutionProbability === BUYER_EV_TIERS.medium.sellerExecutionProbability
    && BUYER_EV_TIERS.medium.savedMarkOpportunityValue === BUYER_EV_TIERS.strong.savedMarkOpportunityValue
    && BUYER_EV_TIERS.medium.expectedNetIfExecuted === BUYER_EV_TIERS.strong.expectedNetIfExecuted
    && BUYER_EV_TIERS.weak.expectedNetIfExecuted <= BUYER_EV_TIERS.medium.expectedNetIfExecuted
    && BUYER_EV_TIERS.medium.expectedNetIfExecuted <= BUYER_EV_TIERS.strong.expectedNetIfExecuted
    && BUYER_EV_TIERS.weak.proposalExpectedNet <= BUYER_EV_TIERS.medium.proposalExpectedNet
    && BUYER_EV_TIERS.medium.proposalExpectedNet <= BUYER_EV_TIERS.strong.proposalExpectedNet;
  const order = orderIntegrity(cases);
  const contextsMatched = records.every((record) => record.contextHash === buyerEvCaseHash(cases[record.block - 1]!));
  const promptsMatched = records.every((record) => record.promptHash === sha256BuyerEv(buyerEvPrompt(record.arm, cases[record.block - 1]!)));
  const weakAnchorsExact = cases.every((item) =>
    buyerEvPrompt("weak-narrow-anchor", item) === buyerEnvelopePrompt("narrow-anchor", item)
    && buyerEvPrompt("weak-public-hard-anchor", item) === buyerEnvelopePrompt("public-hard-current-full", item),
  );
  const casesValid = cases.length === 12
    && new Set(selectedSeeds).size === 12
    && cases.every((item) => item.agent.type === "H" && item.partner.type === "E" && item.agent.chits >= 1 && item.partner.checks >= 1 && !item.sourceBuy);
  const integrity = {
    expectedCalls: 72 as const,
    retainedCalls: records.length,
    completeBlocks,
    uniqueSeeds: new Set(selectedSeeds).size,
    corpusHashMatched: buyerEvCorpusHash() === BUYER_EV_SOURCE_SHA256,
    casesValid,
    priorContextsExcluded: [...currentKeys].every((key) => !priorKeys.has(key)),
    unusedCandidateCountMatched: buyerEvUnusedCandidateKeys().length === 35,
    phaseBalanced: cases.filter((item) => item.phase === "early").length === 6 && cases.filter((item) => item.phase === "late").length === 6,
    seedOverlapDisclosed: overlappingWrapperSeeds.length === 8 && newRelativeToWrapperSeeds.length === 4,
    contextsMatched,
    promptsMatched,
    schemasValid: records.every((record) => validProposal(record.proposal)),
    weakAnchorsExact,
    tierArithmeticValid,
    axisSeparationValid,
    ...order,
  };
  const complete = records.length === 72 && completeBlocks === 12;
  const integrityPass = complete && Object.entries(integrity).every(([key, value]) =>
    ["expectedCalls", "retainedCalls", "completeBlocks", "uniqueSeeds"].includes(key) ? true : value === true,
  );
  const weakLink = complete
    && byArm["weak-narrow-anchor"]!.buyRate >= BUYER_EV_FLOORS.narrowRate
    && byArm["weak-public-hard-anchor"]!.buyRate <= BUYER_EV_FLOORS.weakPublicCeiling
    && passes(contrasts.weakWrapperGap);
  const narrowFloorHeld = complete && ["weak-narrow-anchor", "medium-narrow", "strong-narrow"].every((arm) =>
    byArm[arm as BuyerEvArm]!.buyRate >= BUYER_EV_FLOORS.narrowRate,
  );
  const narrowStepMonotone = complete
    && (contrasts.narrowMarginStep?.mean ?? Number.NEGATIVE_INFINITY) >= -BUYER_EV_FLOORS.partialResponse
    && (contrasts.narrowCertaintyStep?.mean ?? Number.NEGATIVE_INFINITY) >= -BUYER_EV_FLOORS.partialResponse;
  const tierManipulationValid = narrowFloorHeld && narrowStepMonotone;
  const strongRobustness = tierManipulationValid
    && byArm["strong-public-hard"]!.buyRate <= BUYER_EV_FLOORS.strongPublicCeiling
    && passes(contrasts.strongWrapperGap);
  const thresholdShift = tierManipulationValid
    && weakLink
    && passes(contrasts.publicTotalDose)
    && (contrasts.strongWrapperGap?.mean ?? Number.POSITIVE_INFINITY) < BUYER_EV_FLOORS.immaterialGapCeiling;
  const marginStep = tierManipulationValid
    && passes(contrasts.publicMarginStep);
  const certaintyStep = tierManipulationValid
    && passes(contrasts.publicCertaintyStep);
  const publicTotalDose = contrasts.publicTotalDose?.mean ?? 0;
  const strongWrapperGap = contrasts.strongWrapperGap?.mean ?? 0;
  const gates = {
    complete,
    integrity: integrityPass,
    narrowFloorHeld,
    narrowStepMonotone,
    tierManipulationValid,
    weakLink,
    strongRobustness,
    thresholdShift,
    marginStep,
    certaintyStep,
    partialResidual: tierManipulationValid && publicTotalDose >= BUYER_EV_FLOORS.partialResponse && strongWrapperGap >= BUYER_EV_FLOORS.partialResponse,
    descriptiveRecovery: tierManipulationValid && publicTotalDose >= BUYER_EV_FLOORS.partialResponse,
    singleAxisResponse: marginStep || certaintyStep,
  };
  return {
    study: "VBE-E-BUY-EV-L-BUYER-WRAPPER-ECONOMIC-SENSITIVITY",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-wrapper-ev-ladder-protocol.md",
    model,
    sourceCorpus: { path: BUYER_EV_SOURCE_PATH, sha256: buyerEvCorpusHash(), arm: "valid-visible", selectedSeeds: [...selectedSeeds] },
    excludedPriorContexts: 60,
    unusedCandidateMeetings: buyerEvUnusedCandidateKeys().length,
    overlappingWrapperSeeds,
    newRelativeToWrapperSeeds,
    cases,
    tiers: BUYER_EV_TIERS,
    arms: [...BUYER_EV_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    contrasts,
    gates,
    linkStatus: complete && integrityPass ? (weakLink ? "WEAK LINK REPLICATED" : "WEAK LINK DRIFTED") : "PENDING",
    stepStatus: {
      margin: !complete || !integrityPass ? "PENDING" : !tierManipulationValid ? "MARGIN STEP NOT INTERPRETABLE" : marginStep ? "MARGIN STEP SUPPORTED" : "MARGIN STEP NOT SUPPORTED",
      certainty: !complete || !integrityPass ? "PENDING" : !tierManipulationValid ? "CERTAINTY STEP NOT INTERPRETABLE" : certaintyStep ? "CERTAINTY STEP SUPPORTED" : "CERTAINTY STEP NOT SUPPORTED",
    },
    integrity,
    verdict: buyerEvVerdict({ complete, integrity: integrityPass, tierManipulationValid, strongRobustness, thresholdShift, singleAxisResponse: marginStep || certaintyStep, publicTotalDose, strongWrapperGap }),
    caveat: "Fresh contexts from a frozen corpus, with 8/12 seeds overlapping E-BUY-WRAP-D, identify stated-field sensitivity within one later service window. Weak-link drift cannot separate context heterogeneity from provider drift; the ladder does not establish true opportunity cost, action correctness, online trade, welfare, belief, privacy, source truth, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
