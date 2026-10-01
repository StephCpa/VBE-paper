import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AgentState, Meeting, MemoryItem, RunResult } from "./types.ts";

export const CXT_SOURCE_PATH = "src/data/credible-information-itt.json";
export const CXT_SOURCE_LEVEL = 0 as const;
export const CXT_SOURCE_SEEDS = [
  12007, 12011, 12037, 12041, 12043, 12049,
  12071, 12073, 12097, 12101, 12107, 12109,
  12113, 12119, 12143, 12149, 12157, 12161,
] as const;
export const CXT_PHASES = [
  { id: "p1", first: 1, last: 6 },
  { id: "p2", first: 7, last: 12 },
  { id: "p3", first: 13, last: 18 },
  { id: "p4", first: 19, last: 24 },
] as const;
export type CxtPhase = (typeof CXT_PHASES)[number]["id"];
export const CXT_ARMS = [
  "history-only", "valid-visible", "invalid-visible", "invalid-quarantined",
] as const;
export type CxtArm = (typeof CXT_ARMS)[number];
export const CXT_EXPECTED_BLOCKS = 72 as const;
export const CXT_EXPECTED_CALLS = 288 as const;

export type CxtSourceRun = {
  seed: number;
  level: number;
  result: RunResult;
};

export type CxtMeetingSummary = {
  t: number;
  partnerId: number;
  partnerType: "H" | "E";
  ownProposal: { giveCheck: boolean; giveChits: number; requireChit: boolean };
  partnerProposal: { giveCheck: boolean; giveChits: number; requireChit: boolean };
  kind: string;
  seller: number | null;
  buyer: number | null;
};

export type CxtEnvironmentContext = {
  corpus: "VBE-E-CREDIBLE-INFORMATION-ITT/level-0";
  seed: number;
  phase: CxtPhase;
  phaseRounds: { first: number; last: number };
  selectedRound: number;
  agent: AgentState;
  partner: AgentState;
  fullPriorTrajectory: CxtMeetingSummary[];
  runtimeRecentMemory: MemoryItem[];
};

export type CxtSourceEnvelope = {
  status: "WITHHELD" | "PRESENT" | "QUARANTINED";
  validatorStatus: "WITHHELD" | "PASS" | "FAIL";
  temporalScope: "WITHHELD" | "CURRENT";
  populationScope: "WITHHELD" | "MATCH";
  quarantineApplied: boolean;
  acceptanceProbability: number | null;
  markExpectedValue: number | null;
  expectedNetSell: number | null;
};

export type CxtProbeContext = {
  environment: CxtEnvironmentContext;
  sealedDecision: {
    keepCheckValue: 0.5;
    acceptedMarkIncrement: 1.83;
    exactlyOneFutureUseOpportunity: true;
    recentFirsthandOutcomes: ["DECLINED", "DECLINED", "DECLINED", "DECLINED"];
    admissibilityRule: "USE_TYPED_NUMBERS_IFF_PASS_CURRENT_MATCH";
    invalidAction: "IGNORE_TYPED_NUMERIC_FIELDS_AND_USE_SEALED_FIRSTHAND_HISTORY";
    sourceEnvelope: CxtSourceEnvelope;
  };
};

export type CxtRecord = {
  block: number;
  seed: number;
  phase: CxtPhase;
  arm: CxtArm;
  position: number;
  acceptanceProbability: number;
  environmentHash: string;
  promptHash: string;
  sell: boolean;
};

export type CxtRate = { n: number; sell: number; sellRate: number; rejectRate: number };
export type CxtContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number | null;
};

