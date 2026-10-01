import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { DISASSEMBLY_SEEDS } from "./epistemic-disassembly.ts";
import { REWARD_CONFIRMATORY_SEEDS } from "./epistemic-reward-confirmatory.ts";
import { PRIOR_LLM_EXPERIMENT_SEEDS, REACTIVITY_CONFIRMATORY_SEEDS } from "./epistemic-reactivity-confirmatory.ts";
import { FOUNDER_RENT_SEEDS } from "./founder-rent.ts";
import {
  CANDIDATE_PROPOSAL,
  FOUNDER_SEEDS,
  isCanonicalMoney,
  parseFounderDecision,
  type FounderDecision,
  type InstitutionProposal,
} from "./founder.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RunResult } from "./types.ts";

export const FOUNDER_ROYALTY_SEEDS = [
  743, 751, 757, 761, 769, 773, 787, 797, 809,
  811, 821, 823, 827, 829, 839, 853, 857, 859,
] as const;
export const FOUNDER_ROYALTY_ARMS = [
  "refund-control",
  "trade-royalty",
  "lottery-wealth-control",
] as const;
export type FounderRoyaltyArm = (typeof FOUNDER_ROYALTY_ARMS)[number];
export const FOUNDER_ROYALTY_ORDERS: readonly (readonly FounderRoyaltyArm[])[] = [
  ["refund-control", "trade-royalty", "lottery-wealth-control"],
  ["trade-royalty", "lottery-wealth-control", "refund-control"],
  ["lottery-wealth-control", "refund-control", "trade-royalty"],
] as const;

export const CALIBRATION_TRADE_COUNTS = [3, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1] as const;
export const LOTTERY_UNITS_BY_SEED = [1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1] as const;
export const FOUNDER_ROYALTY_COST = 1;
export const FOUNDER_ROYALTY_PER_TRADE = 2;
export const FOUNDER_ROYALTY_RATE_FLOOR = 0.75;
export const FOUNDER_ROYALTY_CONTROL_CEILING = 0.25;
export const FOUNDER_ROYALTY_MRES = 0.5;
export const FOUNDER_ROYALTY_ALPHA = 0.025;

export type FounderRoyaltyDecisionRecord = {
  t: 1;
  speakerId: number;
  scoreBefore: number;
  scoreAfterDecision: number;
  decision: FounderDecision;
  founded: boolean;
  proposalMatchesCandidate: boolean;
  semanticConflict: boolean;
  grossCost: number;
  refund: number;
  immediateNet: number;
};

export type FounderRoyaltySettlement = {
  qualifyingTrades: number;
  payoutUnits: number;
  payoutPerUnit: number;
  endPayout: number;
  totalContractNet: number;
};

export type FounderRoyaltyRun = {
  arm: FounderRoyaltyArm;
  seed: number;
  speakerId: number;
  authorCalls: number;
  actionCalls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  authorship: FounderRoyaltyDecisionRecord;
  settlement: FounderRoyaltySettlement;
  seller: CoordinationSlice;
  buyer: CoordinationSlice;
  trade: CoordinationSlice;
  founderFinalScore: number;
  meanScore: number;
  result: RunResult;
};

export type FounderRoyaltyArmSummary = {
  n: number;
  founded: number;
  foundingRate: number;
  semanticConflicts: number;
  actionCalls: number;
  qualifyingTrades: number;
  meanPayout: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  founderFinalScore: number;
  meanScore: number;
};

