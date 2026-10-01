import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { DISASSEMBLY_SEEDS } from "./epistemic-disassembly.ts";
import { REWARD_CONFIRMATORY_SEEDS } from "./epistemic-reward-confirmatory.ts";
import {
  PRIOR_LLM_EXPERIMENT_SEEDS,
  REACTIVITY_CONFIRMATORY_SEEDS,
} from "./epistemic-reactivity-confirmatory.ts";
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

export const FOUNDER_RENT_SEEDS = [
  619, 631, 641, 643, 647, 653, 659, 661, 673,
  677, 683, 691, 701, 709, 719, 727, 733, 739,
] as const;

export const FOUNDER_RENT_ARMS = [
  "refund-gate",
  "profit-bounty",
  "wealth-control",
] as const;
export type FounderRentArm = (typeof FOUNDER_RENT_ARMS)[number];

/** Three cyclic Latin orders, repeated six times across the frozen seeds. */
export const FOUNDER_RENT_ORDERS: readonly (readonly FounderRentArm[])[] = [
  ["refund-gate", "profit-bounty", "wealth-control"],
  ["profit-bounty", "wealth-control", "refund-gate"],
  ["wealth-control", "refund-gate", "profit-bounty"],
] as const;

export const FOUNDER_RENT_COST = 1;
export const FOUNDER_RENT_BOUNTY = 2;
export const FOUNDER_RENT_WEALTH_GRANT = 1;
export const FOUNDER_RENT_RATE_FLOOR = 0.75;
export const FOUNDER_RENT_CONTROL_CEILING = 0.25;
export const FOUNDER_RENT_MRES = 0.5;
export const FOUNDER_RENT_ALPHA = 0.025;

export type FounderRentDecisionRecord = {
  t: 1;
  speakerId: number;
  scoreBefore: number;
  decision: FounderDecision;
  proposalMatchesCandidate: boolean;
  founded: boolean;
  semanticConflict: boolean;
  grossCost: number;
  refund: number;
  bounty: number;
  unconditionalGrant: number;
  netScoreChange: number;
};

export type FounderRentRun = {
  arm: FounderRentArm;
  seed: number;
  speakerId: number;
  authorCalls: number;
  actionCalls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  authorship: FounderRentDecisionRecord;
  seller: CoordinationSlice;
  buyer: CoordinationSlice;
  trade: CoordinationSlice;
  founderFinalScore: number;
  meanScore: number;
  result: RunResult;
};

export type FounderRentArmSummary = {
  n: number;
  founded: number;
  foundingRate: number;
  semanticConflicts: number;
  actionCalls: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  founderFinalScore: number;
  meanScore: number;
};