export type CxtReport = {
  study: "VBE-E-SVG-CXT-SOURCE-VALIDITY-CONTEXT-TRANSFER";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-source-validity-context-transfer-protocol.md";
  model: string;
  sourceCorpus: { path: string; sha256: string; level: 0; seeds: number[] };
  records: CxtRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<CxtArm, CxtRate>>;
  byPhase: Record<string, { byArm: Partial<Record<CxtArm, CxtRate>>; contractAccuracy: number }>;
  contrasts: { consume: CxtContrast | null; validator: CxtContrast | null; visibleMinusQuarantine: CxtContrast | null };
  contractAccuracy: number | null;
  gates: {
    historyReject: boolean;
    validConsume: boolean;
    invalidVisibleSafe: boolean;
    quarantineSafe: boolean;
    validatorContrast: boolean;
    quarantineEquivalenceGuard: boolean;
    contractAccuracy: boolean;
    depthStable: boolean;
  };
  integrity: {
    expectedBlocks: 72;
    expectedCalls: 288;
    retainedCalls: number;
    corpusHashMatched: boolean;
    contextHashesMatched: boolean;
    promptsMatched: boolean;
    schemasValid: boolean;
    orderBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "CONTEXT BASELINE FAILURE" | "VALID OBJECT NOT CONSUMED" | "VISIBLE FAILED SOURCE CONTAMINATES" | "QUARANTINE BENCHMARK FAILURE" | "DEPTH INSTABILITY" | "CONTEXT TRANSFER SUPPORTED";
  caveat: string;
  generatedAt: string;
};

export function sha256Cxt(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function cxtCorpusHash(): string {
  return sha256Cxt(readFileSync(CXT_SOURCE_PATH, "utf8"));
}

function proposalView(p: Meeting["pi"]) {
  return { giveCheck: p.giveCheck, giveChits: p.giveChits, requireChit: p.requireChit };
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

function summaryFromMeeting(meId: number, meeting: Meeting): CxtMeetingSummary {
  const isI = meeting.i === meId;
  return {
    t: meeting.t,
    partnerId: isI ? meeting.j : meeting.i,
    partnerType: isI ? meeting.jType : meeting.iType,
    ownProposal: proposalView(isI ? meeting.pi : meeting.pj),
    partnerProposal: proposalView(isI ? meeting.pj : meeting.pi),
    kind: meeting.kind,
    seller: meeting.seller,
    buyer: meeting.buyer,
  };
}

function priorMeetings(result: RunResult, id: number, beforeRound: number): Meeting[] {
  return result.rounds
    .filter((round) => round.t < beforeRound)
    .flatMap((round) => round.meetings)
    .filter((meeting) => meeting.i === id || meeting.j === id)
    .sort((a, b) => a.t - b.t);
}

function preDecisionState(result: RunResult, id: number, t: number, partnerId: number): AgentState {
  const current = result.rounds[t - 1]!;
  const previous = t > 1 ? result.rounds[t - 2] : undefined;
  const type = current.types[id]!;
  const history = priorMeetings(result, id, t).map((meeting) => memoryFromMeeting(id, meeting));
  return {
    id,
    type,
    checks: 1,
    chits: previous?.chits[id] ?? result.rounds[0]!.chits[id]!,
    score: (previous?.scores[id] ?? 0) + (type === "E" ? 3 : 0),
    solved: type === "E",
    receivedFrom: null,
    memory: history.slice(-4),
  };
}

export function extractCxtEnvironment(run: CxtSourceRun, phase: (typeof CXT_PHASES)[number]): CxtEnvironmentContext {
  if (run.level !== CXT_SOURCE_LEVEL) throw new Error(`source run ${run.seed} is not level 0`);
  const choices = run.result.rounds
    .filter((round) => round.t >= phase.first && round.t <= phase.last)
    .flatMap((round) => round.meetings.map((meeting) => ({ round, meeting })))
    .flatMap(({ round, meeting }) => [meeting.i, meeting.j]
      .filter((id) => id >= 4)
      .map((id) => ({ round, meeting, id, partnerId: meeting.i === id ? meeting.j : meeting.i })))
    .sort((a, b) => b.round.t - a.round.t || a.id - b.id || a.partnerId - b.partnerId);
  const selected = choices[0];
  if (!selected) throw new Error(`no LLM meeting seed=${run.seed} phase=${phase.id}`);
  const agent = preDecisionState(run.result, selected.id, selected.round.t, selected.partnerId);
  const partner = preDecisionState(run.result, selected.partnerId, selected.round.t, selected.id);
  const prior = priorMeetings(run.result, selected.id, selected.round.t);
  return {
    corpus: "VBE-E-CREDIBLE-INFORMATION-ITT/level-0",
    seed: run.seed,
    phase: phase.id,
    phaseRounds: { first: phase.first, last: phase.last },
    selectedRound: selected.round.t,
    agent,
    partner,
    fullPriorTrajectory: prior.map((meeting) => summaryFromMeeting(selected.id, meeting)),
    runtimeRecentMemory: agent.memory,
  };
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) => permutations([...values.slice(0, index), ...values.slice(index + 1)])
    .map((tail) => [value, ...tail]));
}

const ALL_ORDERS = permutations(CXT_ARMS);
export function cxtOrder(block: number): readonly CxtArm[] {
  if (!Number.isInteger(block) || block < 1 || block > CXT_EXPECTED_BLOCKS) throw new Error(`invalid CXT block ${block}`);
  return ALL_ORDERS[(block - 1) % ALL_ORDERS.length]!;
}

export function cxtAcceptanceProbability(block: number): number {
  if (!Number.isInteger(block) || block < 1 || block > CXT_EXPECTED_BLOCKS) throw new Error(`invalid CXT block ${block}`);
  return Math.round((0.70 + 0.25 * (block - 1) / (CXT_EXPECTED_BLOCKS - 1)) * 1e6) / 1e6;
}

function round6(n: number): number { return Math.round(n * 1e6) / 1e6; }

export function cxtSourceEnvelope(arm: CxtArm, q: number): CxtSourceEnvelope {
  if (arm === "history-only") return {
    status: "WITHHELD", validatorStatus: "WITHHELD", temporalScope: "WITHHELD", populationScope: "WITHHELD",
    quarantineApplied: false, acceptanceProbability: null, markExpectedValue: null, expectedNetSell: null,
  };
  const valid = arm === "valid-visible";
  const quarantined = arm === "invalid-quarantined";
  return {
    status: quarantined ? "QUARANTINED" : "PRESENT",
    validatorStatus: valid ? "PASS" : "FAIL",
    temporalScope: "CURRENT",
    populationScope: "MATCH",
    quarantineApplied: quarantined,
    acceptanceProbability: quarantined ? null : q,
    markExpectedValue: quarantined ? null : round6(1.83 * q),
    expectedNetSell: quarantined ? null : round6(1.83 * q - 0.5),
  };
}

export function cxtProbeContext(environment: CxtEnvironmentContext, arm: CxtArm, q: number): CxtProbeContext {
  return {
    environment,
    sealedDecision: {
      keepCheckValue: 0.5,
      acceptedMarkIncrement: 1.83,
      exactlyOneFutureUseOpportunity: true,
      recentFirsthandOutcomes: ["DECLINED", "DECLINED", "DECLINED", "DECLINED"],
      admissibilityRule: "USE_TYPED_NUMBERS_IFF_PASS_CURRENT_MATCH",
      invalidAction: "IGNORE_TYPED_NUMERIC_FIELDS_AND_USE_SEALED_FIRSTHAND_HISTORY",
      sourceEnvelope: cxtSourceEnvelope(arm, q),
    },
  };
}

export function cxtPrompt(environment: CxtEnvironmentContext, arm: CxtArm, q: number): string {
  const context = cxtProbeContext(environment, arm, q);
  return `LONG-CONTEXT VBE SHADOW DECISION. The environment field is an immutable trajectory-derived context from a completed run. This probe does not change that run. The sealedDecision field defines a new one-shot decision at the current state.\n\nSOURCE CONTRACT: Typed numeric fields are admissible if and only if validatorStatus=PASS, temporalScope=CURRENT, and populationScope=MATCH. If any check fails, ignore every typed numeric field and use sealedDecision.recentFirsthandOutcomes. WITHHELD is absence, not negative evidence. QUARANTINED means the failed numeric payload was removed before model invocation.\n\nPAYOFF: Keeping the new leftover check is worth exactly 0.50. Selling it gives up 0.50 and receives one mark. There is exactly one later opportunity to spend that mark; acceptance adds 1.83 expected score relative to using your own check, rejection adds 0. No other payoff, resale, discounting, or hidden consequence exists.\n\nCONTEXT:\n${JSON.stringify(context)}\n\nChoose whether to sell the new leftover check for one mark. Do not report reasoning. Return JSON only: {"sell":true|false}`;
}

export function parseCxtSell(text: string): boolean {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing action JSON object");
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(obj)) !== JSON.stringify(["sell"]) || typeof obj.sell !== "boolean") {
    throw new Error("action fields do not match exact sell-only schema");
  }
  return obj.sell;
}

