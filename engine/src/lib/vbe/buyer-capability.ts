import { createHash } from "node:crypto";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

export const BUYER_CAPABILITY_ARMS = [
  "negative-guaranteed",
  "low-uncertain",
  "low-guaranteed",
  "high-uncertain",
  "high-guaranteed",
  "compiled-low-uncertain",
] as const;
export type BuyerCapabilityArm = (typeof BUYER_CAPABILITY_ARMS)[number];

export const BUYER_CAPABILITY_FLOORS = {
  positiveRate: 0.85,
  negativeRateCeiling: 0.15,
  capabilityEffect: 0.70,
  singleAxisEffect: 0.50,
  compiledRate: 0.95,
  compiledEffect: 0.70,
  alpha: 0.025,
  onlinePatternCeiling: 0.15,
} as const;

export type BuyerHistory = "NONE" | "TWO_PRIOR_NO_TRADES";
export type BuyerCapabilityCase = {
  block: number;
  agentId: 4 | 5 | 6 | 7;
  partnerId: 0 | 1 | 2 | 3;
  score: 0 | 6 | 12;
  history: BuyerHistory;
};

export const BUYER_CAPABILITY_CASES: readonly BuyerCapabilityCase[] = ([4, 5, 6, 7] as const).flatMap((agentId) =>
  ([0, 6, 12] as const).flatMap((score) =>
    (["NONE", "TWO_PRIOR_NO_TRADES"] as const).map((history) => ({
      block: 0,
      agentId,
      partnerId: (agentId - 4) as 0 | 1 | 2 | 3,
      score,
      history,
    })),
  ),
).map((item, index) => ({ ...item, block: index + 1 }));

type BuyerDecisionSupport = {
  sourceId: "BUY-GATE-1";
  validatorStatus: "PASS";
  target: "CURRENT_HARD_BUYER_PROPOSAL";
  proposalNoTradeCost: 0;
  partnerCheckIncrement: 1.83;
  savedMarkOpportunityValue: number;
  conditionalNetIfExecuted: number;
  sellerExecutionProbability: number;
  proposalExpectedNet: number;
  actionCompiler: null | {
    status: "PASS";
    objective: "MAXIMIZE_EXPECTED_OWN_SCORE";
    optimalProposal: { giveCheck: false; giveChits: 1; requireChit: false };
  };
};

export type BuyerCapabilityContext = {
  caseId: string;
  state: {
    round: 10;
    horizon: 24;
    role: "HARD";
    ownCheck: 1;
    marks: 1;
    partnerRole: "EASY";
    partnerCheck: 1;
    score: number;
    history: BuyerHistory;
  };
  decisionSupport: BuyerDecisionSupport;
};

export type BuyerCapabilityRecord = {
  block: number;
  arm: BuyerCapabilityArm;
  position: number;
  promptHash: string;
  context: BuyerCapabilityContext;
  proposal: Proposal;
  buy: boolean;
};

export type BuyerCapabilityRate = { n: number; buy: number; buyRate: number };
export type BuyerCapabilityContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number | null;
  values: Array<{ block: number; delta: number }>;
};

