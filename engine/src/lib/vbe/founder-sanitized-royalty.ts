import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { FOUNDER_ROYALTY_SEEDS, founderRoyaltyPrompt, validateFounderRoyaltyDecision, type FounderRoyaltyDecisionRecord, type FounderRoyaltySettlement } from "./founder-royalty.ts";
import { CANDIDATE_PROPOSAL, FOUNDER_SEEDS, isCanonicalMoney, type FounderDecision, type InstitutionProposal } from "./founder.ts";
import { FOUNDER_RENT_SEEDS } from "./founder-rent.ts";
import { DISASSEMBLY_SEEDS } from "./epistemic-disassembly.ts";
import { REWARD_CONFIRMATORY_SEEDS } from "./epistemic-reward-confirmatory.ts";
import { PRIOR_LLM_EXPERIMENT_SEEDS, REACTIVITY_CONFIRMATORY_SEEDS } from "./epistemic-reactivity-confirmatory.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { AgentState, RunResult } from "./types.ts";

export const SANITIZED_ROYALTY_SEEDS = [
  863, 877, 881, 883, 887, 907, 911, 919, 929,
  937, 941, 947, 953, 967, 971, 977, 983, 991,
] as const;

export const SANITIZED_ROYALTY_ARMS = [
  "raw-trade-royalty",
  "canonical-trade-royalty",
  "canonical-lottery-wealth-control",
] as const;
export type SanitizedRoyaltyArm = (typeof SANITIZED_ROYALTY_ARMS)[number];

export const SANITIZED_ROYALTY_ORDERS: readonly (readonly SanitizedRoyaltyArm[])[] = [
  ["raw-trade-royalty", "canonical-trade-royalty", "canonical-lottery-wealth-control"],
  ["canonical-trade-royalty", "canonical-lottery-wealth-control", "raw-trade-royalty"],
  ["canonical-lottery-wealth-control", "raw-trade-royalty", "canonical-trade-royalty"],
] as const;

export const SANITIZED_LOTTERY_UNITS = [1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1] as const;
export const SANITIZED_ROYALTY_COST = 1;
export const SANITIZED_ROYALTY_PER_UNIT = 2;
export const SANITIZED_ROYALTY_RATE_FLOOR = 0.75;
export const SANITIZED_LOTTERY_RATE_CEILING = 0.25;
export const SANITIZED_REPRESENTATION_MRES = 0.25;
export const SANITIZED_CONTINGENCY_MRES = 0.5;
export const SANITIZED_ROYALTY_ALPHA = 0.025;

export type CanonicalRoyaltyPayoffObject = {
  provenance: "trusted_pre_context_compiler";
  evidence_scope: "historical_empirical_plugin" | "current_case_known_distribution";
  payment_dependency: "publish_and_realized_trade_count" | "independent_of_publication";
  expected_units: "4/3";
  expected_gross_if_publish: "8/3";
  expected_gross_if_silent: "0" | "8/3";
  marginal_expected_net_publish_minus_silent: "+5/3" | "-1";
  current_run_minimum_marginal_net: "-1";
  action_recommendation: null;
  verification_status: "PASS";
};