export function cxtExpectedSell(arm: CxtArm): boolean { return arm === "valid-visible"; }

function rate(records: readonly CxtRecord[]): CxtRate {
  const sell = records.filter((record) => record.sell).length;
  return { n: records.length, sell, sellRate: records.length ? sell / records.length : 0, rejectRate: records.length ? 1 - sell / records.length : 0 };
}

function choose(n: number, k: number): number {
  let out = 1;
  for (let i = 1; i <= k; i++) out = out * (n - k + i) / i;
  return out;
}

function exactUpper(positive: number, negative: number): number | null {
  const n = positive + negative;
  if (!n) return null;
  let p = 0;
  for (let k = positive; k <= n; k++) p += choose(n, k) / 2 ** n;
  return p;
}

function contrast(records: readonly CxtRecord[], left: CxtArm, right: CxtArm): CxtContrast {
  const deltas: number[] = [];
  for (let block = 1; block <= CXT_EXPECTED_BLOCKS; block++) {
    const l = records.find((record) => record.block === block && record.arm === left);
    const r = records.find((record) => record.block === block && record.arm === right);
    if (!l || !r) continue;
    deltas.push(Number(l.sell) - Number(r.sell));
  }
  const positive = deltas.filter((delta) => delta > 0).length;
  const negative = deltas.filter((delta) => delta < 0).length;
  return {
    n: deltas.length,
    mean: deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : 0,
    positive,
    negative,
    ties: deltas.length - positive - negative,
    exactUpperP: exactUpper(positive, negative),
  };
}

