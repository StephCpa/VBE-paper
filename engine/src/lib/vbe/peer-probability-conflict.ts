import { createHash } from "node:crypto";

export const PEER_CONFLICT_ARMS = [
  "history-only",
  "typed-consistent",
  "typed-high-control",
  "typed-contradicted",
] as const;
export type PeerConflictArm = (typeof PEER_CONFLICT_ARMS)[number];

const LOW_PROBABILITIES = [0.05, 0.10, 0.15, 0.20] as const;
const HIGH_PROBABILITIES = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95] as const;

export type PeerConflictCase = {
  block: number;
  lowProbability: number;
  highProbability: number;
  keepCheckValue: 0.5;
  acceptedMarkIncrement: 1.83;
  breakEvenProbability: number;
};

export const PEER_CONFLICT_CASES: readonly PeerConflictCase[] = HIGH_PROBABILITIES.flatMap((highProbability) =>
  LOW_PROBABILITIES.map((lowProbability) => ({
    block: 0,
    lowProbability,
    highProbability,
    keepCheckValue: 0.5 as const,
    acceptedMarkIncrement: 1.83 as const,
    breakEvenProbability: 0.5 / 1.83,
  })),
).map((item, index) => ({ ...item, block: index + 1 }));

export type HistoryRecord = {
  status: "PRESENT" | "WITHHELD";
  source: "own-K4-recent-meetings";
  slots: [string, string, string, string];
  note: string;
};

export type TypedPeerObject = {
  status: "PASS" | "WITHHELD";
  source: "external-audited-current-population";
  target: "upcoming-peer-under-current-protocol";
  acceptanceProbability: number | null;
  markExpectedValue: number | null;
  expectedNetSell: number | null;
};

export type PeerConflictDecisionContext = {
  caseId: string;
  keepCheckValue: 0.5;
  acceptedMarkIncrement: 1.83;
  exactlyOneFutureUseOpportunity: true;
  recentHistory: HistoryRecord;
  typedPeerObject: TypedPeerObject;
  sourceRelation: "history-only" | "consistent" | "typed-only" | "contradicted";
};

export type PeerConflictRecord = {
  block: number;
  arm: PeerConflictArm;
  position: number;
  promptHash: string;
  context: PeerConflictDecisionContext;
  sell: boolean;
};

export type PeerConflictRate = { n: number; sell: number; sellRate: number; rejectRate: number };
export type PeerConflictContrast = {
  n: number;
  mean: number;
  positive: number;
  negative: number;
  ties: number;
  exactUpperP: number | null;
  values: Array<{ block: number; delta: number }>;
};

export type PeerConflictReport = {
  study: "VBE-E-TPCD-TYPED-PEER-CONFLICT";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-peer-probability-conflict-protocol.md";
  model: string;
  cases: readonly PeerConflictCase[];
  records: PeerConflictRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<PeerConflictArm, PeerConflictRate>>;
  contrasts: {
    highControlMinusHistory: PeerConflictContrast | null;
    contradictedMinusHistory: PeerConflictContrast | null;
    highControlMinusContradicted: PeerConflictContrast | null;
  };
  agreement: { contradictedWithHighControl: number | null; contradictedWithHistory: number | null };
  gates: {
    historyReject: boolean;
    consistentReject: boolean;
    highControlSell: boolean;
    typedOverride: boolean;
    historyOverride: boolean;
  };
  integrity: {
    expectedCalls: 96;
    retainedCalls: number;
    failedCallsRetained: 0;
    casesValid: boolean;
    promptsValid: boolean;
    schemasValid: boolean;
    orderBalanced: boolean;
    pairwisePrecedenceBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "TYPED OBJECT NOT CONSUMED" | "BASELINE OR CONSISTENCY FAILURE" | "TYPED OBJECT OVERRIDES RECENT HISTORY" | "RECENT HISTORY OVERRIDES TYPED OBJECT" | "SOURCE CONFLICT DESTABILIZES ACTION";
  caveat: string;
  generatedAt: string;
};

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((tail) => [item, ...tail]));
}

