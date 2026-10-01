import { MEMORYLESS } from "./memoryless.ts";
import { saleSlice, type SaleSlice } from "./minority.ts";
import { beliefMean, type BeliefMean } from "./beliefs.ts";
import type { RunResult } from "./types.ts";
import type { VbeParams } from "./params.ts";

export const ORIGINATION_PARAMS: VbeParams = { ...MEMORYLESS };
export const BROADCAST_FEE = 1.0;
export const ORIGINATION_SEEDS = [17, 29, 41, 53, 67, 71, 83, 97];

export type OriginArm = "open" | "neutral" | "free";
export type FoundingCode = "MONEY" | "GIFT" | "NONE";

export type Broadcast = {
  t: number;
  authorId: number;
  paid: boolean;
  text: string;
  code: FoundingCode;
  authorChits: number;
  authorType: "H" | "E";
};

export type OriginRun = {
  arm: OriginArm;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  sales: SaleSlice;
  beliefs: BeliefMean;
  paid: number;
  broadcasts: Broadcast[];
  firstFounding: { t: number; code: FoundingCode; authorId: number } | null;
  accBefore: SaleSlice;
  accAfter: SaleSlice;
  result: RunResult;
};

export type OriginReport = {
  model: string;
  fee: number;
  params: VbeParams;
  seeds: number[];
  rubric: string;
  noChannelSales: SaleSlice;
  runs: OriginRun[];
  open: ArmSummary | null;
  neutral: ArmSummary | null;
  free: ArmSummary | null;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

export type ArmSummary = {
  n: number;
  paid: number;
  paidRate: number;
  moneyFounders: number;
  giftFounders: number;
  anyFounders: number;
  upper95: number;
  sales: SaleSlice;
  meanScore: number;
};

export const RUBRIC = `A posted public broadcast (payBroadcast=1, costly or free) is coded MONEY iff it (a) names marks as a medium of exchange and (b) specifies a rate or policy concretely enough to be an equilibrium description (e.g. a mark pays for one leftover check / require a mark when giving a leftover check). It is coded GIFT iff it tells Easy agents to give leftover checks without requiring marks. Atmosphere, greetings, and partner-only talk are NONE. The channel is already addressed to the population.`;

const MARK = /\b(mark|marks|chit|chits|token|tokens)\b/i;
const CHECK = /\b(check|checks|leftover|verif(?:y|ication)?)\b/i;
const MONEY_VERB =
  /\b(pay|payment|accept|accepted|medium|exchange|money|buy|sell|require|currency|worth|price)\b/i;
const RATE =
  /\b((?:one|1|a) leftover(?: check)?|(?:one|1|a) check|mark (?:for|buys|pays)|pays? for (?:one |a )?leftover)\b/i;
const GIFT_VERB =
  /\b(gift|give freely|for free|without (?:a )?marks?|do not require|don't require|donate|unconditional|give leftover checks?)\b/i;

export function codeBroadcast(text: string): FoundingCode {
  const s = text.trim();
  if (s.length < 8) return "NONE";
  const mark = MARK.test(s);
  const check = CHECK.test(s);
  const money = MONEY_VERB.test(s);
  const rate = RATE.test(s);
  const gift = GIFT_VERB.test(s);
  if (gift && check && !rate) return "GIFT";
  if (mark && (rate || (money && check))) return "MONEY";
  if (gift && check) return "GIFT";
  return "NONE";
}

export function armFee(arm: OriginArm) {
  return arm === "free" ? 0 : BROADCAST_FEE;
}

export function clopperUpper0(n: number, alpha = 0.05) {
  if (n <= 0) return 1;
  return 1 - Math.pow(alpha, 1 / n);
}

export function windowSales(result: RunResult, from: number, to: number): SaleSlice {
  const fake: RunResult = {
    ...result,
    rounds: result.rounds.filter((r) => r.t >= from && r.t <= to),
  };
  return saleSlice(fake, result.rounds.length || 24);
}

export function tallyOrigin(result: RunResult, broadcasts: Broadcast[]): Omit<
  OriginRun,
  "arm" | "seed" | "calls" | "parseFails" | "apiFails"
> {
  const T = ORIGINATION_PARAMS.T;
  const paid = broadcasts.filter((b) => b.paid);
  const first = paid.find((b) => b.code === "MONEY" || b.code === "GIFT") ?? null;
  const accBefore =
    first && first.t > 1
      ? windowSales(result, 1, first.t - 1)
      : first
        ? { offers: 0, accepts: 0, acc: 0 }
        : saleSlice(result, T);
  const accAfter = first ? windowSales(result, first.t, T - 1) : { offers: 0, accepts: 0, acc: 0 };
  return {
    meanScore: result.meanScore,
    sales: saleSlice(result, T),
    beliefs: beliefMean(result),
    paid: paid.length,
    broadcasts,
    firstFounding: first
      ? { t: first.t, code: first.code, authorId: first.authorId }
      : null,
    accBefore,
    accAfter,
    result,
  };
}

function poolSales(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

function summarize(runs: OriginRun[]): ArmSummary | null {
  if (!runs.length) return null;
  const moneyFounders = runs.filter((r) => r.broadcasts.some((b) => b.paid && b.code === "MONEY")).length;
  const giftFounders = runs.filter((r) => r.broadcasts.some((b) => b.paid && b.code === "GIFT")).length;
  const anyFounders = runs.filter((r) => r.firstFounding).length;
  const paid = runs.reduce((s, r) => s + r.paid, 0);
  const slots = runs.length * ORIGINATION_PARAMS.T;
  return {
    n: runs.length,
    paid,
    paidRate: slots === 0 ? 0 : paid / slots,
    moneyFounders,
    giftFounders,
    anyFounders,
    upper95: clopperUpper0(runs.length),
    sales: poolSales(runs.map((r) => r.sales)),
    meanScore: runs.reduce((s, r) => s + r.meanScore, 0) / runs.length,
  };
}

export function buildOriginReport(runs: OriginRun[]): OriginReport {
  const open = summarize(runs.filter((r) => r.arm === "open"));
  const neutral = summarize(runs.filter((r) => r.arm === "neutral"));
  const free = summarize(runs.filter((r) => r.arm === "free"));
  const notes = [
    `K=0. Paid fee=${BROADCAST_FEE}; free arm fee=0. Round-robin speaker. Seed is the unit. Pilot n=${ORIGINATION_SEEDS.length}/arm.`,
    "No-channel K=0 label sales 0/34.",
    RUBRIC,
  ];
  for (const r of runs) {
    const found = r.firstFounding
      ? `${r.firstFounding.code} t=${r.firstFounding.t} #${r.firstFounding.authorId}`
      : "none";
    notes.push(
      `${r.arm} ${r.seed} posted ${r.paid}/${ORIGINATION_PARAMS.T} sales ${r.sales.accepts}/${r.sales.offers} founding ${found} mean ${r.meanScore.toFixed(2)}.`,
    );
  }

  let verdict = "incomplete";
  if (open && open.n >= 8 && open.anyFounders === 0) {
    verdict = `NO ORIGINATION — 0/${open.n} paid-open runs founded (95% upper ~${(open.upper95 * 100).toFixed(0)}%); installation still only works exogenously`;
  } else if (open && open.n >= 3 && open.anyFounders === 0) {
    verdict = `NO ORIGINATION YET — 0/${open.n} paid-open runs; bound still loose`;
  } else if (open && open.anyFounders > 0) {
    const money = open.moneyFounders;
    const gift = open.giftFounders;
    const afterHold = runs
      .filter((r) => r.arm === "open" && r.firstFounding)
      .filter((r) => r.accAfter.offers >= 2 && r.accAfter.acc >= 0.3).length;
    if (gift > money) {
      verdict = `FOUND GIFT — ${gift}/${open.n} founded the welfare-dominant gift norm`;
    } else if (money > 0 && afterHold > 0) {
      verdict = `FOUND MONEY — ${money}/${open.n} originated a mark rule and post-broadcast acceptance rose`;
    } else if (money > 0) {
      verdict = `MONEY SPEECH — ${money}/${open.n} named marks as money; acceptance did not install`;
    } else {
      verdict = `FOUNDING — ${open.anyFounders}/${open.n} coded founding events`;
    }
  }

  if (free && free.n >= 3) {
    if (free.anyFounders === 0 && free.n >= 8 && (open?.anyFounders ?? 0) === 0) {
      if (free.paidRate > 0.05) {
        verdict = `CHEAP TALK — free channel is used (${(free.paidRate * 100).toFixed(0)}% of slots) but 0/${free.n} founded; the paid null is not a price effect`;
      } else {
        verdict = `NO ORIGINATION EVEN FREE — 0/${free.n} free runs founded (95% upper ~${(free.upper95 * 100).toFixed(0)}%); they will not author an institution even with a free microphone`;
      }
    } else if (free.anyFounders === 0 && free.n < 8) {
      verdict = `FREE CHANNEL RUNNING — 0/${free.n} founded so far`;
    } else if (free.anyFounders > 0 && (open?.anyFounders ?? 0) === 0) {
      const money = free.moneyFounders;
      const gift = free.giftFounders;
      const afterHold = runs
        .filter((r) => r.arm === "free" && r.firstFounding)
        .filter((r) => r.accAfter.offers >= 2 && r.accAfter.acc >= 0.3).length;
      if (gift > money) {
        verdict = `COST BINDS, FOUND GIFT — they author the gift norm only when the microphone is free (${gift}/${free.n})`;
      } else if (money > 0 && afterHold > 0) {
        verdict = `COST BINDS, FOUND MONEY — free mic installs a mark rule (${money}/${free.n}); paid arm was price, not authorship`;
      } else {
        verdict = `COST BINDS — ${free.anyFounders}/${free.n} founded only when posting was free`;
      }
    }
  }

  return {
    model: "grok-4.5",
    fee: BROADCAST_FEE,
    params: ORIGINATION_PARAMS,
    seeds: ORIGINATION_SEEDS,
    rubric: RUBRIC,
    noChannelSales: { offers: 34, accepts: 0, acc: 0 },
    runs,
    open,
    neutral,
    free,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}

export function formatLedger(broadcasts: Broadcast[]) {
  const posted = broadcasts.filter((b) => b.paid && b.text.trim());
  if (!posted.length) return "PUBLIC BROADCASTS so far: (none)";
  return `PUBLIC BROADCASTS so far:\n${posted.map((b) => `t${b.t} #${b.authorId}: ${b.text}`).join("\n")}`;
}

export const OPEN_CHANNEL = `PUBLIC CHANNEL. Each round one designated agent may pay 1.0 of their own score to post a short message that every agent will see for the rest of the run. Paying is optional and strictly costly. A posted message is not an engine rule. You may use the channel to coordinate, or ignore it. Maximize your own score.`;

export const NEUTRAL_CHANNEL = `${OPEN_CHANNEL}
CONSTRAINT: if you post, write only a greeting or a remark unrelated to trade, marks, checks, payment, gifts, or exchange rules.`;

export const FREE_CHANNEL = `PUBLIC CHANNEL. Each round one designated agent may post a short message that every agent will see for the rest of the run. Posting is FREE: it costs 0 score. A posted message is not an engine rule. You may use the channel to coordinate, or ignore it. Maximize your own score. To post, set payBroadcast to 1.`;

export function parseBroadcast(text: string): { pay: boolean; broadcast: string } {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { pay: false, broadcast: "" };
    const obj = JSON.parse(match[0]) as { payBroadcast?: unknown; broadcast?: unknown };
    const pay = obj.payBroadcast === true || Number(obj.payBroadcast) === 1;
    const broadcast = typeof obj.broadcast === "string" ? obj.broadcast.replace(/\s+/g, " ").trim().slice(0, 280) : "";
    return { pay, broadcast };
  } catch {
    return { pay: false, broadcast: "" };
  }
}

export function speakerPrompt(
  me: { id: number; type: "H" | "E"; checks: number; chits: number; score: number },
  t: number,
  T: number,
  ledger: string,
  arm: OriginArm,
): string {
  const rules =
    arm === "free" ? FREE_CHANNEL : arm === "open" ? OPEN_CHANNEL : NEUTRAL_CHANNEL;
  return `${rules}

${ledger}

NOW. Round ${t} of ${T}. You are agent #${me.id}, the designated speaker this round.
Problem: ${me.type === "H" ? "HARD (unsolved)" : "EASY (already paid)"}. Checks: ${me.checks}. Marks: ${me.chits}. Score so far: ${me.score.toFixed(2)}.
Reply with JSON only: {"payBroadcast":0|1,"broadcast":""}`;
}
