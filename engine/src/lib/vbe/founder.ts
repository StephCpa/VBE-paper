import { MODEL } from "./llm.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export const FOUNDER_FEE = 1;
export const FOUNDER_SEEDS = [17, 29, 41, 53, 67, 71, 83, 97, 101, 103, 107, 109];
export type FounderArm = "costly" | "refund" | "external";
export type ProposalKind = "money" | "gift" | "barter" | "none";

export type InstitutionProposal = {
  kind: ProposalKind;
  token: string;
  units_per_check: number;
  transaction_fee: number;
  beneficiary: "none" | "founder" | "treasury";
};

export type FounderDecision = {
  speak: boolean;
  proposal: InstitutionProposal;
  rationale: string;
};

export type FoundingEvent = {
  t: number;
  authorId: number;
  arm: FounderArm;
  scoreBefore: number;
  grossCost: number;
  refund: number;
  netCost: number;
  decision: FounderDecision;
};

export type FounderRun = {
  arm: FounderArm;
  seed: number;
  calls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  founding: FoundingEvent | null;
  seller: CoordinationSlice;
  buyer: CoordinationSlice;
  trade: CoordinationSlice;
  meanScore: number;
  result: RunResult;
};

export type FounderSummary = {
  n: number;
  founded: number;
  foundingRate: number;
  meanFirstRound: number | null;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  meanScore: number;
};

export type FounderPairDelta = {
  seed: number;
  founded: number;
  firstRound: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  meanScore: number;
};

export type FounderReport = {
  model: string;
  fee: number;
  seeds: number[];
  candidate: InstitutionProposal;
  runs: FounderRun[];
  byArm: Partial<Record<FounderArm, FounderSummary>>;
  refundMinusCostly: FounderPairDelta[];
  verdict: string;
  generatedAt: string;
};

export const CANDIDATE_PROPOSAL: InstitutionProposal = {
  kind: "money",
  token: "mark",
  units_per_check: 1,
  transaction_fee: 0,
  beneficiary: "none",
};

export const CANONICAL_POLICY =
  "PUBLIC INSTITUTION PROPOSAL: In every non-final round, an EASY agent with a leftover check may offer it for exactly one mark by setting giveCheck=true and requireChit=true; a HARD agent holding a mark may buy that check by setting giveChits=1. The proposal is nonbinding and does not change engine payoffs.";

function jsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing JSON object");
  const parsed = JSON.parse(match[0]) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("response is not an object");
  }
  return parsed as Record<string, unknown>;
}

export function parseFounderDecision(text: string): FounderDecision {
  const obj = jsonObject(text);
  if (typeof obj.speak !== "boolean") throw new Error("speak must be boolean");
  if (!obj.proposal || typeof obj.proposal !== "object" || Array.isArray(obj.proposal)) {
    throw new Error("proposal must be an object");
  }
  const proposal = obj.proposal as Record<string, unknown>;
  if (!["money", "gift", "barter", "none"].includes(String(proposal.kind))) {
    throw new Error("invalid proposal.kind");
  }
  if (typeof proposal.token !== "string") throw new Error("proposal.token must be string");
  if (!Number.isFinite(proposal.units_per_check)) {
    throw new Error("proposal.units_per_check must be finite");
  }
  if (!Number.isFinite(proposal.transaction_fee)) {
    throw new Error("proposal.transaction_fee must be finite");
  }
  if (!["none", "founder", "treasury"].includes(String(proposal.beneficiary))) {
    throw new Error("invalid proposal.beneficiary");
  }
  if (typeof obj.rationale !== "string") throw new Error("rationale must be string");
  return {
    speak: obj.speak,
    proposal: {
      kind: proposal.kind as ProposalKind,
      token: proposal.token,
      units_per_check: Number(proposal.units_per_check),
      transaction_fee: Number(proposal.transaction_fee),
      beneficiary: proposal.beneficiary as InstitutionProposal["beneficiary"],
    },
    rationale: obj.rationale.replace(/\s+/g, " ").trim().slice(0, 300),
  };
}

export function isCanonicalMoney(decision: FounderDecision): boolean {
  const p = decision.proposal;
  return (
    decision.speak &&
    p.kind === "money" &&
    p.token.trim().toLowerCase() === "mark" &&
    p.units_per_check === 1 &&
    p.transaction_fee === 0 &&
    p.beneficiary === "none"
  );
}