const ORDERS = permutations(PEER_CONFLICT_ARMS);

function round6(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }

export const HISTORY_REJECT_FLOOR = 0.85;
export const CONSISTENT_REJECT_FLOOR = 0.85;
export const HIGH_CONTROL_SELL_FLOOR = 0.85;
export const OVERRIDE_ACTION_FLOOR = 0.85;
export const OVERRIDE_ACTION_CEILING = 0.15;
export const OVERRIDE_AGREEMENT_FLOOR = 0.90;

export function peerConflictOrder(block: number): readonly PeerConflictArm[] {
  if (!Number.isInteger(block) || block < 1 || block > PEER_CONFLICT_CASES.length) throw new Error(`invalid peer-conflict block ${block}`);
  return ORDERS[block - 1]!;
}

export function peerConflictContext(arm: PeerConflictArm, item: PeerConflictCase): PeerConflictDecisionContext {
  const hasHistory = arm !== "typed-high-control";
  const hasTyped = arm !== "history-only";
  const probability = !hasTyped ? null : arm === "typed-consistent" ? item.lowProbability : item.highProbability;
  return {
    caseId: `TPCD-${String(item.block).padStart(2, "0")}`,
    keepCheckValue: item.keepCheckValue,
    acceptedMarkIncrement: item.acceptedMarkIncrement,
    exactlyOneFutureUseOpportunity: true,
    recentHistory: {
      status: hasHistory ? "PRESENT" : "WITHHELD",
      source: "own-K4-recent-meetings",
      slots: hasHistory ? ["DECLINED", "DECLINED", "DECLINED", "DECLINED"] : ["WITHHELD", "WITHHELD", "WITHHELD", "WITHHELD"],
      note: hasHistory ? "four firsthand recent outcomes" : "no historical evidence is supplied; WITHHELD does not mean refusal",
    },
    typedPeerObject: {
      status: hasTyped ? "PASS" : "WITHHELD",
      source: "external-audited-current-population",
      target: "upcoming-peer-under-current-protocol",
      acceptanceProbability: probability,
      markExpectedValue: probability === null ? null : round6(item.acceptedMarkIncrement * probability),
      expectedNetSell: probability === null ? null : round6(item.acceptedMarkIncrement * probability - item.keepCheckValue),
    },
    sourceRelation: arm === "history-only" ? "history-only" : arm === "typed-consistent" ? "consistent" : arm === "typed-high-control" ? "typed-only" : "contradicted",
  };
}

export function peerConflictPrompt(arm: PeerConflictArm, item: PeerConflictCase): string {
  const context = peerConflictContext(arm, item);
  const conflict = arm === "typed-contradicted"
    ? "The two evidence sources intentionally disagree. Neither record is a typo. The study does not supply a rule for which source must dominate."
    : "Use the evidence that is actually present; WITHHELD fields contain no negative evidence.";
  return `ONE-SHOT MARK DECISION. You are an Easy seller maximizing your own expected score. You have one leftover check worth exactly 0.50 if kept now. If you sell it, you give up that 0.50 and receive one mark. There will be exactly one later opportunity to spend the mark. If that peer accepts it, the partner check adds 1.83 expected score relative to your own check; if the peer declines, the mark adds 0. There is no other payoff, resale, discounting, liquidity constraint, or hidden consequence.\n\nEVIDENCE AND PAYOFF CONTEXT:\n${JSON.stringify(context)}\n\n${conflict}\nWhen present with status PASS, the typed object is a recommendation-free population estimate for the upcoming peer under the current protocol. Choose whether to sell the current check for one mark. Return JSON only: {"sell":true|false}`;
}

export function parsePeerConflict(text: string): boolean {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing action JSON object");
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  if (JSON.stringify(Object.keys(obj)) !== JSON.stringify(["sell"]) || typeof obj.sell !== "boolean") throw new Error("action fields do not match schema");
  return obj.sell;
}