export type BuyerCapabilityReport = {
  study: "VBE-E-BUY-BUYER-CAPABILITY-GATE";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-capability-gate-protocol.md";
  model: string;
  cases: readonly BuyerCapabilityCase[];
  arms: BuyerCapabilityArm[];
  records: BuyerCapabilityRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<BuyerCapabilityArm, BuyerCapabilityRate>>;
  contrasts: {
    capability: BuyerCapabilityContrast | null;
    certainty: BuyerCapabilityContrast | null;
    margin: BuyerCapabilityContrast | null;
    compiled: BuyerCapabilityContrast | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    positiveRate: boolean;
    negativeControl: boolean;
    capabilityMagnitude: boolean;
    capabilityExact: boolean;
    onlinePatternReplicated: boolean;
    certaintyRescue: boolean;
    marginRescue: boolean;
    actionMaterialization: boolean;
  };
  integrity: {
    expectedCalls: 144;
    retainedCalls: number;
    completeBlocks: number;
    casesValid: boolean;
    promptsValid: boolean;
    schemasValid: boolean;
    positionBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "ACTION MATERIALIZATION REQUIRED" | "BUYER INTERFACE CAPABILITY NOT SHOWN" | "BUYER CAPABILITY PRESENT — ONLINE NULL CONTEXTUAL" | "COUNTERPARTY CERTAINTY BOTTLENECK" | "MARGIN BOTTLENECK" | "REDUNDANT SINGLE-AXIS RESCUE" | "JOINT MARGIN × CERTAINTY BOTTLENECK";
  caveat: string;
  generatedAt: string;
};

const rotations = BUYER_CAPABILITY_ARMS.map((_, shift) => [
  ...BUYER_CAPABILITY_ARMS.slice(shift),
  ...BUYER_CAPABILITY_ARMS.slice(0, shift),
]);
const ORDERS: readonly (readonly BuyerCapabilityArm[])[] = [
  ...rotations,
  ...rotations.map((order) => [...order].reverse()),
];

function round6(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }

export function buyerCapabilityOrder(block: number): readonly BuyerCapabilityArm[] {
  if (!Number.isInteger(block) || block < 1 || block > BUYER_CAPABILITY_CASES.length) throw new Error(`invalid buyer-capability block ${block}`);
  return ORDERS[(block - 1) % ORDERS.length]!;
}

function supportValues(arm: BuyerCapabilityArm): { saved: number; probability: number; compiled: boolean } {
  if (arm === "negative-guaranteed") return { saved: 2.33, probability: 1, compiled: false };
  if (arm === "low-uncertain") return { saved: 1.647, probability: 0.25, compiled: false };
  if (arm === "low-guaranteed") return { saved: 1.647, probability: 1, compiled: false };
  if (arm === "high-uncertain") return { saved: 0.5, probability: 0.25, compiled: false };
  if (arm === "high-guaranteed") return { saved: 0.5, probability: 1, compiled: false };
  return { saved: 1.647, probability: 0.25, compiled: true };
}

export function buyerCapabilityContext(arm: BuyerCapabilityArm, item: BuyerCapabilityCase): BuyerCapabilityContext {
  const values = supportValues(arm);
  const conditional = round6(1.83 - values.saved);
  return {
    caseId: `BUY-${String(item.block).padStart(2, "0")}`,
    state: {
      round: 10,
      horizon: 24,
      role: "HARD",
      ownCheck: 1,
      marks: 1,
      partnerRole: "EASY",
      partnerCheck: 1,
      score: item.score,
      history: item.history,
    },
    decisionSupport: {
      sourceId: "BUY-GATE-1",
      validatorStatus: "PASS",
      target: "CURRENT_HARD_BUYER_PROPOSAL",
      proposalNoTradeCost: 0,
      partnerCheckIncrement: 1.83,
      savedMarkOpportunityValue: values.saved,
      conditionalNetIfExecuted: conditional,
      sellerExecutionProbability: values.probability,
      proposalExpectedNet: round6(conditional * values.probability),
      actionCompiler: values.compiled ? {
        status: "PASS",
        objective: "MAXIMIZE_EXPECTED_OWN_SCORE",
        optimalProposal: { giveCheck: false, giveChits: 1, requireChit: false },
      } : null,
    },
  };
}

export function buyerCapabilityAgent(item: BuyerCapabilityCase): AgentState {
  return {
    id: item.agentId,
    type: "H",
    checks: 1,
    chits: 1,
    score: item.score,
    solved: false,
    receivedFrom: null,
    memory: item.history === "NONE" ? [] : [
      { t: 7, partnerId: item.partnerId, partnerType: "E", gaveCheck: false, gotCheck: false, gaveChits: 0, gotChits: 0, kind: "none" },
      { t: 9, partnerId: item.partnerId, partnerType: "E", gaveCheck: false, gotCheck: false, gaveChits: 0, gotChits: 0, kind: "none" },
    ],
  };
}

export function buyerCapabilityPartner(item: BuyerCapabilityCase): AgentState {
  return { id: item.partnerId, type: "E", checks: 1, chits: 0, score: 6, solved: true, receivedFrom: null, memory: [] };
}

export function buyerCapabilityNotice(arm: BuyerCapabilityArm, item: BuyerCapabilityCase): string {
  const context = buyerCapabilityContext(arm, item);
  const compiler = context.decisionSupport.actionCompiler
    ? "The actionCompiler field is a trusted deterministic output and may be executed exactly."
    : "No action recommendation is supplied. Use the verified quantities to maximize your own expected score.";
  return `SEALED BUYER-CAPABILITY DIAGNOSTIC. The following object applies only to this current Hard-buyer proposal. Its arithmetic is exact for this diagnostic. If no exchange executes, no mark moves and your score is unchanged. If you offer one mark and the seller executes, you receive the partner check and pay exactly one mark.\n${JSON.stringify(context)}\n${compiler}`;
}

export function sha256BuyerPrompt(prompt: string): string { return createHash("sha256").update(prompt).digest("hex"); }

export function parseBuyerProposal(text: string): Proposal {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing action JSON");
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(["giveCheck", "giveChits", "requireChit"].sort())) throw new Error("fields");
  if (typeof obj.giveCheck !== "boolean" || (obj.giveChits !== 0 && obj.giveChits !== 1) || typeof obj.requireChit !== "boolean") throw new Error("types");
  return { giveCheck: obj.giveCheck, giveChits: obj.giveChits, requireChit: obj.requireChit };
}