export function founderPrompt(
  arm: Exclude<FounderArm, "external">,
  me: { id: number; type: "H" | "E"; checks: number; chits: number; score: number },
  t: number,
  T: number,
): string {
  const cost =
    arm === "refund"
      ? "Publishing costs 1.0 point, but the system immediately refunds exactly 1.0 point if and only if you publish the candidate proposal exactly. Its net publication cost is then 0."
      : "Publishing costs 1.0 point from your own score. There is no refund and no direct founder reward.";
  return `PUBLIC INSTITUTION AUTHORSHIP DECISION. You are self-interested and maximize only your own score.

${cost}
If you publish, every agent sees the proposal for all remaining rounds. It is nonbinding and changes no engine payoff or action automatically.

CANDIDATE PROPOSAL (exact structured form):
{"kind":"money","token":"mark","units_per_check":1,"transaction_fee":0,"beneficiary":"none"}

Meaning: in non-final rounds, an EASY seller may require one mark for a leftover check, and a HARD buyer holding a mark may offer it for that check.

NOW: round ${t} of ${T}; designated speaker #${me.id}; role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}.

To remain silent, set speak=false and use kind="none". Return JSON only:
{"speak":boolean,"proposal":{"kind":"money|gift|barter|none","token":"string","units_per_check":number,"transaction_fee":number,"beneficiary":"none|founder|treasury"},"rationale":"short private reason"}`;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function summarize(runs: FounderRun[]): FounderSummary {
  const foundedRuns = runs.filter((run) => run.founding);
  return {
    n: runs.length,
    founded: foundedRuns.length,
    foundingRate: runs.length ? foundedRuns.length / runs.length : 0,
    meanFirstRound: foundedRuns.length
      ? average(foundedRuns.map((run) => run.founding!.t))
      : null,
    sellerIntentRate: average(runs.map((run) => run.seller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((run) => run.buyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((run) => run.trade.tradePerHe)),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

export function buildFounderReport(runs: FounderRun[]): FounderReport {
  const byArm: FounderReport["byArm"] = {};
  for (const arm of ["costly", "refund", "external"] as FounderArm[]) {
    const selected = runs.filter((run) => run.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }
  const costlyBySeed = new Map(
    runs.filter((run) => run.arm === "costly").map((run) => [run.seed, run]),
  );
  const refundMinusCostly = runs
    .filter((run) => run.arm === "refund" && costlyBySeed.has(run.seed))
    .map((refund) => {
      const costly = costlyBySeed.get(refund.seed)!;
      if (refund.scheduleHash !== costly.scheduleHash) {
        throw new Error(`founder schedule mismatch for seed ${refund.seed}`);
      }
      return {
        seed: refund.seed,
        founded: Number(Boolean(refund.founding)) - Number(Boolean(costly.founding)),
        firstRound: (refund.founding?.t ?? 25) - (costly.founding?.t ?? 25),
        sellerIntentRate: refund.seller.sellerIntentPerHe - costly.seller.sellerIntentPerHe,
        buyerIntentRate: refund.buyer.buyerIntentPerHe - costly.buyer.buyerIntentPerHe,
        tradeRate: refund.trade.tradePerHe - costly.trade.tradePerHe,
        meanScore: refund.meanScore - costly.meanScore,
      };
    })
    .sort((a, b) => a.seed - b.seed);

  let verdict = "INCOMPLETE";
  const costly = byArm.costly;
  const refund = byArm.refund;
  const external = byArm.external;
  if (costly && refund && costly.n >= 12 && refund.n >= 12) {
    if (refund.foundingRate - costly.foundingRate >= 0.25) {
      verdict = "PILOT COST BARRIER — refunding publication cost increases institution authorship";
    } else if (refund.foundingRate === 0 && (external?.tradeRate ?? 0) >= 0.15) {
      verdict = "PILOT AUTHORSHIP GAP — external policy executes, but even refunded agents do not publish it";
    } else if (refund.foundingRate === 0) {
      verdict = "PILOT NO AUTHORSHIP — no proposal even with refunded publication cost";
    } else {
      verdict = "PILOT NO LARGE REFUND EFFECT — authorship is not strongly explained by publication cost";
    }
  }
  return {
    model: MODEL,
    fee: FOUNDER_FEE,
    seeds: FOUNDER_SEEDS,
    candidate: CANDIDATE_PROPOSAL,
    runs,
    byArm,
    refundMinusCostly,
    verdict,
    generatedAt: new Date().toISOString(),
  };
}