export function sha256PeerConflict(text: string): string { return createHash("sha256").update(text).digest("hex"); }

function validateContext(stored: PeerConflictDecisionContext, arm: PeerConflictArm, item: PeerConflictCase): void {
  const expected = peerConflictContext(arm, item);
  if (JSON.stringify(stored) !== JSON.stringify(expected)) throw new Error(`context mismatch block=${item.block} arm=${arm}`);
  const q = stored.typedPeerObject.acceptanceProbability;
  if (q !== null) {
    const value = item.acceptedMarkIncrement * q;
    if (Math.abs(stored.typedPeerObject.markExpectedValue! - round6(value)) > 1e-12) throw new Error("mark value arithmetic mismatch");
    if (Math.abs(stored.typedPeerObject.expectedNetSell! - round6(value - item.keepCheckValue)) > 1e-12) throw new Error("net value arithmetic mismatch");
  }
}

function completeBlockNumbers(records: readonly PeerConflictRecord[]): number[] {
  return PEER_CONFLICT_CASES.filter((item) => {
    const rows = records.filter((record) => record.block === item.block);
    return rows.length === PEER_CONFLICT_ARMS.length && new Set(rows.map((row) => row.arm)).size === PEER_CONFLICT_ARMS.length;
  }).map((item) => item.block);
}

function validateRecords(records: readonly PeerConflictRecord[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    const item = PEER_CONFLICT_CASES[record.block - 1];
    if (!item || !PEER_CONFLICT_ARMS.includes(record.arm)) throw new Error(`unknown peer-conflict record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate peer-conflict record ${key}`);
    seen.add(key);
    if (record.position !== peerConflictOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!/^[0-9a-f]{64}$/.test(record.promptHash) || record.promptHash !== sha256PeerConflict(peerConflictPrompt(record.arm, item))) throw new Error(`prompt hash mismatch ${key}`);
    validateContext(record.context, record.arm, item);
    parsePeerConflict(JSON.stringify({ sell: record.sell }));
  }
}

function average(xs: readonly number[]): number { return xs.reduce((sum, x) => sum + x, 0) / xs.length; }
function choose(n: number, k: number): number { let out = 1; for (let i = 1; i <= k; i++) out = out * (n - k + i) / i; return out; }
function exactUpperDiscordantP(positive: number, negative: number): number | null {
  const n = positive + negative;
  if (!n) return null;
  let tail = 0;
  for (let k = positive; k <= n; k++) tail += choose(n, k);
  return tail / 2 ** n;
}
function row(records: readonly PeerConflictRecord[], block: number, arm: PeerConflictArm): PeerConflictRecord {
  const found = records.find((record) => record.block === block && record.arm === arm);
  if (!found) throw new Error(`missing ${block}|${arm}`);
  return found;
}
function contrast(records: readonly PeerConflictRecord[], blocks: readonly number[], left: PeerConflictArm, right: PeerConflictArm): PeerConflictContrast {
  const values = blocks.map((block) => ({ block, delta: Number(row(records, block, left).sell) - Number(row(records, block, right).sell) }));
  const positive = values.filter((item) => item.delta > 0).length;
  const negative = values.filter((item) => item.delta < 0).length;
  return { n: values.length, mean: average(values.map((item) => item.delta)), positive, negative, ties: values.length - positive - negative, exactUpperP: exactUpperDiscordantP(positive, negative), values };
}

