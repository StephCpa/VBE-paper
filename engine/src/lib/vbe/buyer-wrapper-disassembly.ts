import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBuyerContextCases } from "./buyer-context-injection.ts";
import {
  buyerEnvelopePrompt,
  loadBuyerEnvelopeCases,
  type BuyerEnvelopeCase,
} from "./buyer-envelope-disassembly.ts";
import { type OnlineSourceReport, type OnlineSourceRun } from "./online-source-quarantine.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import type { AgentState, Meeting, MemoryItem, Proposal, RunResult } from "./types.ts";

export const BUYER_WRAPPER_SOURCE_PATH = "src/data/online-source-quarantine.json";
export const BUYER_WRAPPER_SOURCE_SHA256 = "4756d053a7533fffb4be5acf1e04f9c2caab3b4ca9bbb50dca89ff02ab0f32ff";
export const BUYER_WRAPPER_ARMS = [
  "exact-narrow-anchor",
  "harmonized-sealed-flat",
  "harmonized-sealed-nested",
  "harmonized-public-flat",
  "harmonized-public-nested",
  "exact-public-hard-anchor",
] as const;
export type BuyerWrapperArm = (typeof BUYER_WRAPPER_ARMS)[number];
export type BuyerWrapperCoreArm = Exclude<BuyerWrapperArm, "exact-narrow-anchor" | "exact-public-hard-anchor">;
export type BuyerWrapperPhase = "early" | "late";

export const BUYER_WRAPPER_FLOORS = {
  narrowRate: 0.75,
  publicRateCeiling: 0.15,
  harmonizedBaselineRate: 0.75,
  anchorGapMres: 0.50,
  componentMres: 0.40,
  simpleSlopeMres: 0.50,
  inactiveSlopeCeiling: 0.25,
  interactionMres: 0.50,
  repairRate: 0.75,
  repairMres: 0.50,
  alpha: 0.025,
} as const;

export type BuyerWrapperCase = {
  block: number;
  seed: number;
  phase: BuyerWrapperPhase;
  selectedRound: number;
  hardId: number;
  easyId: number;
  agent: AgentState;
  partner: AgentState;
  sourceProposal: Proposal;
  sourceBuy: boolean;
};

export type BuyerWrapperRecord = {
  block: number;
  seed: number;
  phase: BuyerWrapperPhase;
  arm: BuyerWrapperArm;
  position: number;
  contextHash: string;
  promptHash: string;
  sourceBuy: boolean;
  proposal: Proposal;
  buy: boolean;
};

export type BuyerWrapperRate = { n: number; buy: number; buyRate: number };
export type BuyerWrapperContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number;
  values: Array<{ seed: number; delta: number }>;
};