export type FounderRentEffect = PairedEffect & {
  exactUpperP: number | null;
  minimumRelevantEffect: number;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type FounderRentReport = {
  study: "VBE-I-R-FOUNDER-RENT-GATE";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-founder-rent-gate-protocol.md";
  model: string;
  seeds: number[];
  arms: FounderRentArm[];
  candidate: InstitutionProposal;
  runs: FounderRentRun[];
  byArm: Partial<Record<FounderRentArm, FounderRentArmSummary>>;
  primary: FounderRentEffect | null;
  guardrails: {
    profitRateFloor: number;
    controlRateCeiling: number;
    profitObserved: number | null;
    wealthObserved: number | null;
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
  };
  verdict:
    | "INCOMPLETE"
    | "SUPPORTED"
    | "INCENTIVE EFFECT WITHOUT CLEAN CAPABILITY SEPARATION"
    | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

function exactProposal(decision: FounderDecision): boolean {
  const p = decision.proposal;
  return (
    p.kind === CANDIDATE_PROPOSAL.kind &&
    p.token.trim().toLowerCase() === CANDIDATE_PROPOSAL.token &&
    p.units_per_check === CANDIDATE_PROPOSAL.units_per_check &&
    p.transaction_fee === CANDIDATE_PROPOSAL.transaction_fee &&
    p.beneficiary === CANDIDATE_PROPOSAL.beneficiary
  );
}

export function validateFounderRentDecision(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON object";
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return "invalid JSON";
  }
  const topKeys = ["proposal", "rationale", "speak"];
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify(topKeys)) {
    return "authorship response has unexpected fields";
  }
  if (!obj.proposal || typeof obj.proposal !== "object" || Array.isArray(obj.proposal)) {
    return "proposal must be an object";
  }
  const proposalKeys = ["beneficiary", "kind", "token", "transaction_fee", "units_per_check"];
  if (
    JSON.stringify(Object.keys(obj.proposal as Record<string, unknown>).sort()) !==
    JSON.stringify(proposalKeys)
  ) return "proposal fields do not match contract";
  try {
    parseFounderDecision(text);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function founderRentPrompt(
  arm: FounderRentArm,
  me: Pick<AgentState, "id" | "type" | "checks" | "chits" | "score">,
  t: number,
  T: number,
): string {
  const economics: Record<FounderRentArm, string> = {
    "refund-gate":
      "If and only if you publish the candidate exactly, the system deducts 1.0 point and immediately refunds 1.0 point: publish net change 0; silence net change 0.",
    "profit-bounty":
      "If and only if you publish the candidate exactly, the system deducts 1.0 point and immediately pays a guaranteed 2.0-point bounty: publish net change +1.0; silence net change 0.",
    "wealth-control":
      "After this decision the system gives you +1.0 point unconditionally, whether you publish or stay silent. Exact publication additionally costs 1.0 point: publish net change 0; silence net change +1.0; therefore publication changes your payoff by -1.0 relative to silence.",
  };
  return `PUBLIC INSTITUTION AUTHORSHIP DECISION. You are self-interested and maximize only your own score.

${economics[arm]}
These transfers are immediate and certain. Future use of the proposal is uncertain and creates no additional founder payment in this run.
If you publish, every agent sees the proposal for all remaining rounds. It is nonbinding and changes no engine payoff or action automatically.

CANDIDATE PROPOSAL (exact structured form):
{"kind":"money","token":"mark","units_per_check":1,"transaction_fee":0,"beneficiary":"none"}

Meaning: in non-final rounds, an EASY seller may require one mark for a leftover check, and a HARD buyer holding a mark may offer it for that check.

NOW: round ${t} of ${T}; designated speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

To publish, set speak=true and copy the candidate proposal exactly. To remain silent, set speak=false and use kind="none". Return JSON only with exactly these fields:
{"speak":boolean,"proposal":{"kind":"money|gift|barter|none","token":"string","units_per_check":number,"transaction_fee":number,"beneficiary":"none|founder|treasury"},"rationale":"short private reason"}`;
}

export function settleFounderRentDecision(
  arm: FounderRentArm,
  speaker: AgentState,
  decision: FounderDecision,
): FounderRentDecisionRecord {
  const scoreBefore = speaker.score;
  const proposalMatchesCandidate = exactProposal(decision);
  const founded = isCanonicalMoney(decision);
  const semanticConflict = decision.speak !== proposalMatchesCandidate;
  const grossCost = founded ? FOUNDER_RENT_COST : 0;
  const refund = founded && arm === "refund-gate" ? FOUNDER_RENT_COST : 0;
  const bounty = founded && arm === "profit-bounty" ? FOUNDER_RENT_BOUNTY : 0;
  const unconditionalGrant = arm === "wealth-control" ? FOUNDER_RENT_WEALTH_GRANT : 0;
  const netScoreChange = -grossCost + refund + bounty + unconditionalGrant;
  speaker.score += netScoreChange;
  return {
    t: 1,
    speakerId: speaker.id,
    scoreBefore,
    decision,
    proposalMatchesCandidate,
    founded,
    semanticConflict,
    grossCost,
    refund,
    bounty,
    unconditionalGrant,
    netScoreChange,
  };
}

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function summarize(runs: FounderRentRun[]): FounderRentArmSummary {
  return {
    n: runs.length,
    founded: runs.filter((run) => run.authorship.founded).length,
    foundingRate: average(runs.map((run) => Number(run.authorship.founded))),
    semanticConflicts: runs.filter((run) => run.authorship.semanticConflict).length,
    actionCalls: runs.reduce((sum, run) => sum + run.actionCalls, 0),
    sellerIntentRate: average(runs.map((run) => run.seller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.buyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.trade.tradePerHe)),
    founderFinalScore: average(runs.map((run) => run.founderFinalScore)),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

function expectedActionCalls(run: FounderRentRun): number {
  return run.result.rounds.reduce((sum, round) => sum + 2 * round.meetings.length, 0);
}

function validateFinancialRecord(run: FounderRentRun): void {
  const a = run.authorship;
  if (a.t !== 1 || a.speakerId !== run.speakerId || run.speakerId !== run.seed % 8) {
    throw new Error(`speaker invariant failed ${run.arm}:${run.seed}`);
  }
  const expectedCost = a.founded ? 1 : 0;
  const expectedRefund = a.founded && run.arm === "refund-gate" ? 1 : 0;
  const expectedBounty = a.founded && run.arm === "profit-bounty" ? 2 : 0;
  const expectedGrant = run.arm === "wealth-control" ? 1 : 0;
  const expectedNet = -expectedCost + expectedRefund + expectedBounty + expectedGrant;
  if (
    a.proposalMatchesCandidate !== exactProposal(a.decision) ||
    a.founded !== isCanonicalMoney(a.decision) ||
    a.semanticConflict !== (a.decision.speak !== a.proposalMatchesCandidate) ||
    a.grossCost !== expectedCost ||
    a.refund !== expectedRefund ||
    a.bounty !== expectedBounty ||
    a.unconditionalGrant !== expectedGrant ||
    Math.abs(a.netScoreChange - expectedNet) > 1e-12
  ) throw new Error(`financial invariant failed ${run.arm}:${run.seed}`);
}

export function buildFounderRentReport(
  rawRuns: FounderRentRun[],
  model: string,
): FounderRentReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    if (!FOUNDER_RENT_SEEDS.includes(run.seed as (typeof FOUNDER_RENT_SEEDS)[number])) {
      throw new Error(`unexpected founder-rent seed ${run.seed}`);
    }
    if (!FOUNDER_RENT_ARMS.includes(run.arm)) throw new Error(`unexpected arm ${run.arm}`);
    if (run.authorCalls !== 1 || run.apiFails || run.parseFails) {
      throw new Error(`retained failed founder-rent run ${run.arm}:${run.seed}`);
    }
    if (run.result.rounds.length !== 24 || run.actionCalls !== expectedActionCalls(run)) {
      throw new Error(`action call invariant failed ${run.arm}:${run.seed}`);
    }
    validateFinancialRecord(run);
    const key = `${run.arm}:${run.seed}`;
    if (seen.has(key)) throw new Error(`duplicate founder-rent run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort(
    (a, b) => a.seed - b.seed || a.arm.localeCompare(b.arm),
  );
  const byArm: FounderRentReport["byArm"] = {};
  for (const arm of FOUNDER_RENT_ARMS) {
    const selected = runs.filter((run) => run.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }

  const wealthBySeed = new Map(
    runs.filter((run) => run.arm === "wealth-control").map((run) => [run.seed, run]),
  );
  const values = runs
    .filter((run) => run.arm === "profit-bounty" && wealthBySeed.has(run.seed))
    .map((run) => {
      const wealth = wealthBySeed.get(run.seed)!;
      if (run.scheduleHash !== wealth.scheduleHash) {
        throw new Error(`profit/wealth schedule mismatch seed=${run.seed}`);
      }
      return {
        seed: run.seed,
        delta: Number(run.authorship.founded) - Number(wealth.authorship.founded),
      };
    })
    .sort((a, b) => a.seed - b.seed);
  const summary = values.length ? pairedEffect(values.map((value) => value.delta)) : null;
  const exactUpperP = values.length
    ? exactUpperSignFlipP(values.map((value) => value.delta), 0)
    : null;
  const primary: FounderRentEffect | null = summary
    ? {
        ...summary,
        exactUpperP,
        minimumRelevantEffect: FOUNDER_RENT_MRES,
        passes:
          summary.mean >= FOUNDER_RENT_MRES &&
          exactUpperP !== null &&
          exactUpperP <= FOUNDER_RENT_ALPHA,
        values,
      }
    : null;

  let completeBlocks = 0;
  for (const seed of FOUNDER_RENT_SEEDS) {
    const block = runs.filter((run) => run.seed === seed);
    if (block.length === 3) {
      const arms = new Set(block.map((run) => run.arm));
      const hashes = new Set(block.map((run) => run.scheduleHash));
      if (arms.size !== 3 || hashes.size !== 1) {
        throw new Error(`three-arm schedule mismatch seed=${seed}`);
      }
      completeBlocks += 1;
    }
  }

  const profitObserved = byArm["profit-bounty"]?.foundingRate ?? null;
  const wealthObserved = byArm["wealth-control"]?.foundingRate ?? null;
  const refundObserved = byArm["refund-gate"]?.foundingRate ?? null;
  const guardrailPass =
    profitObserved !== null &&
    wealthObserved !== null &&
    refundObserved !== null &&
    profitObserved >= FOUNDER_RENT_RATE_FLOOR &&
    wealthObserved <= FOUNDER_RENT_CONTROL_CEILING &&
    refundObserved <= FOUNDER_RENT_CONTROL_CEILING;

  let verdict: FounderRentReport["verdict"] = "INCOMPLETE";
  if (completeBlocks === FOUNDER_RENT_SEEDS.length) {
    if (!primary?.passes) verdict = "NOT SUPPORTED";
    else if (!guardrailPass) verdict = "INCENTIVE EFFECT WITHOUT CLEAN CAPABILITY SEPARATION";
    else verdict = "SUPPORTED";
  }

  const prior = new Set<number>([
    ...PRIOR_LLM_EXPERIMENT_SEEDS,
    ...REACTIVITY_CONFIRMATORY_SEEDS,
    ...DISASSEMBLY_SEEDS,
    ...REWARD_CONFIRMATORY_SEEDS,
    ...FOUNDER_SEEDS,
  ]);
  const priorSeedOverlap = FOUNDER_RENT_SEEDS.filter((seed) => prior.has(seed)).length;
  if (priorSeedOverlap) throw new Error("founder-rent seeds overlap prior LLM experiments");

  return {
    study: "VBE-I-R-FOUNDER-RENT-GATE",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-founder-rent-gate-protocol.md",
    model,
    seeds: [...FOUNDER_RENT_SEEDS],
    arms: [...FOUNDER_RENT_ARMS],
    candidate: { ...CANDIDATE_PROPOSAL },
    runs,
    byArm,
    primary,
    guardrails: {
      profitRateFloor: FOUNDER_RENT_RATE_FLOOR,
      controlRateCeiling: FOUNDER_RENT_CONTROL_CEILING,
      profitObserved,
      wealthObserved,
      refundObserved,
      pass: guardrailPass,
    },
    completeBlocks,
    integrity: {
      failedCallsRetained: 0,
      scheduleMatchedBlocks: completeBlocks,
      priorSeedOverlap,
      financialRecordsValid: true,
      actionCallCountsValid: true,
    },
    verdict,
    caveat:
      "This is a strictly profitable authorship capability gate under an exogenous guaranteed bounty. It does not show that agents can forecast risky transaction-contingent rents, that institutions improve welfare, or that the result generalizes beyond this model alias and interface.",
    generatedAt: new Date().toISOString(),
  };
}