function choose(n: number, k: number): number { let out = 1; for (let i = 1; i <= k; i++) out = out * (n - k + i) / i; return out; }
function exactUpperDiscordantP(positive: number, negative: number): number | null {
  const n = positive + negative;
  if (!n) return 1;
  let mass = 0;
  for (let k = positive; k <= n; k++) mass += choose(n, k) * 0.5 ** n;
  return Math.min(1, mass);
}

function contrast(records: readonly BuyerCapabilityRecord[], left: BuyerCapabilityArm, right: BuyerCapabilityArm): BuyerCapabilityContrast | null {
  const values = BUYER_CAPABILITY_CASES.map((item) => {
    const l = records.find((record) => record.block === item.block && record.arm === left);
    const r = records.find((record) => record.block === item.block && record.arm === right);
    return l && r ? { block: item.block, delta: Number(l.buy) - Number(r.buy) } : null;
  }).filter((value): value is { block: number; delta: number } => Boolean(value));
  if (!values.length) return null;
  const positive = values.filter((value) => value.delta > 0).length;
  const negative = values.filter((value) => value.delta < 0).length;
  return {
    n: values.length,
    mean: values.reduce((sum, value) => sum + value.delta, 0) / values.length,
    positive,
    negative,
    ties: values.length - positive - negative,
    exactUpperP: exactUpperDiscordantP(positive, negative),
    values,
  };
}

function rate(records: readonly BuyerCapabilityRecord[], arm: BuyerCapabilityArm): BuyerCapabilityRate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function validProposal(proposal: Proposal): boolean {
  return JSON.stringify(Object.keys(proposal).sort()) === JSON.stringify(["giveCheck", "giveChits", "requireChit"].sort())
    && typeof proposal.giveCheck === "boolean"
    && (proposal.giveChits === 0 || proposal.giveChits === 1)
    && typeof proposal.requireChit === "boolean";
}