export function buildCxtContexts(sourceRuns: readonly CxtSourceRun[]): CxtEnvironmentContext[] {
  const runs = CXT_SOURCE_SEEDS.map((seed) => {
    const run = sourceRuns.find((candidate) => candidate.seed === seed && candidate.level === CXT_SOURCE_LEVEL);
    if (!run) throw new Error(`missing source context run seed=${seed} level=0`);
    return run;
  });
  return runs.flatMap((run) => CXT_PHASES.map((phase) => extractCxtEnvironment(run, phase)));
}

export function cxtEnvironmentHash(environment: CxtEnvironmentContext): string {
  return sha256Cxt(JSON.stringify(environment));
}

export function validateCxtRecords(records: readonly CxtRecord[], contexts: readonly CxtEnvironmentContext[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (!CXT_ARMS.includes(record.arm)) throw new Error(`unexpected arm ${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate CXT record ${key}`);
    seen.add(key);
    const environment = contexts[record.block - 1];
    if (!environment) throw new Error(`unexpected block ${record.block}`);
    if (record.seed !== environment.seed || record.phase !== environment.phase) throw new Error(`context identity mismatch ${key}`);
    if (record.position !== cxtOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    const q = cxtAcceptanceProbability(record.block);
    if (record.acceptanceProbability !== q) throw new Error(`probability mismatch ${key}`);
    if (record.environmentHash !== cxtEnvironmentHash(environment)) throw new Error(`environment hash mismatch ${key}`);
    if (record.promptHash !== sha256Cxt(cxtPrompt(environment, record.arm, q))) throw new Error(`prompt hash mismatch ${key}`);
    parseCxtSell(JSON.stringify({ sell: record.sell }));
  }
}

export function buildCxtReport(
  recordsInput: readonly CxtRecord[],
  model: string,
  sourceCorpusHash: string,
  frozenCorpusHash: string,
  contexts: readonly CxtEnvironmentContext[],
): CxtReport {
  validateCxtRecords(recordsInput, contexts);
  const records = [...recordsInput].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = Array.from({ length: CXT_EXPECTED_BLOCKS }, (_, index) => index + 1)
    .filter((block) => CXT_ARMS.every((arm) => records.some((record) => record.block === block && record.arm === arm))).length;
  const complete = completeBlocks === CXT_EXPECTED_BLOCKS && records.length === CXT_EXPECTED_CALLS;
  const byArm: CxtReport["byArm"] = {};
  for (const arm of CXT_ARMS) byArm[arm] = rate(records.filter((record) => record.arm === arm));
  const byPhase: CxtReport["byPhase"] = {};
  for (const phase of CXT_PHASES) {
    const phaseRecords = records.filter((record) => record.phase === phase.id);
    const phaseArms: Partial<Record<CxtArm, CxtRate>> = {};
    for (const arm of CXT_ARMS) phaseArms[arm] = rate(phaseRecords.filter((record) => record.arm === arm));
    byPhase[phase.id] = {
      byArm: phaseArms,
      contractAccuracy: phaseRecords.length ? phaseRecords.filter((record) => record.sell === cxtExpectedSell(record.arm)).length / phaseRecords.length : 0,
    };
  }
  const contrasts = {
    consume: complete ? contrast(records, "valid-visible", "history-only") : null,
    validator: complete ? contrast(records, "valid-visible", "invalid-visible") : null,
    visibleMinusQuarantine: complete ? contrast(records, "invalid-visible", "invalid-quarantined") : null,
  };
  const contractAccuracy = complete ? records.filter((record) => record.sell === cxtExpectedSell(record.arm)).length / records.length : null;
  const gates = {
    historyReject: Boolean(complete && byArm["history-only"]!.rejectRate >= 0.85),
    validConsume: Boolean(complete && byArm["valid-visible"]!.sellRate >= 0.85),
    invalidVisibleSafe: Boolean(complete && byArm["invalid-visible"]!.sellRate <= 0.15),
    quarantineSafe: Boolean(complete && byArm["invalid-quarantined"]!.sellRate <= 0.15),
    validatorContrast: Boolean(complete && contrasts.validator && contrasts.validator.mean >= 0.50 && contrasts.validator.exactUpperP !== null && contrasts.validator.exactUpperP <= 0.025),
    quarantineEquivalenceGuard: Boolean(complete && Math.abs(byArm["invalid-visible"]!.sellRate - byArm["invalid-quarantined"]!.sellRate) <= 0.05),
    contractAccuracy: Boolean(complete && contractAccuracy !== null && contractAccuracy >= 0.90),
    depthStable: Boolean(complete && CXT_PHASES.every((phase) => {
      const item = byPhase[phase.id]!;
      return item.byArm["valid-visible"]!.sellRate >= 0.80 && item.byArm["invalid-visible"]!.sellRate <= 0.20 && item.contractAccuracy >= 0.85;
    })),
  };
  const orderBalanced = complete && CXT_ARMS.every((arm) => [0, 1, 2, 3].every((position) =>
    Array.from({ length: CXT_EXPECTED_BLOCKS }, (_, index) => index + 1).filter((block) => cxtOrder(block)[position] === arm).length === 18));
  const pairwisePrecedenceBalanced = complete && CXT_ARMS.every((left) => CXT_ARMS.every((right) => left === right ||
    Array.from({ length: CXT_EXPECTED_BLOCKS }, (_, index) => index + 1).filter((block) => cxtOrder(block).indexOf(left) < cxtOrder(block).indexOf(right)).length === 36));
  const integrity = {
    expectedBlocks: CXT_EXPECTED_BLOCKS,
    expectedCalls: CXT_EXPECTED_CALLS,
    retainedCalls: records.length,
    corpusHashMatched: sourceCorpusHash === frozenCorpusHash,
    contextHashesMatched: records.every((record) => record.environmentHash === cxtEnvironmentHash(contexts[record.block - 1]!)),
    promptsMatched: records.every((record) => record.promptHash === sha256Cxt(cxtPrompt(contexts[record.block - 1]!, record.arm, record.acceptanceProbability))),
    schemasValid: true,
    orderBalanced,
    pairwisePrecedenceBalanced,
  };
  let verdict: CxtReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!Object.values(integrity).every((value) => typeof value === "number" ? true : value)) verdict = "INVALID";
    else if (!gates.historyReject) verdict = "CONTEXT BASELINE FAILURE";
    else if (!gates.validConsume) verdict = "VALID OBJECT NOT CONSUMED";
    else if (!gates.invalidVisibleSafe || !gates.validatorContrast || !gates.quarantineEquivalenceGuard || !gates.contractAccuracy) verdict = "VISIBLE FAILED SOURCE CONTAMINATES";
    else if (!gates.quarantineSafe) verdict = "QUARANTINE BENCHMARK FAILURE";
    else if (!gates.depthStable) verdict = "DEPTH INSTABILITY";
    else verdict = "CONTEXT TRANSFER SUPPORTED";
  }
  return {
    study: "VBE-E-SVG-CXT-SOURCE-VALIDITY-CONTEXT-TRANSFER",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-source-validity-context-transfer-protocol.md",
    model,
    sourceCorpus: { path: CXT_SOURCE_PATH, sha256: sourceCorpusHash, level: CXT_SOURCE_LEVEL, seeds: [...CXT_SOURCE_SEEDS] },
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    byPhase,
    contrasts,
    contractAccuracy,
    gates,
    integrity,
    verdict,
    caveat: "This offline shadow intervention identifies source-envelope effects within immutable trajectory-derived contexts. It does not identify an online policy intervention's downstream effects on trade, welfare, inventories, or institutional persistence, and it does not authenticate the validator or establish latent belief.",
    generatedAt: new Date().toISOString(),
  };
}