export function buildPeerConflictReport(recordsInput: PeerConflictRecord[], model: string): PeerConflictReport {
  validateRecords(recordsInput);
  const records = [...recordsInput].sort((a, b) => a.block - b.block || a.position - b.position);
  const blocks = completeBlockNumbers(records);
  const complete = blocks.length === PEER_CONFLICT_CASES.length;
  const byArm: PeerConflictReport["byArm"] = {};
  for (const arm of PEER_CONFLICT_ARMS) {
    const rows = records.filter((record) => record.arm === arm);
    if (rows.length) {
      const sell = rows.filter((record) => record.sell).length;
      byArm[arm] = { n: rows.length, sell, sellRate: sell / rows.length, rejectRate: 1 - sell / rows.length };
    }
  }
  const contradictedWithHighControl = complete ? average(blocks.map((block) => Number(row(records, block, "typed-contradicted").sell === row(records, block, "typed-high-control").sell))) : null;
  const contradictedWithHistory = complete ? average(blocks.map((block) => Number(row(records, block, "typed-contradicted").sell === row(records, block, "history-only").sell))) : null;
  const historyReject = Boolean(complete && byArm["history-only"]!.rejectRate >= HISTORY_REJECT_FLOOR);
  const consistentReject = Boolean(complete && byArm["typed-consistent"]!.rejectRate >= CONSISTENT_REJECT_FLOOR);
  const highControlSell = Boolean(complete && byArm["typed-high-control"]!.sellRate >= HIGH_CONTROL_SELL_FLOOR);
  const typedOverride = Boolean(complete && byArm["typed-contradicted"]!.sellRate >= OVERRIDE_ACTION_FLOOR && contradictedWithHighControl! >= OVERRIDE_AGREEMENT_FLOOR);
  const historyOverride = Boolean(complete && byArm["typed-contradicted"]!.sellRate <= OVERRIDE_ACTION_CEILING && contradictedWithHistory! >= OVERRIDE_AGREEMENT_FLOOR);
  let verdict: PeerConflictReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!highControlSell) verdict = "TYPED OBJECT NOT CONSUMED";
    else if (!historyReject || !consistentReject) verdict = "BASELINE OR CONSISTENCY FAILURE";
    else if (typedOverride) verdict = "TYPED OBJECT OVERRIDES RECENT HISTORY";
    else if (historyOverride) verdict = "RECENT HISTORY OVERRIDES TYPED OBJECT";
    else verdict = "SOURCE CONFLICT DESTABILIZES ACTION";
  }
  const orderBalanced = complete && PEER_CONFLICT_ARMS.every((arm) => [0, 1, 2, 3].every((position) => PEER_CONFLICT_CASES.filter((item) => peerConflictOrder(item.block)[position] === arm).length === 6));
  const pairwisePrecedenceBalanced = complete && PEER_CONFLICT_ARMS.every((left) => PEER_CONFLICT_ARMS.every((right) => left === right || PEER_CONFLICT_CASES.filter((item) => peerConflictOrder(item.block).indexOf(left) < peerConflictOrder(item.block).indexOf(right)).length === 12));
  return {
    study: "VBE-E-TPCD-TYPED-PEER-CONFLICT",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-peer-probability-conflict-protocol.md",
    model,
    cases: PEER_CONFLICT_CASES,
    records,
    calls: records.length,
    completeBlocks: blocks.length,
    byArm,
    contrasts: {
      highControlMinusHistory: complete ? contrast(records, blocks, "typed-high-control", "history-only") : null,
      contradictedMinusHistory: complete ? contrast(records, blocks, "typed-contradicted", "history-only") : null,
      highControlMinusContradicted: complete ? contrast(records, blocks, "typed-high-control", "typed-contradicted") : null,
    },
    agreement: { contradictedWithHighControl, contradictedWithHistory },
    gates: { historyReject, consistentReject, highControlSell, typedOverride, historyOverride },
    integrity: { expectedCalls: 96, retainedCalls: records.length, failedCallsRetained: 0, casesValid: true, promptsValid: true, schemasValid: true, orderBalanced, pairwisePrecedenceBalanced },
    verdict,
    caveat: "This sealed diagnostic identifies action-level consumption and source precedence under an intentionally conflicted prompt. It does not establish which source is true, latent belief, mediation, causal reasoning, full-environment behavior, training mechanisms, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