function validateRecords(records: readonly BuyerCapabilityRecord[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    const item = BUYER_CAPABILITY_CASES[record.block - 1];
    if (!item || !BUYER_CAPABILITY_ARMS.includes(record.arm)) throw new Error(`unknown buyer-capability record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-capability record ${key}`);
    seen.add(key);
    if (record.position !== buyerCapabilityOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (JSON.stringify(record.context) !== JSON.stringify(buyerCapabilityContext(record.arm, item))) throw new Error(`context mismatch ${key}`);
    if (!/^[0-9a-f]{64}$/.test(record.promptHash)) throw new Error(`prompt hash format ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
  }
}

function orderIntegrity(): { positionBalanced: boolean; pairwisePrecedenceBalanced: boolean } {
  const positionBalanced = BUYER_CAPABILITY_ARMS.every((arm) =>
    [0, 1, 2, 3, 4, 5].every((position) => BUYER_CAPABILITY_CASES.filter((item) => buyerCapabilityOrder(item.block)[position] === arm).length === 4),
  );
  const pairwisePrecedenceBalanced = BUYER_CAPABILITY_ARMS.every((left, i) => BUYER_CAPABILITY_ARMS.slice(i + 1).every((right) => {
    const before = BUYER_CAPABILITY_CASES.filter((item) => buyerCapabilityOrder(item.block).indexOf(left) < buyerCapabilityOrder(item.block).indexOf(right)).length;
    return before === 12;
  }));
  return { positionBalanced, pairwisePrecedenceBalanced };
}

export function buyerCapabilityVerdict(gates: BuyerCapabilityReport["gates"]): BuyerCapabilityReport["verdict"] {
  if (!gates.complete) return "INCOMPLETE";
  if (!gates.integrity || !gates.negativeControl) return "INVALID";
  const capability = gates.positiveRate && gates.capabilityMagnitude && gates.capabilityExact;
  if (!capability) return gates.actionMaterialization ? "ACTION MATERIALIZATION REQUIRED" : "BUYER INTERFACE CAPABILITY NOT SHOWN";
  if (!gates.onlinePatternReplicated) return "BUYER CAPABILITY PRESENT — ONLINE NULL CONTEXTUAL";
  if (gates.certaintyRescue && gates.marginRescue) return "REDUNDANT SINGLE-AXIS RESCUE";
  if (gates.certaintyRescue) return "COUNTERPARTY CERTAINTY BOTTLENECK";
  if (gates.marginRescue) return "MARGIN BOTTLENECK";
  return "JOINT MARGIN × CERTAINTY BOTTLENECK";
}

export function buildBuyerCapabilityReport(rawRecords: readonly BuyerCapabilityRecord[], model: string): BuyerCapabilityReport {
  validateRecords(rawRecords);
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = BUYER_CAPABILITY_CASES.filter((item) => BUYER_CAPABILITY_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const byArm: BuyerCapabilityReport["byArm"] = {};
  for (const arm of BUYER_CAPABILITY_ARMS) byArm[arm] = rate(records, arm);
  const contrasts = {
    capability: contrast(records, "high-guaranteed", "negative-guaranteed"),
    certainty: contrast(records, "low-guaranteed", "low-uncertain"),
    margin: contrast(records, "high-uncertain", "low-uncertain"),
    compiled: contrast(records, "compiled-low-uncertain", "low-uncertain"),
  };
  const orders = orderIntegrity();
  const complete = records.length === 144 && completeBlocks === 24;
  const promptsValid = records.every((record) => {
    const item = BUYER_CAPABILITY_CASES[record.block - 1]!;
    return record.promptHash === sha256BuyerPrompt(buyerCapabilityPrompt(record.arm, item));
  });
  const integrity = {
    expectedCalls: 144 as const,
    retainedCalls: records.length,
    completeBlocks,
    casesValid: BUYER_CAPABILITY_CASES.length === 24 && new Set(BUYER_CAPABILITY_CASES.map((item) => `${item.agentId}|${item.score}|${item.history}`)).size === 24,
    promptsValid,
    schemasValid: records.every((record) => validProposal(record.proposal)),
    ...orders,
  };
  const integrityPass = integrity.retainedCalls === 144 && integrity.completeBlocks === 24 && integrity.casesValid && integrity.promptsValid && integrity.schemasValid && integrity.positionBalanced && integrity.pairwisePrecedenceBalanced;
  const high = byArm["high-guaranteed"]!.buyRate;
  const negative = byArm["negative-guaranteed"]!.buyRate;
  const low = byArm["low-uncertain"]!.buyRate;
  const compiled = byArm["compiled-low-uncertain"]!.buyRate;
  const gates = {
    complete,
    integrity: integrityPass,
    positiveRate: complete && high >= BUYER_CAPABILITY_FLOORS.positiveRate,
    negativeControl: complete && negative <= BUYER_CAPABILITY_FLOORS.negativeRateCeiling,
    capabilityMagnitude: complete && Boolean(contrasts.capability && contrasts.capability.mean >= BUYER_CAPABILITY_FLOORS.capabilityEffect),
    capabilityExact: complete && Boolean(contrasts.capability?.exactUpperP !== null && contrasts.capability!.exactUpperP! <= BUYER_CAPABILITY_FLOORS.alpha),
    onlinePatternReplicated: complete && low <= BUYER_CAPABILITY_FLOORS.onlinePatternCeiling,
    certaintyRescue: complete && Boolean(contrasts.certainty && contrasts.certainty.mean >= BUYER_CAPABILITY_FLOORS.singleAxisEffect && contrasts.certainty.exactUpperP !== null && contrasts.certainty.exactUpperP <= BUYER_CAPABILITY_FLOORS.alpha),
    marginRescue: complete && Boolean(contrasts.margin && contrasts.margin.mean >= BUYER_CAPABILITY_FLOORS.singleAxisEffect && contrasts.margin.exactUpperP !== null && contrasts.margin.exactUpperP <= BUYER_CAPABILITY_FLOORS.alpha),
    actionMaterialization: complete && compiled >= BUYER_CAPABILITY_FLOORS.compiledRate && Boolean(contrasts.compiled && contrasts.compiled.mean >= BUYER_CAPABILITY_FLOORS.compiledEffect && contrasts.compiled.exactUpperP !== null && contrasts.compiled.exactUpperP <= BUYER_CAPABILITY_FLOORS.alpha),
  };
  return {
    study: "VBE-E-BUY-BUYER-CAPABILITY-GATE",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-capability-gate-protocol.md",
    model,
    cases: BUYER_CAPABILITY_CASES,
    arms: [...BUYER_CAPABILITY_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    contrasts,
    gates,
    integrity,
    verdict: buyerCapabilityVerdict(gates),
    caveat: "This sealed diagnostic isolates interface-level buyer action. It does not measure online trade, welfare, beliefs, autonomous source validation, or cross-model generality. The compiled arm is an external execution reference rather than voluntary model reasoning.",
    generatedAt: new Date().toISOString(),
  };
}

export function buyerCapabilityPrompt(arm: BuyerCapabilityArm, item: BuyerCapabilityCase): string {
  return meetingPrompt(buyerCapabilityAgent(item), buyerCapabilityPartner(item), 10, DEFAULT_PARAMS, "label", buyerCapabilityNotice(arm, item));
}
