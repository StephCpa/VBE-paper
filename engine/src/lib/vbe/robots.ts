import type { AgentState, Proposal, StrategyFn, StrategyName } from "./types.ts";

export type { StrategyName };

export const neverTrade: StrategyFn = () => ({
  giveCheck: false,
  giveChits: 0,
  requireChit: false,
});

/** Double-coincidence only: H–H check swaps. Ignores marks. */
export const barter: StrategyFn = (me, partner) => {
  if (me.type === "H" && partner.type === "H" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  return { giveCheck: false, giveChits: 0, requireChit: false };
};

/** H–H swaps plus help if this partner helped me recently. */
export const reciprocity: StrategyFn = (me, partner) => {
  if (me.type === "H" && partner.type === "H" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  const helped = me.memory.some(
    (m) => m.partnerId === partner.id && m.gotCheck,
  );
  if (helped && me.type === "E" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  return { giveCheck: false, giveChits: 0, requireChit: false };
};

/**
 * Kiyotaki–Wright: barter on double coincidence; otherwise sell leftover
 * checks for marks, buy checks with marks. Last-round sellers refuse
 * (marks have no future).
 */
export const kw: StrategyFn = (me, partner, t, T) => {
  if (me.type === "H" && partner.type === "H" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  const last = t === T;
  if (me.type === "H" && partner.type === "E" && me.chits >= 1) {
    return { giveCheck: false, giveChits: 1, requireChit: false };
  }
  if (me.type === "E" && partner.type === "H" && me.checks >= 1) {
    if (last) return { giveCheck: false, giveChits: 0, requireChit: false };
    return { giveCheck: true, giveChits: 0, requireChit: true };
  }
  return { giveCheck: false, giveChits: 0, requireChit: false };
};

/** Easy agents gift leftover checks to Hard agents. Sucker test. */
export const altruist: StrategyFn = (me, partner) => {
  if (me.type === "H" && partner.type === "H" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  if (me.type === "E" && partner.type === "H" && me.checks >= 1) {
    return { giveCheck: true, giveChits: 0, requireChit: false };
  }
  return { giveCheck: false, giveChits: 0, requireChit: false };
};

export const STRATEGIES: Record<StrategyName, StrategyFn> = {
  never: neverTrade,
  barter,
  reciprocity,
  kw,
  altruist,
};

export const STRATEGY_LABELS: Record<StrategyName, string> = {
  never: "Never-trade",
  barter: "Barter (H–H)",
  reciprocity: "Reciprocity",
  kw: "Kiyotaki–Wright",
  altruist: "Altruist",
};

export function idleProposal(): Proposal {
  return { giveCheck: false, giveChits: 0, requireChit: false, forfeit: 0 };
}

export function partnerHelped(me: AgentState, partnerId: number): boolean {
  return me.memory.some((m) => m.partnerId === partnerId && m.gotCheck);
}