export type BuyerWrapperReport = {
  study: "VBE-E-BUY-WRAP-D-BUYER-WRAPPER-REPRESENTATION-DISASSEMBLY";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-wrapper-disassembly-protocol.md";
  model: string;
  sourceCorpus: { path: string; sha256: string; arm: "valid-visible"; selectedSeeds: number[] };
  excludedPriorContexts: number;
  cases: BuyerWrapperCase[];
  arms: BuyerWrapperArm[];
  records: BuyerWrapperRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<BuyerWrapperArm, BuyerWrapperRate>>;
  contrasts: {
    anchorGap: BuyerWrapperContrast | null;
    framingMain: BuyerWrapperContrast | null;
    representationMain: BuyerWrapperContrast | null;
    framingUnderFlat: BuyerWrapperContrast | null;
    framingUnderNested: BuyerWrapperContrast | null;
    representationUnderSealed: BuyerWrapperContrast | null;
    representationUnderPublic: BuyerWrapperContrast | null;
    framingRepresentationInteraction: BuyerWrapperContrast | null;
    residualRepair: BuyerWrapperContrast | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    narrowAnchor: boolean;
    publicAnchor: boolean;
    anchorGap: boolean;
    harmonizedBaseline: boolean;
    framingMain: boolean;
    representationMain: boolean;
    interaction: boolean;
    residualRepair: boolean;
  };
  integrity: {
    expectedCalls: 72;
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
    exactAnchorsExact: boolean;
    factorialAxesValid: boolean;
    positionBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict:
    | "INCOMPLETE"
    | "INVALID"
    | "NARROW ANCHOR NOT REPLICATED"
    | "PUBLIC-HARD NULL NOT REPLICATED"
    | "HARMONIZED BASELINE NOT ACTION-CAPABLE"
    | "FRAMING AND REPRESENTATION JOINT SUPPRESSORS"
    | "PUBLIC RUNTIME FRAMING SUPPRESSOR"
    | "NESTED REPRESENTATION SUPPRESSOR"
    | "FRAMING × REPRESENTATION INTERACTION"
    | "HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE"
    | "NO WRAPPER COMPONENT LOCALIZED";
  caveat: string;
  generatedAt: string;
};

export function sha256BuyerWrapper(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buyerWrapperCorpusHash(): string {
  return sha256BuyerWrapper(readFileSync(BUYER_WRAPPER_SOURCE_PATH, "utf8"));
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

type Candidate = { meeting: Meeting; hardId: number; easyId: number; phase: BuyerWrapperPhase };

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

export function loadBuyerWrapperCases(): BuyerWrapperCase[] {
  const report = JSON.parse(readFileSync(BUYER_WRAPPER_SOURCE_PATH, "utf8")) as OnlineSourceReport;
  const prior = [...loadBuyerContextCases(), ...loadBuyerEnvelopeCases()];
  const used = new Set(prior.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const runs = report.runs.filter((run) => run.arm === "valid-visible").sort((a, b) => a.seed - b.seed);
  const selected: BuyerWrapperCase[] = [];
  let early = 0;
  let late = 0;
  for (const run of runs) {
    if (selected.length === 12) break;
    const available = unusedCandidates(run, used);
    if (!available.length) continue;
    const earlyRows = available.filter((item) => item.phase === "early");
    const lateRows = available.filter((item) => item.phase === "late");
    let phase: BuyerWrapperPhase;
    if (!earlyRows.length) phase = "late";
    else if (!lateRows.length) phase = "early";
    else phase = early <= late ? "early" : "late";
    if (phase === "early") early++; else late++;
    const chosen = (phase === "early" ? earlyRows : lateRows)[0]!;
    const agent = preDecisionState(run.result, chosen.hardId, chosen.meeting.t);
    const partner = preDecisionState(run.result, chosen.easyId, chosen.meeting.t);
    const sourceProposal = sourceHardProposal(chosen.meeting);
    selected.push({
      block: selected.length + 1,
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
  if (selected.length !== 12) throw new Error(`expected 12 unused buyer-wrapper contexts, found ${selected.length}`);
  return selected;
}

const WILLIAMS_BASE = [0, 1, 5, 2, 4, 3] as const;
const WILLIAMS_ORDERS: readonly (readonly BuyerWrapperArm[])[] = BUYER_WRAPPER_ARMS.map((_, shift) =>
  WILLIAMS_BASE.map((index) => BUYER_WRAPPER_ARMS[(index + shift) % BUYER_WRAPPER_ARMS.length]!),
);

export function buyerWrapperOrder(block: number): readonly BuyerWrapperArm[] {
  if (!Number.isInteger(block) || block < 1 || block > 12) throw new Error(`invalid buyer-wrapper block ${block}`);
  return WILLIAMS_ORDERS[(block - 1) % WILLIAMS_ORDERS.length]!;
}

export type BuyerWrapperFields = {
  target: "CURRENT_HARD_BUYER_PROPOSAL";
  proposalNoTradeCost: 0;
  partnerCheckIncrement: 1.83;
  savedMarkOpportunityValue: 1.647;
  expectedNetIfExecuted: 0.183;
  sellerExecutionProbability: 0.25;
  proposalExpectedNet: 0.04575;
  actionCompiler: null;
};

export type BuyerWrapperObject = {
  caseId: string;
  sourceId: "BUY-WRAP-1";
  validatorStatus: "PASS";
  deliveryScope: "SEALED_CURRENT_CALL" | "PUBLIC_RUNTIME";
  decisionData: BuyerWrapperFields | { hardBuyer: BuyerWrapperFields };
};

function buyerWrapperFields(): BuyerWrapperFields {
  return {
    target: "CURRENT_HARD_BUYER_PROPOSAL",
    proposalNoTradeCost: 0,
    partnerCheckIncrement: 1.83,
    savedMarkOpportunityValue: 1.647,
    expectedNetIfExecuted: 0.183,
    sellerExecutionProbability: 0.25,
    proposalExpectedNet: 0.04575,
    actionCompiler: null,
  };
}

export function buyerWrapperObject(arm: BuyerWrapperCoreArm, item: BuyerWrapperCase): BuyerWrapperObject {
  const deliveryScope = arm.includes("sealed") ? "SEALED_CURRENT_CALL" as const : "PUBLIC_RUNTIME" as const;
  const fields = buyerWrapperFields();
  const decisionData = arm.includes("nested") ? { hardBuyer: fields } : fields;
  return {
    caseId: `BUY-WRAP-D-${String(item.block).padStart(2, "0")}`,
    sourceId: "BUY-WRAP-1",
    validatorStatus: "PASS",
    deliveryScope,
    decisionData,
  };
}

function harmonizedNotice(arm: BuyerWrapperCoreArm, item: BuyerWrapperCase): string {
  return `CURRENT HARD-BUYER DECISION SUPPORT. The following object applies to this current Hard-buyer proposal. Its delivery scope is declared by deliveryScope, and its arithmetic is exact for this diagnostic. If no exchange executes, no mark moves and your score is unchanged. If you offer one mark and the seller executes, you receive the partner check and pay exactly one mark.
${JSON.stringify(buyerWrapperObject(arm, item))}
No action recommendation is supplied. Use the verified quantities to maximize your own expected score.`;
}

function asEnvelopeCase(item: BuyerWrapperCase): BuyerEnvelopeCase {
  return item;
}

export function buyerWrapperPrompt(arm: BuyerWrapperArm, item: BuyerWrapperCase): string {
  if (arm === "exact-narrow-anchor") return buyerEnvelopePrompt("narrow-anchor", asEnvelopeCase(item));
  if (arm === "exact-public-hard-anchor") return buyerEnvelopePrompt("public-hard-current-full", asEnvelopeCase(item));
  return meetingPrompt(item.agent, item.partner, item.selectedRound, DEFAULT_PARAMS, "label", harmonizedNotice(arm, item));
}

export function buyerWrapperCaseHash(item: BuyerWrapperCase): string {
  return sha256BuyerWrapper(JSON.stringify(item));
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

function rate(records: readonly BuyerWrapperRecord[], arm: BuyerWrapperArm): BuyerWrapperRate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function linearContrast(
  records: readonly BuyerWrapperRecord[],
  cases: readonly BuyerWrapperCase[],
  weights: Partial<Record<BuyerWrapperArm, number>>,
): BuyerWrapperContrast | null {
  const values = cases.map((item) => {
    let delta = 0;
    for (const [arm, weight] of Object.entries(weights) as Array<[BuyerWrapperArm, number]>) {
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

function pairContrast(records: readonly BuyerWrapperRecord[], cases: readonly BuyerWrapperCase[], left: BuyerWrapperArm, right: BuyerWrapperArm): BuyerWrapperContrast | null {
  return linearContrast(records, cases, { [left]: 1, [right]: -1 });
}

function orderIntegrity(cases: readonly BuyerWrapperCase[]): { positionBalanced: boolean; pairwisePrecedenceBalanced: boolean } {
  const positionBalanced = BUYER_WRAPPER_ARMS.every((arm) =>
    [0, 1, 2, 3, 4, 5].every((position) => cases.filter((item) => buyerWrapperOrder(item.block)[position] === arm).length === 2),
  );
  const pairwisePrecedenceBalanced = BUYER_WRAPPER_ARMS.every((left, i) => BUYER_WRAPPER_ARMS.slice(i + 1).every((right) =>
    cases.filter((item) => buyerWrapperOrder(item.block).indexOf(left) < buyerWrapperOrder(item.block).indexOf(right)).length === 6,
  ));
  return { positionBalanced, pairwisePrecedenceBalanced };
}

function passes(effect: BuyerWrapperContrast | null, mres: number): boolean {
  return Boolean(effect && effect.mean >= mres && effect.exactUpperP <= BUYER_WRAPPER_FLOORS.alpha);
}

function interactionPass(
  first: BuyerWrapperContrast | null,
  second: BuyerWrapperContrast | null,
): boolean {
  if (!first || !second) return false;
  const oneActive = passes(first, BUYER_WRAPPER_FLOORS.simpleSlopeMres)
    && second.mean < BUYER_WRAPPER_FLOORS.inactiveSlopeCeiling
    && Math.abs(first.mean - second.mean) >= BUYER_WRAPPER_FLOORS.interactionMres;
  const otherActive = passes(second, BUYER_WRAPPER_FLOORS.simpleSlopeMres)
    && first.mean < BUYER_WRAPPER_FLOORS.inactiveSlopeCeiling
    && Math.abs(first.mean - second.mean) >= BUYER_WRAPPER_FLOORS.interactionMres;
  return oneActive || otherActive;
}

export function buyerWrapperVerdict(gates: BuyerWrapperReport["gates"]): BuyerWrapperReport["verdict"] {
  if (!gates.complete) return "INCOMPLETE";
  if (!gates.integrity) return "INVALID";
  if (!gates.narrowAnchor) return "NARROW ANCHOR NOT REPLICATED";
  if (!gates.publicAnchor || !gates.anchorGap) return "PUBLIC-HARD NULL NOT REPLICATED";
  if (!gates.harmonizedBaseline) return "HARMONIZED BASELINE NOT ACTION-CAPABLE";
  if (gates.framingMain && gates.representationMain) return "FRAMING AND REPRESENTATION JOINT SUPPRESSORS";
  if (gates.framingMain) return "PUBLIC RUNTIME FRAMING SUPPRESSOR";
  if (gates.representationMain) return "NESTED REPRESENTATION SUPPRESSOR";
  if (gates.interaction) return "FRAMING × REPRESENTATION INTERACTION";
  if (gates.residualRepair) return "HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE";
  return "NO WRAPPER COMPONENT LOCALIZED";
}

export function buildBuyerWrapperReport(rawRecords: readonly BuyerWrapperRecord[], model: string): BuyerWrapperReport {
  const cases = loadBuyerWrapperCases();
  const prior = [...loadBuyerContextCases(), ...loadBuyerEnvelopeCases()];
  const priorKeys = new Set(prior.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const seen = new Set<string>();
  for (const record of rawRecords) {
    const item = cases[record.block - 1];
    if (!item || !BUYER_WRAPPER_ARMS.includes(record.arm)) throw new Error(`unknown buyer-wrapper record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-wrapper record ${key}`);
    seen.add(key);
    if (record.seed !== item.seed || record.phase !== item.phase || record.sourceBuy !== item.sourceBuy) throw new Error(`source coding mismatch ${key}`);
    if (record.position !== buyerWrapperOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
  }
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = cases.filter((item) => BUYER_WRAPPER_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const byArm: BuyerWrapperReport["byArm"] = {};
  for (const arm of BUYER_WRAPPER_ARMS) byArm[arm] = rate(records, arm);
  const contrasts = {
    anchorGap: pairContrast(records, cases, "exact-narrow-anchor", "exact-public-hard-anchor"),
    framingMain: linearContrast(records, cases, {
      "harmonized-sealed-flat": 0.5,
      "harmonized-sealed-nested": 0.5,
      "harmonized-public-flat": -0.5,
      "harmonized-public-nested": -0.5,
    }),
    representationMain: linearContrast(records, cases, {
      "harmonized-sealed-flat": 0.5,
      "harmonized-public-flat": 0.5,
      "harmonized-sealed-nested": -0.5,
      "harmonized-public-nested": -0.5,
    }),
    framingUnderFlat: pairContrast(records, cases, "harmonized-sealed-flat", "harmonized-public-flat"),
    framingUnderNested: pairContrast(records, cases, "harmonized-sealed-nested", "harmonized-public-nested"),
    representationUnderSealed: pairContrast(records, cases, "harmonized-sealed-flat", "harmonized-sealed-nested"),
    representationUnderPublic: pairContrast(records, cases, "harmonized-public-flat", "harmonized-public-nested"),
    framingRepresentationInteraction: linearContrast(records, cases, {
      "harmonized-sealed-flat": 1,
      "harmonized-public-flat": -1,
      "harmonized-sealed-nested": -1,
      "harmonized-public-nested": 1,
    }),
    residualRepair: pairContrast(records, cases, "harmonized-public-nested", "exact-public-hard-anchor"),
  };
  const order = orderIntegrity(cases);
  const contextsMatched = records.every((record) => record.contextHash === buyerWrapperCaseHash(cases[record.block - 1]!));
  const promptsMatched = records.every((record) => record.promptHash === sha256BuyerWrapper(buyerWrapperPrompt(record.arm, cases[record.block - 1]!)));
  const exactAnchorsExact = cases.every((item) =>
    buyerWrapperPrompt("exact-narrow-anchor", item) === buyerEnvelopePrompt("narrow-anchor", asEnvelopeCase(item))
      && buyerWrapperPrompt("exact-public-hard-anchor", item) === buyerEnvelopePrompt("public-hard-current-full", asEnvelopeCase(item)),
  );
  const coreArms = BUYER_WRAPPER_ARMS.filter((arm): arm is BuyerWrapperCoreArm => arm.startsWith("harmonized-"));
  const canonicalFields = buyerWrapperFields();
  const factorialAxesValid = coreArms.every((arm) => {
    const object = buyerWrapperObject(arm, cases[0]!);
    const fields = "hardBuyer" in object.decisionData ? object.decisionData.hardBuyer : object.decisionData;
    return JSON.stringify(fields) === JSON.stringify(canonicalFields)
      && object.deliveryScope === (arm.includes("sealed") ? "SEALED_CURRENT_CALL" : "PUBLIC_RUNTIME")
      && ("hardBuyer" in object.decisionData) === arm.includes("nested");
  });
  const currentKeys = new Set(cases.map((item) => `${item.seed}|${item.selectedRound}|${item.hardId}|${item.easyId}`));
  const seeds = [...new Set(cases.map((item) => item.seed))];
  const casesValid = cases.length === 12 && seeds.length === 12 && cases.every((item) =>
    item.agent.type === "H" && item.partner.type === "E" && item.agent.chits >= 1 && item.partner.checks >= 1 && !item.sourceBuy,
  );
  const integrity = {
    expectedCalls: 72 as const,
    retainedCalls: records.length,
    completeBlocks,
    uniqueSeeds: seeds.length,
    corpusHashMatched: buyerWrapperCorpusHash() === BUYER_WRAPPER_SOURCE_SHA256,
    casesValid,
    priorContextsExcluded: [...currentKeys].every((key) => !priorKeys.has(key)),
    phaseBalanced: cases.filter((item) => item.phase === "early").length === 6 && cases.filter((item) => item.phase === "late").length === 6,
    contextsMatched,
    promptsMatched,
    schemasValid: records.every((record) => validProposal(record.proposal)),
    exactAnchorsExact,
    factorialAxesValid,
    ...order,
  };
  const complete = records.length === 72 && completeBlocks === 12;
  const integrityPass = complete && Object.entries(integrity).every(([key, value]) =>
    ["expectedCalls", "retainedCalls", "completeBlocks", "uniqueSeeds"].includes(key) ? true : value === true,
  );
  const gates = {
    complete,
    integrity: integrityPass,
    narrowAnchor: complete && byArm["exact-narrow-anchor"]!.buyRate >= BUYER_WRAPPER_FLOORS.narrowRate,
    publicAnchor: complete && byArm["exact-public-hard-anchor"]!.buyRate <= BUYER_WRAPPER_FLOORS.publicRateCeiling,
    anchorGap: complete && passes(contrasts.anchorGap, BUYER_WRAPPER_FLOORS.anchorGapMres),
    harmonizedBaseline: complete && byArm["harmonized-sealed-flat"]!.buyRate >= BUYER_WRAPPER_FLOORS.harmonizedBaselineRate,
    framingMain: complete && passes(contrasts.framingMain, BUYER_WRAPPER_FLOORS.componentMres),
    representationMain: complete && passes(contrasts.representationMain, BUYER_WRAPPER_FLOORS.componentMres),
    interaction: complete && (
      interactionPass(contrasts.framingUnderFlat, contrasts.framingUnderNested)
      || interactionPass(contrasts.representationUnderSealed, contrasts.representationUnderPublic)
    ),
    residualRepair: complete
      && byArm["harmonized-public-nested"]!.buyRate >= BUYER_WRAPPER_FLOORS.repairRate
      && passes(contrasts.residualRepair, BUYER_WRAPPER_FLOORS.repairMres),
  };
  return {
    study: "VBE-E-BUY-WRAP-D-BUYER-WRAPPER-REPRESENTATION-DISASSEMBLY",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-wrapper-disassembly-protocol.md",
    model,
    sourceCorpus: { path: BUYER_WRAPPER_SOURCE_PATH, sha256: buyerWrapperCorpusHash(), arm: "valid-visible", selectedSeeds: seeds.sort((a, b) => a - b) },
    excludedPriorContexts: prior.length,
    cases,
    arms: [...BUYER_WRAPPER_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    contrasts,
    gates,
    integrity,
    verdict: buyerWrapperVerdict(gates),
    caveat: "A final new-context sealed replay on one frozen corpus identifies delivery-framing or representation sensitivity only under the harmonized prompt contract; it does not identify latent reasoning, a new online policy effect, downstream trade, welfare, belief, privacy, source truth, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