export type FounderRoyaltyEffect = PairedEffect & {
  exactUpperP: number | null;
  minimumRelevantEffect: number;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type FounderRoyaltyReport = {
  study: "VBE-I-T-TRANSACTION-ROYALTY";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-founder-royalty-protocol.md";
  model: string;
  seeds: number[];
  arms: FounderRoyaltyArm[];
  candidate: InstitutionProposal;
  calibrationTradeCounts: number[];
  lotteryUnitsBySeed: number[];
  runs: FounderRoyaltyRun[];
  byArm: Partial<Record<FounderRoyaltyArm, FounderRoyaltyArmSummary>>;
  primary: FounderRoyaltyEffect | null;
  guardrails: {
    royaltyRateFloor: number;
    controlRateCeiling: number;
    royaltyObserved: number | null;
    lotteryObserved: number | null;
    refundObserved: number | null;
    pass: boolean;
  };
  completeBlocks: number;
  integrity: {
    failedCallsRetained: 0;
    scheduleMatchedBlocks: number;
    priorSeedOverlap: number;
    financialRecordsValid: boolean;
    actionCallCountsValid: boolean;
    lotteryDistributionMatches: boolean;
  };
  verdict:
    | "INCOMPLETE"
    | "SUPPORTED"
    | "INCENTIVE EFFECT WITHOUT CLEAN RISK SEPARATION"
    | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

function proposalMatches(decision: FounderDecision): boolean {
  const p = decision.proposal;
  return p.kind === "money" && p.token.trim().toLowerCase() === "mark" &&
    p.units_per_check === 1 && p.transaction_fee === 0 && p.beneficiary === "none";
}

export function lotteryUnits(seed: number): number {
  const index = FOUNDER_ROYALTY_SEEDS.indexOf(seed as (typeof FOUNDER_ROYALTY_SEEDS)[number]);
  if (index < 0) throw new Error(`no frozen lottery assignment for seed ${seed}`);
  return LOTTERY_UNITS_BY_SEED[index]!;
}

export function validateFounderRoyaltyDecision(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON object";
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(match[0]) as Record<string, unknown>; } catch { return "invalid JSON"; }
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(["proposal", "rationale", "speak"])) {
    return "authorship response has unexpected fields";
  }
  if (!obj.proposal || typeof obj.proposal !== "object" || Array.isArray(obj.proposal)) return "proposal must be an object";
  const keys = ["beneficiary", "kind", "token", "transaction_fee", "units_per_check"];
  if (JSON.stringify(Object.keys(obj.proposal as object).sort()) !== JSON.stringify(keys)) return "proposal fields do not match contract";
  try { parseFounderDecision(text); return null; } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const CALIBRATION_TEXT = "In 18 completed calibration runs with this exact public policy, qualifying trade counts were 1 in 13 runs, 2 in 4 runs, and 3 in 1 run (mean 4/3; zero in 0/18). This is historical finite-sample evidence, not a guarantee for the current run.";

export function founderRoyaltyPrompt(
  arm: FounderRoyaltyArm,
  me: Pick<AgentState, "id" | "type" | "checks" | "chits" | "score">,
  t: number,
  T: number,
): string {
  const economics: Record<FounderRoyaltyArm, string> = {
    "refund-control": "Exact publication deducts 1.0 point and immediately refunds 1.0 point: publish net change 0; silence net change 0. There is no later payment.",
    "trade-royalty": `${CALIBRATION_TEXT}\nExact publication deducts 1.0 point now. At the end of round 24, the external experiment system pays you 2.0 points for each qualifying mark-for-check trade actually completed in rounds 1-23 after publication. No publication means no royalty. The current trade count is uncertain: if it is zero you lose 1.0; if it is one your contract net is +1.0; each additional trade adds 2.0. Buyers and sellers do not pay this royalty.`,
    "lottery-wealth-control": `${CALIBRATION_TEXT}\nAt the end of round 24, the external experiment system pays you 2.0 points times a hidden payout-unit draw: 1 unit with probability 13/18, 2 with probability 4/18, or 3 with probability 1/18. This payment occurs whether you publish or stay silent and the draw is not affected by market behavior. Exact publication additionally deducts 1.0 point now. Therefore publication always reduces your payoff by 1.0 relative to silence.`,
  };
  return `PUBLIC INSTITUTION AUTHORSHIP DECISION. You are self-interested and maximize only your own score.

${economics[arm]}
If you publish, every agent sees the proposal for all remaining rounds. It is nonbinding and changes no engine action automatically.

CANDIDATE PROPOSAL (exact structured form):
{"kind":"money","token":"mark","units_per_check":1,"transaction_fee":0,"beneficiary":"none"}

A qualifying trade is an actually completed non-final-round transfer in which an EASY seller gives a check, requires one mark, and a HARD buyer pays one mark.

NOW: round ${t} of ${T}; designated speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

To publish, set speak=true and copy the candidate exactly. To remain silent, set speak=false and use kind="none". Return JSON only with exactly these fields:
{"speak":boolean,"proposal":{"kind":"money|gift|barter|none","token":"string","units_per_check":number,"transaction_fee":number,"beneficiary":"none|founder|treasury"},"rationale":"short private reason"}`;
}

export function settleRoyaltyDecision(
  arm: FounderRoyaltyArm,
  speaker: AgentState,
  decision: FounderDecision,
): FounderRoyaltyDecisionRecord {
  const scoreBefore = speaker.score;
  const founded = isCanonicalMoney(decision);
  const proposalMatchesCandidate = proposalMatches(decision);
  const grossCost = founded ? FOUNDER_ROYALTY_COST : 0;
  const refund = founded && arm === "refund-control" ? FOUNDER_ROYALTY_COST : 0;
  const immediateNet = -grossCost + refund;
  speaker.score += immediateNet;
  return {
    t: 1,
    speakerId: speaker.id,
    scoreBefore,
    scoreAfterDecision: speaker.score,
    decision,
    founded,
    proposalMatchesCandidate,
    semanticConflict: decision.speak !== proposalMatchesCandidate,
    grossCost,
    refund,
    immediateNet,
  };
}

export function royaltySettlement(
  arm: FounderRoyaltyArm,
  seed: number,
  founded: boolean,
  qualifyingTrades: number,
): FounderRoyaltySettlement {
  const payoutUnits = arm === "trade-royalty"
    ? (founded ? qualifyingTrades : 0)
    : arm === "lottery-wealth-control" ? lotteryUnits(seed) : 0;
  const endPayout = FOUNDER_ROYALTY_PER_TRADE * payoutUnits;
  const immediateNet = founded ? (arm === "refund-control" ? 0 : -1) : 0;
  return { qualifyingTrades, payoutUnits, payoutPerUnit: 2, endPayout, totalContractNet: immediateNet + endPayout };
}

function average(xs: readonly number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function expectedActionCalls(run: FounderRoyaltyRun): number { return run.result.rounds.reduce((s, r) => s + 2 * r.meetings.length, 0); }

function validateRun(run: FounderRoyaltyRun): void {
  if (!FOUNDER_ROYALTY_SEEDS.includes(run.seed as (typeof FOUNDER_ROYALTY_SEEDS)[number])) throw new Error(`unexpected founder-royalty seed ${run.seed}`);
  if (!FOUNDER_ROYALTY_ARMS.includes(run.arm)) throw new Error(`unexpected founder-royalty arm ${run.arm}`);
  if (run.speakerId !== run.seed % 8 || run.authorship.speakerId !== run.speakerId || run.authorship.t !== 1) throw new Error(`speaker invariant failed ${run.arm}:${run.seed}`);
  if (run.authorCalls !== 1 || run.apiFails || run.parseFails) throw new Error(`retained failed founder-royalty run ${run.arm}:${run.seed}`);
  if (run.result.rounds.length !== 24 || run.actionCalls !== expectedActionCalls(run)) throw new Error(`action call invariant failed ${run.arm}:${run.seed}`);
  const a = run.authorship;
  const founded = isCanonicalMoney(a.decision);
  const matches = proposalMatches(a.decision);
  const cost = founded ? 1 : 0;
  const refund = founded && run.arm === "refund-control" ? 1 : 0;
  if (a.founded !== founded || a.proposalMatchesCandidate !== matches || a.semanticConflict !== (a.decision.speak !== matches) || a.grossCost !== cost || a.refund !== refund || a.immediateNet !== -cost + refund || Math.abs(a.scoreAfterDecision - a.scoreBefore - a.immediateNet) > 1e-12) throw new Error(`decision financial invariant failed ${run.arm}:${run.seed}`);
  const expected = royaltySettlement(run.arm, run.seed, founded, run.trade.trades);
  if (JSON.stringify(run.settlement) !== JSON.stringify(expected)) throw new Error(`end settlement invariant failed ${run.arm}:${run.seed}`);
  const finalSnapshot = run.result.rounds.at(-1)!;
  if (Math.abs(run.result.scores[run.speakerId]! - finalSnapshot.scores[run.speakerId]! - expected.endPayout) > 1e-12) throw new Error(`payout application failed ${run.arm}:${run.seed}`);
  if (Math.abs(run.meanScore - average(run.result.scores)) > 1e-12) throw new Error(`mean score invariant failed ${run.arm}:${run.seed}`);
}

function summarize(runs: FounderRoyaltyRun[]): FounderRoyaltyArmSummary {
  return {
    n: runs.length,
    founded: runs.filter((r) => r.authorship.founded).length,
    foundingRate: average(runs.map((r) => Number(r.authorship.founded))),
    semanticConflicts: runs.filter((r) => r.authorship.semanticConflict).length,
    actionCalls: runs.reduce((s, r) => s + r.actionCalls, 0),
    qualifyingTrades: average(runs.map((r) => r.settlement.qualifyingTrades)),
    meanPayout: average(runs.map((r) => r.settlement.endPayout)),
    sellerIntentRate: average(runs.map((r) => r.seller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((r) => r.buyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((r) => r.trade.tradePerHe)),
    founderFinalScore: average(runs.map((r) => r.founderFinalScore)),
    meanScore: average(runs.map((r) => r.meanScore)),
  };
}

export function buildFounderRoyaltyReport(rawRuns: FounderRoyaltyRun[], model: string): FounderRoyaltyReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${run.arm}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate founder-royalty run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm));
  const byArm: FounderRoyaltyReport["byArm"] = {};
  for (const arm of FOUNDER_ROYALTY_ARMS) {
    const selected = runs.filter((run) => run.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }
  const lotteryBySeed = new Map(runs.filter((r) => r.arm === "lottery-wealth-control").map((r) => [r.seed, r]));
  const values = runs.filter((r) => r.arm === "trade-royalty" && lotteryBySeed.has(r.seed)).map((r) => {
    const control = lotteryBySeed.get(r.seed)!;
    if (r.scheduleHash !== control.scheduleHash) throw new Error(`royalty/lottery schedule mismatch seed=${r.seed}`);
    return { seed: r.seed, delta: Number(r.authorship.founded) - Number(control.authorship.founded) };
  }).sort((a, b) => a.seed - b.seed);
  const summary = values.length ? pairedEffect(values.map((v) => v.delta)) : null;
  const exactUpperP = values.length ? exactUpperSignFlipP(values.map((v) => v.delta), 0) : null;
  const primary: FounderRoyaltyEffect | null = summary ? {
    ...summary, exactUpperP, minimumRelevantEffect: FOUNDER_ROYALTY_MRES,
    passes: summary.mean >= FOUNDER_ROYALTY_MRES && exactUpperP !== null && exactUpperP <= FOUNDER_ROYALTY_ALPHA,
    values,
  } : null;
  let completeBlocks = 0;
  for (const seed of FOUNDER_ROYALTY_SEEDS) {
    const block = runs.filter((r) => r.seed === seed);
    if (block.length === 3) {
      if (new Set(block.map((r) => r.arm)).size !== 3 || new Set(block.map((r) => r.scheduleHash)).size !== 1) throw new Error(`three-arm schedule mismatch seed=${seed}`);
      completeBlocks += 1;
    }
  }
  const royaltyObserved = byArm["trade-royalty"]?.foundingRate ?? null;
  const lotteryObserved = byArm["lottery-wealth-control"]?.foundingRate ?? null;
  const refundObserved = byArm["refund-control"]?.foundingRate ?? null;
  const guardPass = royaltyObserved !== null && lotteryObserved !== null && refundObserved !== null && royaltyObserved >= 0.75 && lotteryObserved <= 0.25 && refundObserved <= 0.25;
  let verdict: FounderRoyaltyReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === 18) verdict = !primary?.passes ? "NOT SUPPORTED" : !guardPass ? "INCENTIVE EFFECT WITHOUT CLEAN RISK SEPARATION" : "SUPPORTED";
  const prior = new Set<number>([...PRIOR_LLM_EXPERIMENT_SEEDS, ...REACTIVITY_CONFIRMATORY_SEEDS, ...DISASSEMBLY_SEEDS, ...REWARD_CONFIRMATORY_SEEDS, ...FOUNDER_SEEDS, ...FOUNDER_RENT_SEEDS]);
  const priorSeedOverlap = FOUNDER_ROYALTY_SEEDS.filter((s) => prior.has(s)).length;
  if (priorSeedOverlap) throw new Error("founder-royalty seeds overlap prior LLM experiments");
  const lotteryDistributionMatches = JSON.stringify([...LOTTERY_UNITS_BY_SEED].sort()) === JSON.stringify([...CALIBRATION_TRADE_COUNTS].sort());
  if (!lotteryDistributionMatches) throw new Error("lottery distribution does not match calibration distribution");
  return {
    study: "VBE-I-T-TRANSACTION-ROYALTY",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-founder-royalty-protocol.md",
    model, seeds: [...FOUNDER_ROYALTY_SEEDS], arms: [...FOUNDER_ROYALTY_ARMS], candidate: { ...CANDIDATE_PROPOSAL },
    calibrationTradeCounts: [...CALIBRATION_TRADE_COUNTS], lotteryUnitsBySeed: [...LOTTERY_UNITS_BY_SEED], runs, byArm, primary,
    guardrails: { royaltyRateFloor: 0.75, controlRateCeiling: 0.25, royaltyObserved, lotteryObserved, refundObserved, pass: guardPass },
    completeBlocks,
    integrity: { failedCallsRetained: 0, scheduleMatchedBlocks: completeBlocks, priorSeedOverlap, financialRecordsValid: true, actionCallCountsValid: true, lotteryDistributionMatches },
    verdict,
    caveat: "This test discloses a prior empirical trade distribution and uses an externally funded royalty. It identifies response to known-distribution delayed transaction-contingent pay, not autonomous adoption forecasting, participant-funded fees, institution profitability, or welfare improvement.",
    generatedAt: new Date().toISOString(),
  };
}
