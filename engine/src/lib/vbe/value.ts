import type { VbeParams } from "./params.ts";

/**
 * A deliberately narrow marginal-value model for Gate 0.
 *
 * Assumptions:
 * - the evaluated agent has just acquired one mark;
 * - it can spend the mark at most once and does not reacquire another one;
 * - identities are paired uniformly and exactly n/2 agents are Easy each round;
 * - a constant share of eligible Easy counterparties accepts the mark;
 * - strategic responses, inventory congestion, and resale are omitted.
 *
 * This is exact for those assumptions and the engine's type/pairing process. It
 * is not the full multi-agent equilibrium value function.
 */

export function markSpendGain(params: VbeParams): number {
  return params.R * (params.pPartner - params.pHard);
}

export function validateValueParams(params: VbeParams): void {
  if (!Number.isInteger(params.n) || params.n < 2 || params.n % 2 !== 0) {
    throw new Error("value model requires an even population n >= 2");
  }
  if (params.q < 0 || params.q > 1) throw new Error("q must be in [0,1]");
  if (params.pHard < 0 || params.pHard > 1) {
    throw new Error("pHard must be in [0,1]");
  }
  if (params.pPartner < 0 || params.pPartner > 1) {
    throw new Error("pPartner must be in [0,1]");
  }
  if (markSpendGain(params) <= 0) {
    throw new Error("partner verification must have positive incremental value");
  }
}

/**
 * Probability, per future round, that a mark holder can spend when every
 * eligible Easy counterparty accepts.
 *
 * P(self is H) = 1/2. Conditional on self being H, exactly n/2 of the n-1
 * possible partners are E because the engine assigns exactly n/2 H and n/2 E.
 */
export function universalSpendOpportunity(params: VbeParams): number {
  validateValueParams(params);
  return params.q * 0.5 * ((params.n / 2) / (params.n - 1));
}

export function spendOpportunity(
  acceptanceShare: number,
  params: VbeParams,
): number {
  if (acceptanceShare < 0 || acceptanceShare > 1) {
    throw new Error("acceptanceShare must be in [0,1]");
  }
  return universalSpendOpportunity(params) * acceptanceShare;
}

export function finiteMarginalMarkValue(
  futureRounds: number,
  acceptanceShare: number,
  params: VbeParams,
): number {
  if (!Number.isInteger(futureRounds) || futureRounds < 0) {
    throw new Error("futureRounds must be a non-negative integer");
  }
  const x = spendOpportunity(acceptanceShare, params);
  const probabilityEverSpent = 1 - (1 - x) ** futureRounds;
  return probabilityEverSpent * markSpendGain(params);
}

export function finiteBreakEvenShare(
  futureRounds: number,
  params: VbeParams,
): number | null {
  if (!Number.isInteger(futureRounds) || futureRounds <= 0) return null;
  const targetUseProbability = params.v / markSpendGain(params);
  if (targetUseProbability > 1) return null;
  const requiredRoundProbability =
    1 - (1 - targetUseProbability) ** (1 / futureRounds);
  const share = requiredRoundProbability / universalSpendOpportunity(params);
  return share <= 1 ? Math.max(0, share) : null;
}

export function minimumCommittedCount(
  breakEvenShare: number | null,
  params: VbeParams,
): number | null {
  if (breakEvenShare === null) return null;
  const k = Math.ceil(breakEvenShare * (params.n - 1) - 1e-12);
  return k <= params.n - 1 ? k : null;
}

export function geometricMarginalMarkValue(
  continuationProbability: number,
  acceptanceShare: number,
  params: VbeParams,
): number {
  if (continuationProbability < 0 || continuationProbability >= 1) {
    throw new Error("continuationProbability must be in [0,1)");
  }
  const x = spendOpportunity(acceptanceShare, params);
  const eventualUse = x / (1 - (1 - x) * continuationProbability);
  return eventualUse * markSpendGain(params);
}

export function geometricBreakEvenShare(
  continuationProbability: number,
  params: VbeParams,
): number | null {
  if (geometricMarginalMarkValue(continuationProbability, 1, params) < params.v) {
    return null;
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (geometricMarginalMarkValue(continuationProbability, mid, params) >= params.v) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return high;
}

export type CoordinationWindow = {
  firstRound: number;
  lastRound: number;
  rounds: number[];
};

/**
 * Rounds where committed acceptors alone do not justify buying a mark, but
 * universal acceptance would. Acquiring at round t leaves T-t future rounds.
 */
export function coordinationWindow(
  committedCount: number,
  params: VbeParams,
): CoordinationWindow | null {
  if (!Number.isInteger(committedCount) || committedCount < 0 || committedCount >= params.n) {
    throw new Error("committedCount must be an integer in [0,n-1]");
  }
  const floorShare = committedCount / (params.n - 1);
  const rounds: number[] = [];
  for (let t = 1; t < params.T; t++) {
    const futureRounds = params.T - t;
    const floorValue = finiteMarginalMarkValue(futureRounds, floorShare, params);
    const universalValue = finiteMarginalMarkValue(futureRounds, 1, params);
    if (floorValue < params.v && universalValue >= params.v) rounds.push(t);
  }
  if (!rounds.length) return null;
  return {
    firstRound: rounds[0]!,
    lastRound: rounds[rounds.length - 1]!,
    rounds,
  };
}