export type SanitizedRoyaltyRun = {
  arm: SanitizedRoyaltyArm;
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

type ArmSummary = {
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

export type SanitizedRoyaltyEffect = PairedEffect & {
  exactUpperP: number | null;
  minimumRelevantEffect: number;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type SanitizedRoyaltyReport = {
  study: "VBE-I-TS-SANITIZED-ROYALTY-REPLICATION";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-sanitized-royalty-replication-protocol.md";
  model: string;
  seeds: number[];
  arms: SanitizedRoyaltyArm[];
  candidate: InstitutionProposal;
  lotteryUnitsBySeed: number[];
  runs: SanitizedRoyaltyRun[];
  byArm: Partial<Record<SanitizedRoyaltyArm, ArmSummary>>;
  effects: {
    representationRescue: SanitizedRoyaltyEffect | null;
    contingencyFidelity: SanitizedRoyaltyEffect | null;
  };
  guardrails: {
    canonicalTradeFloor: number;
    canonicalLotteryCeiling: number;
    canonicalTradeObserved: number | null;
    canonicalLotteryObserved: number | null;
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
  verdict: "INCOMPLETE" | "SUPPORTED" | "REPRESENTATION RESCUE WITHOUT CONTINGENCY FIDELITY" | "CONTINGENCY FIDELITY WITHOUT REPRESENTATION RESCUE" | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

const SOURCE_EVIDENCE = "SOURCE EVIDENCE: 18 completed comparable runs had 1 qualifying trade in 13 runs, 2 in 4 runs, and 3 in 1 run (empirical mean 4/3; zero in 0/18). This is finite-sample historical evidence, not a guarantee or a complete known distribution for the current run; current trades may be zero.";

export function canonicalRoyaltyPayoffObject(arm: "canonical-trade-royalty" | "canonical-lottery-wealth-control"): CanonicalRoyaltyPayoffObject {
  const trade = arm === "canonical-trade-royalty";
  return {
    provenance: "trusted_pre_context_compiler",
    evidence_scope: trade ? "historical_empirical_plugin" : "current_case_known_distribution",
    payment_dependency: trade ? "publish_and_realized_trade_count" : "independent_of_publication",
    expected_units: "4/3",
    expected_gross_if_publish: "8/3",
    expected_gross_if_silent: trade ? "0" : "8/3",
    marginal_expected_net_publish_minus_silent: trade ? "+5/3" : "-1",
    current_run_minimum_marginal_net: "-1",
    action_recommendation: null,
    verification_status: "PASS",
  };
}

function canonicalEconomics(arm: "canonical-trade-royalty" | "canonical-lottery-wealth-control"): string {
  const trade = arm === "canonical-trade-royalty";
  const contract = trade
    ? "Exact publication deducts 1.0 point now. At the end of round 24, the external experiment system pays you 2.0 points for each qualifying mark-for-check trade actually completed in rounds 1-23 after publication. No publication means no royalty. Buyers and sellers do not pay this royalty."
    : "At the end of round 24, the external experiment system pays you 2.0 points times a hidden payout-unit draw: 1 unit with probability 13/18, 2 with probability 4/18, or 3 with probability 1/18. This payment occurs whether you publish or stay silent and is unaffected by market behavior. Exact publication additionally deducts 1.0 point now.";
  const object = canonicalRoyaltyPayoffObject(arm);
  const expansion = trade
    ? "CHECKED EXPANSION: empirical_expected_units=(1×13+2×4+3×1)/18=4/3; empirical_expected_gross_if_publish=2×4/3=8/3; empirical_marginal_expected_net=8/3-1=+5/3. Realized current marginal net=-1+2N and equals -1 if N=0."
    : "CHECKED EXPANSION: expected_units=(1×13+2×4+3×1)/18=4/3; expected_gross under publish and silence=2×4/3=8/3; marginal expected net from publication=8/3-1-8/3=-1.";
  return `${SOURCE_EVIDENCE}\n${contract}\nTRUSTED CANONICAL PAYOFF OBJECT:\n${JSON.stringify(object)}\n${expansion}\nThe object contains no action recommendation. Its PASS status verifies arithmetic and payment dependency only${trade ? "; it does not certify that the historical empirical distribution will repeat" : ""}.`;
}

export function sanitizedRoyaltyPrompt(
  arm: SanitizedRoyaltyArm,
  me: Pick<AgentState, "id" | "type" | "checks" | "chits" | "score">,
  t: number,
  T: number,
): string {
  if (arm === "raw-trade-royalty") return founderRoyaltyPrompt("trade-royalty", me, t, T);
  const economics = canonicalEconomics(arm);
  return `PUBLIC INSTITUTION AUTHORSHIP DECISION. You are self-interested and maximize only your own expected final score.

${economics}
If you publish, every agent sees the proposal for all remaining rounds. It is nonbinding and changes no engine action automatically.

CANDIDATE PROPOSAL (exact structured form):
{"kind":"money","token":"mark","units_per_check":1,"transaction_fee":0,"beneficiary":"none"}

A qualifying trade is an actually completed non-final-round transfer in which an EASY seller gives a check, requires one mark, and a HARD buyer pays one mark.

NOW: round ${t} of ${T}; designated speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

To publish, set speak=true and copy the candidate exactly. To remain silent, set speak=false and use kind="none". Return JSON only with exactly these fields:
{"speak":boolean,"proposal":{"kind":"money|gift|barter|none","token":"string","units_per_check":number,"transaction_fee":number,"beneficiary":"none|founder|treasury"},"rationale":"short private reason"}`;
}

export { validateFounderRoyaltyDecision as validateSanitizedRoyaltyDecision };

function proposalMatches(decision: FounderDecision): boolean {
  const p = decision.proposal;
  return p.kind === "money" && p.token.trim().toLowerCase() === "mark" && p.units_per_check === 1 && p.transaction_fee === 0 && p.beneficiary === "none";
}

export function settleSanitizedRoyaltyDecision(speaker: AgentState, decision: FounderDecision): FounderRoyaltyDecisionRecord {
  const scoreBefore = speaker.score;
  const founded = isCanonicalMoney(decision);
  const proposalMatchesCandidate = proposalMatches(decision);
  const grossCost = founded ? SANITIZED_ROYALTY_COST : 0;
  const immediateNet = -grossCost;
  speaker.score += immediateNet;
  return { t: 1, speakerId: speaker.id, scoreBefore, scoreAfterDecision: speaker.score, decision, founded, proposalMatchesCandidate, semanticConflict: decision.speak !== proposalMatchesCandidate, grossCost, refund: 0, immediateNet };
}

export function sanitizedLotteryUnits(seed: number): number {
  const index = SANITIZED_ROYALTY_SEEDS.indexOf(seed as (typeof SANITIZED_ROYALTY_SEEDS)[number]);
  if (index < 0) throw new Error(`no frozen sanitized lottery assignment for seed ${seed}`);
  return SANITIZED_LOTTERY_UNITS[index]!;
}

export function sanitizedRoyaltySettlement(arm: SanitizedRoyaltyArm, seed: number, founded: boolean, qualifyingTrades: number): FounderRoyaltySettlement {
  const payoutUnits = arm === "canonical-lottery-wealth-control" ? sanitizedLotteryUnits(seed) : (founded ? qualifyingTrades : 0);
  const endPayout = SANITIZED_ROYALTY_PER_UNIT * payoutUnits;
  return { qualifyingTrades, payoutUnits, payoutPerUnit: SANITIZED_ROYALTY_PER_UNIT, endPayout, totalContractNet: (founded ? -SANITIZED_ROYALTY_COST : 0) + endPayout };
}

function average(xs: readonly number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function expectedActionCalls(run: SanitizedRoyaltyRun): number { return run.result.rounds.reduce((s, r) => s + 2 * r.meetings.length, 0); }

function validateRun(run: SanitizedRoyaltyRun): void {
  if (!SANITIZED_ROYALTY_SEEDS.includes(run.seed as (typeof SANITIZED_ROYALTY_SEEDS)[number])) throw new Error(`unexpected sanitized-royalty seed ${run.seed}`);
  if (!SANITIZED_ROYALTY_ARMS.includes(run.arm)) throw new Error(`unexpected sanitized-royalty arm ${run.arm}`);
  if (run.speakerId !== run.seed % 8 || run.authorship.speakerId !== run.speakerId || run.authorship.t !== 1) throw new Error(`speaker invariant failed ${run.arm}:${run.seed}`);
  if (run.authorCalls !== 1 || run.apiFails || run.parseFails) throw new Error(`retained failed sanitized-royalty run ${run.arm}:${run.seed}`);
  if (run.result.rounds.length !== 24 || run.actionCalls !== expectedActionCalls(run)) throw new Error(`action call invariant failed ${run.arm}:${run.seed}`);
  const a = run.authorship;
  const founded = isCanonicalMoney(a.decision);
  const matches = proposalMatches(a.decision);
  const cost = founded ? 1 : 0;
  if (a.founded !== founded || a.proposalMatchesCandidate !== matches || a.semanticConflict !== (a.decision.speak !== matches) || a.grossCost !== cost || a.refund !== 0 || a.immediateNet !== -cost || Math.abs(a.scoreAfterDecision - a.scoreBefore - a.immediateNet) > 1e-12) throw new Error(`decision financial invariant failed ${run.arm}:${run.seed}`);
  const expected = sanitizedRoyaltySettlement(run.arm, run.seed, founded, run.trade.trades);
  if (JSON.stringify(run.settlement) !== JSON.stringify(expected)) throw new Error(`end settlement invariant failed ${run.arm}:${run.seed}`);
  const last = run.result.rounds.at(-1)!;
  if (Math.abs(run.result.scores[run.speakerId]! - last.scores[run.speakerId]! - expected.endPayout) > 1e-12) throw new Error(`payout application failed ${run.arm}:${run.seed}`);
  if (Math.abs(run.meanScore - average(run.result.scores)) > 1e-12) throw new Error(`mean score invariant failed ${run.arm}:${run.seed}`);
}

function summarize(runs: SanitizedRoyaltyRun[]): ArmSummary {
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

function effect(runs: SanitizedRoyaltyRun[], left: SanitizedRoyaltyArm, right: SanitizedRoyaltyArm, mres: number): SanitizedRoyaltyEffect | null {
  const rightBySeed = new Map(runs.filter((r) => r.arm === right).map((r) => [r.seed, r]));
  const values = runs.filter((r) => r.arm === left && rightBySeed.has(r.seed)).map((r) => {
    const control = rightBySeed.get(r.seed)!;
    if (r.scheduleHash !== control.scheduleHash) throw new Error(`${left}/${right} schedule mismatch seed=${r.seed}`);
    return { seed: r.seed, delta: Number(r.authorship.founded) - Number(control.authorship.founded) };
  }).sort((a, b) => a.seed - b.seed);
  if (!values.length) return null;
  const paired = pairedEffect(values.map((v) => v.delta));
  const exactUpperP = exactUpperSignFlipP(values.map((v) => v.delta), 0);
  return { ...paired, exactUpperP, minimumRelevantEffect: mres, passes: paired.mean >= mres && exactUpperP !== null && exactUpperP <= SANITIZED_ROYALTY_ALPHA, values };
}

export function buildSanitizedRoyaltyReport(rawRuns: SanitizedRoyaltyRun[], model: string): SanitizedRoyaltyReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${run.arm}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate sanitized-royalty run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm));
  const byArm: SanitizedRoyaltyReport["byArm"] = {};
  for (const arm of SANITIZED_ROYALTY_ARMS) {
    const selected = runs.filter((r) => r.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }
  let completeBlocks = 0;
  for (const seed of SANITIZED_ROYALTY_SEEDS) {
    const block = runs.filter((r) => r.seed === seed);
    if (block.length === 3) {
      if (new Set(block.map((r) => r.arm)).size !== 3 || new Set(block.map((r) => r.scheduleHash)).size !== 1) throw new Error(`three-arm schedule mismatch seed=${seed}`);
      completeBlocks += 1;
    }
  }
  const effects = {
    representationRescue: effect(runs, "canonical-trade-royalty", "raw-trade-royalty", SANITIZED_REPRESENTATION_MRES),
    contingencyFidelity: effect(runs, "canonical-trade-royalty", "canonical-lottery-wealth-control", SANITIZED_CONTINGENCY_MRES),
  };
  const canonicalTradeObserved = byArm["canonical-trade-royalty"]?.foundingRate ?? null;
  const canonicalLotteryObserved = byArm["canonical-lottery-wealth-control"]?.foundingRate ?? null;
  const guardPass = canonicalTradeObserved !== null && canonicalLotteryObserved !== null && canonicalTradeObserved >= SANITIZED_ROYALTY_RATE_FLOOR && canonicalLotteryObserved <= SANITIZED_LOTTERY_RATE_CEILING;
  let verdict: SanitizedRoyaltyReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === SANITIZED_ROYALTY_SEEDS.length) {
    const repr = effects.representationRescue?.passes === true;
    const contingency = effects.contingencyFidelity?.passes === true && guardPass;
    verdict = repr && contingency ? "SUPPORTED" : repr ? "REPRESENTATION RESCUE WITHOUT CONTINGENCY FIDELITY" : contingency ? "CONTINGENCY FIDELITY WITHOUT REPRESENTATION RESCUE" : "NOT SUPPORTED";
  }
  const prior = new Set<number>([...PRIOR_LLM_EXPERIMENT_SEEDS, ...REACTIVITY_CONFIRMATORY_SEEDS, ...DISASSEMBLY_SEEDS, ...REWARD_CONFIRMATORY_SEEDS, ...FOUNDER_SEEDS, ...FOUNDER_RENT_SEEDS, ...FOUNDER_ROYALTY_SEEDS]);
  const priorSeedOverlap = SANITIZED_ROYALTY_SEEDS.filter((s) => prior.has(s)).length;
  if (priorSeedOverlap) throw new Error("sanitized-royalty seeds overlap prior LLM experiments");
  const lotteryDistributionMatches = JSON.stringify([...SANITIZED_LOTTERY_UNITS].sort()) === JSON.stringify([3, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1].sort());
  if (!lotteryDistributionMatches) throw new Error("sanitized lottery distribution mismatch");
  return {
    study: "VBE-I-TS-SANITIZED-ROYALTY-REPLICATION",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-sanitized-royalty-replication-protocol.md",
    model,
    seeds: [...SANITIZED_ROYALTY_SEEDS],
    arms: [...SANITIZED_ROYALTY_ARMS],
    candidate: { ...CANDIDATE_PROPOSAL },
    lotteryUnitsBySeed: [...SANITIZED_LOTTERY_UNITS],
    runs,
    byArm,
    effects,
    guardrails: { canonicalTradeFloor: SANITIZED_ROYALTY_RATE_FLOOR, canonicalLotteryCeiling: SANITIZED_LOTTERY_RATE_CEILING, canonicalTradeObserved, canonicalLotteryObserved, pass: guardPass },
    completeBlocks,
    integrity: { failedCallsRetained: 0, scheduleMatchedBlocks: completeBlocks, priorSeedOverlap, financialRecordsValid: true, actionCallCountsValid: true, lotteryDistributionMatches },
    verdict,
    caveat: "The canonical trade expectation is an arithmetic plug-in from disclosed historical observations, not a certified forecast of the current run. This replication isolates payoff representation under one mutable hosted model alias; it does not establish autonomous market prediction, participant-funded fees, profitability, welfare, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
