/**
 * X2 zero-call boundary audit for the third AAMAS review round.
 *
 * Every quantity is a pure function of the frozen W-CO, W-RG and W-SGB
 * artifacts replayed through the frozen engine by X1. No model or API call is
 * made, and no frozen study file, protocol, or X1 result is changed.
 *
 * X2 answers the reviewer's "immediate, zero new calls" requests:
 *   1. endgame giving by exact round, with meetings and seeds as units;
 *   2. first-meeting versus prior-meeting giving compared within the same
 *      exact round (round 1 cannot contain history, so pooling rounds 1-2 is
 *      confounded by round);
 *   3. giving after an unreciprocated transfer, split by whether the current
 *      partner is the account that failed to reciprocate;
 *   4. named-gift decay with explicit numerators, denominators and seeds
 *      under two encounter definitions (account meeting index versus index
 *      within the directed role cell);
 *   5. seed-clustered uncertainty: bootstrap bands for the pooled dynamics
 *      curves, per-component intervals for the welfare accounting, and
 *      seed-clustered tests for first-decision and same-prompt discrepancies.
 *
 * All analyses are descriptive with respect to the frozen studies: history,
 * round, and partner are not randomized, so none identifies a mechanism.
 */
import { bootstrapMean95 } from "./epistemic-analysis.ts";
import { exactTwoSidedSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { mulberry32 } from "./rng.ts";
import type { AgentType, Meeting } from "./types.ts";
import {
  P, accountRun, cellOf, isGive,
  type Decision, type DirectedCell, type FrozenRun, type TransactionCategory,
} from "./welfare-review-x1.ts";

export const X2_VERSION = "1.0" as const;
export const BOOT_SAMPLES = 20_000;
export const BOOT_SEED = 20_261_008;

const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : Number.NaN);

// ---------------------------------------------------------------------------
// Decision context: meeting index, cell index, and the previous meeting
// ---------------------------------------------------------------------------

export type PrevMeeting = {
  t: number; partnerId: number; partnerType: AgentType; cell: DirectedCell;
  /** Realized (executed) outcome as shown in the agent's memory. */
  gave: boolean; got: boolean;
};

export type ContextDecision = Decision & {
  cell: DirectedCell;
  /** n-th meeting of this account in the run, any role (1 = first). */
  meetingIndex: number;
  /** n-th decision of this account in the same directed cell (1 = first). */
  cellIndex: number;
  prev: PrevMeeting | null;
  /** Realized outcomes of every earlier meeting of this account, oldest first. */
  history: PrevMeeting[];
};

/** Realized give/receive flags for one participant of a frozen meeting. */
export function realizedFlags(m: Pick<Meeting, "kind" | "seller" | "buyer">, id: number): { gave: boolean; got: boolean } {
  if (m.kind === "swap") return { gave: true, got: true };
  if (m.kind === "gift" || m.kind === "chit-for-check") return { gave: m.seller === id, got: m.buyer === id };
  return { gave: false, got: false };
}

/**
 * Attach run-level context to every replayed decision. The previous meeting's
 * outcome is the executed one recorded by the frozen engine, which is what the
 * agent's own memory displays (W-RG filters can make it differ from the
 * original proposal).
 */
export function withContext(decisions: readonly Decision[], runs: readonly FrozenRun[]): ContextDecision[] {
  const meetings = new Map<string, Meeting>();
  for (const run of runs) for (const round of run.result.rounds) for (const m of round.meetings) {
    meetings.set(`${run.arm}|${run.seed}|${round.t}|${m.i}`, m);
    meetings.set(`${run.arm}|${run.seed}|${round.t}|${m.j}`, m);
  }
  const groups = new Map<string, Decision[]>();
  for (const x of decisions) {
    const g = `${x.study}|${x.arm}|${x.seed}|${x.id}`;
    const list = groups.get(g) ?? []; list.push(x); groups.set(g, list);
  }
  const out: ContextDecision[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.t - b.t);
    const history: PrevMeeting[] = [];
    const cellCount = new Map<DirectedCell, number>();
    sorted.forEach((x, k) => {
      const cell = cellOf(x.meType, x.partnerType);
      const ci = (cellCount.get(cell) ?? 0) + 1;
      cellCount.set(cell, ci);
      out.push({ ...x, cell, meetingIndex: k + 1, cellIndex: ci, prev: history.at(-1) ?? null, history: [...history] });
      const m = meetings.get(`${x.arm}|${x.seed}|${x.t}|${x.id}`);
      if (!m) throw new Error(`no frozen meeting for ${x.study} ${x.arm} seed=${x.seed} t=${x.t} id=${x.id}`);
      history.push({ t: x.t, partnerId: x.partnerId, partnerType: x.partnerType, cell, ...realizedFlags(m, x.id) });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Seed-clustered resampling
// ---------------------------------------------------------------------------

export type Rate = { gives: number; decisions: number; seeds: number; rate: number };

export function rateOf(xs: readonly Decision[]): Rate {
  const gives = xs.filter(x => isGive(x.original)).length;
  return { gives, decisions: xs.length, seeds: new Set(xs.map(x => `${x.study}|${x.seed}`)).size, rate: xs.length ? gives / xs.length : Number.NaN };
}

/**
 * Percentile bootstrap that resamples whole seeds (clusters) with replacement
 * and recomputes a statistic of the pooled decisions. Seeds are stratified by
 * study, so a pooled multi-study statistic keeps each study's seed count.
 */
export function clusterBootstrap<T extends Decision>(
  xs: readonly T[], stat: (sample: T[]) => number,
  samples = BOOT_SAMPLES, seed = BOOT_SEED,
): [number, number] | null {
  const strata = new Map<string, Map<number, T[]>>();
  for (const x of xs) {
    const s = strata.get(x.study) ?? new Map<number, T[]>();
    const list = s.get(x.seed) ?? []; list.push(x); s.set(x.seed, list);
    strata.set(x.study, s);
  }
  const clusters = [...strata.values()].map(s => [...s.values()]);
  if (!clusters.length) return null;
  const rng = mulberry32(seed);
  const vals: number[] = [];
  for (let b = 0; b < samples; b++) {
    const sample: T[] = [];
    for (const c of clusters) for (let k = 0; k < c.length; k++) sample.push(...c[Math.floor(rng() * c.length)]!);
    const v = stat(sample);
    if (Number.isFinite(v)) vals.push(v);
  }
  if (vals.length < samples * 0.5) return null;
  vals.sort((a, b) => a - b);
  return [vals[Math.floor(0.025 * (vals.length - 1))]!, vals[Math.floor(0.975 * (vals.length - 1))]!];
}

const pooledRate = (xs: readonly Decision[]) => rateOf(xs).rate;

// ---------------------------------------------------------------------------
// 1. Endgame by exact round
// ---------------------------------------------------------------------------

export type EndgameRow = {
  label: string; cell: DirectedCell;
  final: Rate & { meetings: number; bothGaveMeetings: number | null };
  lastThree: Rate;
  rounds1to21: Rate;
  rounds1to8: Rate;
  finalMinusEarlier: number;
  finalMinusEarlierCI: [number, number] | null;
  byRound: Array<{ t: number } & Rate>;
  /** Three-round calendar bins (1-3, ..., 22-24) with seed-cluster intervals. */
  byRoundBin: Array<{ from: number; to: number } & Rate & { ci: [number, number] | null }>;
};

export function endgame(ds: readonly ContextDecision[], label: string, pick: (x: ContextDecision) => boolean, cell: DirectedCell): EndgameRow {
  const sel = ds.filter(x => pick(x) && x.cell === cell);
  const T = P.T;
  const fin = sel.filter(x => x.t === T), early = sel.filter(x => x.t < T);
  let bothGave: number | null = null, meetings = fin.length;
  if (cell === "H>H" || cell === "E>E") {
    // Symmetric cells: both participants are in the cell, so decisions = 2 x meetings.
    const byMeeting = new Map<string, ContextDecision[]>();
    for (const x of fin) {
      const k = `${x.study}|${x.arm}|${x.seed}|${Math.min(x.id, x.partnerId)}`;
      const list = byMeeting.get(k) ?? []; list.push(x); byMeeting.set(k, list);
    }
    meetings = byMeeting.size;
    bothGave = [...byMeeting.values()].filter(l => l.length === 2 && l.every(x => isGive(x.original))).length;
  }
  const diff = (xs: readonly ContextDecision[]) => pooledRate(xs.filter(x => x.t === T)) - pooledRate(xs.filter(x => x.t < T));
  return {
    label, cell,
    final: { ...rateOf(fin), meetings, bothGaveMeetings: bothGave },
    lastThree: rateOf(sel.filter(x => x.t >= T - 2)),
    rounds1to21: rateOf(sel.filter(x => x.t <= T - 3)),
    rounds1to8: rateOf(sel.filter(x => x.t <= 8)),
    finalMinusEarlier: rateOf(fin).rate - rateOf(early).rate,
    finalMinusEarlierCI: clusterBootstrap(sel, diff),
    byRound: Array.from({ length: T }, (_, k) => ({ t: k + 1, ...rateOf(sel.filter(x => x.t === k + 1)) })),
    byRoundBin: Array.from({ length: Math.ceil(T / 3) }, (_, k) => {
      const lo = 3 * k + 1, hi = Math.min(T, 3 * k + 3);
      const s = sel.filter(x => x.t >= lo && x.t <= hi);
      return { from: lo, to: hi, ...rateOf(s), ci: s.length ? clusterBootstrap(s, pooledRate, 4000) : null };
    }),
  };
}

// ---------------------------------------------------------------------------
// 2. First meeting versus prior meeting, within exact rounds
// ---------------------------------------------------------------------------

export type ExactRoundRow = { t: number; first: Rate; prior: Rate; difference: number };
export type HistoryAtRound = {
  label: string; cell: DirectedCell; arms: string[];
  /** The confounded comparison: first meetings pooled over rounds 1-2 versus prior-meeting decisions (round 2 only). */
  pooledRounds12: { first: Rate; prior: Rate; difference: number };
  exactRounds: ExactRoundRow[];
  /** Round-standardized risk difference over rounds 2..maxRound (Mantel-Haenszel weights n1*n0/(n1+n0), stratified by study and round). */
  standardized: { maxRound: number; difference: number; ci: [number, number] | null; firstDecisions: number; priorDecisions: number };
};

function mhDifference(xs: readonly ContextDecision[], maxRound: number): number {
  let num = 0, den = 0;
  const strata = new Map<string, ContextDecision[]>();
  for (const x of xs) {
    if (x.t < 2 || x.t > maxRound) continue;
    const k = `${x.study}|${x.t}`;
    const list = strata.get(k) ?? []; list.push(x); strata.set(k, list);
  }
  for (const list of strata.values()) {
    const f = list.filter(x => x.meetingIndex === 1), p = list.filter(x => x.meetingIndex > 1);
    if (!f.length || !p.length) continue;
    const w = (f.length * p.length) / (f.length + p.length);
    num += w * (rateOf(f).rate - rateOf(p).rate);
    den += w;
  }
  return den ? num / den : Number.NaN;
}

export function historyAtRound(
  ds: readonly ContextDecision[], label: string, sel: (x: ContextDecision) => boolean, cell: DirectedCell, arms: string[], maxRound = 6,
): HistoryAtRound {
  const xs = ds.filter(x => sel(x) && x.cell === cell);
  const f12 = xs.filter(x => x.t <= 2 && x.meetingIndex === 1), p12 = xs.filter(x => x.t <= 2 && x.meetingIndex > 1);
  const exactRounds: ExactRoundRow[] = [];
  for (let t = 2; t <= maxRound; t++) {
    const f = rateOf(xs.filter(x => x.t === t && x.meetingIndex === 1)), p = rateOf(xs.filter(x => x.t === t && x.meetingIndex > 1));
    exactRounds.push({ t, first: f, prior: p, difference: f.rate - p.rate });
  }
  const win = xs.filter(x => x.t >= 2 && x.t <= maxRound);
  return {
    label, cell, arms,
    pooledRounds12: { first: rateOf(f12), prior: rateOf(p12), difference: rateOf(f12).rate - rateOf(p12).rate },
    exactRounds,
    standardized: {
      maxRound, difference: mhDifference(xs, maxRound), ci: clusterBootstrap(win, s => mhDifference(s, maxRound)),
      firstDecisions: win.filter(x => x.meetingIndex === 1).length, priorDecisions: win.filter(x => x.meetingIndex > 1).length,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Giving after an unreciprocated transfer
// ---------------------------------------------------------------------------

export type AfterLossRow = { condition: string } & Rate & { ci: [number, number] | null };
export type AfterLoss = { label: string; cell: DirectedCell; rows: AfterLossRow[] };

const unreciprocated = (m: PrevMeeting) => m.gave && !m.got;

/**
 * Giving in a directed cell (normally H>H) split by the agent's own realized
 * history. "Loss" is an unreciprocated transfer: the agent's check moved and
 * it received none. Splits distinguish the immediate next meeting from the
 * next meeting in the same cell, and a new partner from the partner that
 * failed to reciprocate.
 */
export function afterLoss(ds: readonly ContextDecision[], label: string, sel: (x: ContextDecision) => boolean, cell: DirectedCell = "H>H"): AfterLoss {
  const xs = ds.filter(x => sel(x) && x.cell === cell);
  const row = (condition: string, pick: (x: ContextDecision) => boolean): AfterLossRow => {
    const s = xs.filter(pick);
    return { condition, ...rateOf(s), ci: s.length ? clusterBootstrap(s, pooledRate) : null };
  };
  const lastLoss = (x: ContextDecision) => [...x.history].reverse().find(unreciprocated);
  const lastSameCell = (x: ContextDecision) => [...x.history].reverse().find(h => h.cell === x.cell);
  return {
    label, cell,
    rows: [
      row("first meeting", x => x.meetingIndex === 1),
      row("previous meeting: mutual transfer", x => !!x.prev && x.prev.gave && x.prev.got),
      row("previous meeting: unreciprocated own transfer", x => !!x.prev && unreciprocated(x.prev)),
      row("  same cell, new partner", x => !!x.prev && unreciprocated(x.prev) && x.prev.cell === x.cell && x.prev.partnerId !== x.partnerId),
      row("  same partner as the loss", x => !!x.prev && unreciprocated(x.prev) && x.prev.partnerId === x.partnerId),
      row("  previous meeting in another cell", x => !!x.prev && unreciprocated(x.prev) && x.prev.cell !== x.cell),
      row("previous meeting: received without giving", x => !!x.prev && !x.prev.gave && x.prev.got),
      row("previous meeting: no transfer", x => !!x.prev && !x.prev.gave && !x.prev.got),
      row("last same-cell meeting was an unreciprocated own transfer", x => { const h = lastSameCell(x); return !!h && unreciprocated(h); }),
      row("last same-cell meeting was mutual", x => { const h = lastSameCell(x); return !!h && h.gave && h.got; }),
      row("partner is an account that earlier failed to reciprocate", x => x.history.some(h => h.partnerId === x.partnerId && unreciprocated(h))),
      row("partner is an account that earlier reciprocated", x => x.history.some(h => h.partnerId === x.partnerId && h.gave && h.got) && !x.history.some(h => h.partnerId === x.partnerId && unreciprocated(h))),
      row("any earlier unreciprocated transfer, partner new", x => !!lastLoss(x) && !x.history.some(h => h.partnerId === x.partnerId)),
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Encounter-index tables under two definitions
// ---------------------------------------------------------------------------

export type EncounterTable = {
  study: string; arm: string; cell: DirectedCell;
  definition: "account meeting index" | "index within directed cell";
  bins: Array<{ bin: string } & Rate & { ci: [number, number] | null }>;
};

export function encounterTable(
  ds: readonly ContextDecision[], study: string, arm: string, cell: DirectedCell,
  definition: EncounterTable["definition"], withCI = false,
): EncounterTable {
  const xs = ds.filter(x => x.study === study && x.arm === arm && x.cell === cell);
  const idx = (x: ContextDecision) => (definition === "account meeting index" ? x.meetingIndex : x.cellIndex);
  const bins: Array<[string, number, number]> = [["1", 1, 1], ["2", 2, 2], ["3", 3, 3], ["4+", 4, Infinity], ["2+", 2, Infinity]];
  return {
    study, arm, cell, definition,
    bins: bins.map(([bin, lo, hi]) => {
      const s = xs.filter(x => idx(x) >= lo && idx(x) <= hi);
      return { bin, ...rateOf(s), ci: withCI && s.length ? clusterBootstrap(s, pooledRate) : null };
    }),
  };
}

export type FirstCellSplit = { label: string; cell: DirectedCell; firstMeeting: Rate & { ci: [number, number] | null }; firstInCellAfterOtherRole: Rate & { ci: [number, number] | null }; laterInCell: Rate & { ci: [number, number] | null } };

/**
 * Separates an account's first decision in a directed cell by whether it is
 * also the account's first meeting of the run. Under the gift text this asks
 * whether named giving falls after any earlier meeting, or only after earlier
 * meetings in the named relation. Descriptive: such decisions occur later in
 * the run and follow different histories.
 */
export function firstInCellSplit(ds: readonly ContextDecision[], label: string, pick: (x: ContextDecision) => boolean, cell: DirectedCell): FirstCellSplit {
  const xs = ds.filter(x => pick(x) && x.cell === cell);
  const r = (s: ContextDecision[]) => ({ ...rateOf(s), ci: s.length ? clusterBootstrap(s, pooledRate) : null });
  return {
    label, cell,
    firstMeeting: r(xs.filter(x => x.meetingIndex === 1)),
    firstInCellAfterOtherRole: r(xs.filter(x => x.cellIndex === 1 && x.meetingIndex > 1)),
    laterInCell: r(xs.filter(x => x.cellIndex > 1)),
  };
}

// ---------------------------------------------------------------------------
// 5a. Welfare accounting with per-component seed-level intervals
// ---------------------------------------------------------------------------

export const ACCOUNTING_GROUPS: Array<[string, TransactionCategory[]]> = [
  ["H-H swap", ["HH:swap"]],
  ["E-H swap", ["EH:swap"]],
  ["One-way H->H", ["H>H:gift", "H>H:sale"]],
  ["One-way E->H", ["E>H:gift", "E>H:sale"]],
  ["One-way H->E", ["H>E:gift", "H>E:sale"]],
  ["Easy-Easy transfers", ["EE:swap", "E>E:gift", "E>E:sale"]],
];

export type AccountingComponent = { group: string; mean: number; ci: [number, number] | null; positiveSeeds: number; negativeSeeds: number; seeds: number };
export type AccountingWithCI = {
  study: string; arm: string; reference: string;
  components: AccountingComponent[];
  net: AccountingComponent;
  /** Sum of unrounded component means; equals the net mean up to floating error. */
  componentSum: number;
  /** Sum of the components after rounding each to two decimals, as a figure would display them. */
  roundedComponentSum: number;
};

export function accountingWithCI(runs: readonly FrozenRun[], study: string, arm: string, reference: string): AccountingWithCI {
  const seeds = [...new Set(runs.map(r => r.seed))].sort((a, b) => a - b);
  const acct = new Map(runs.map(r => [`${r.arm}|${r.seed}`, accountRun(r)]));
  const component = (group: string, cats: TransactionCategory[] | null): AccountingComponent => {
    const vals = seeds.map(s => {
      const a = acct.get(`${arm}|${s}`)!, r = acct.get(`${reference}|${s}`)!;
      if (!cats) return a.recordedMean - r.recordedMean;
      return sum(cats.map(c => a.categories[c].realized - r.categories[c].realized)) / P.n;
    });
    return {
      group, mean: mean(vals), ci: bootstrapMean95(vals, BOOT_SAMPLES, BOOT_SEED),
      positiveSeeds: vals.filter(v => v > 1e-12).length, negativeSeeds: vals.filter(v => v < -1e-12).length, seeds: vals.length,
    };
  };
  const components = ACCOUNTING_GROUPS.map(([g, cats]) => component(g, cats));
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    study, arm, reference, components, net: component("Net welfare change", null),
    componentSum: sum(components.map(c => c.mean)),
    roundedComponentSum: r2(sum(components.map(c => r2(c.mean)))),
  };
}

// ---------------------------------------------------------------------------
// 5b. Seed-clustered tests of one-directional discrepancies
// ---------------------------------------------------------------------------

export type DiscrepancyTest = {
  label: string; pairs: number; aOnly: number; bOnly: number; seeds: number;
  /** Mean over seeds of (aOnly - bOnly) per matched decision in that seed. */
  seedMeanNetRate: number; ci: [number, number] | null;
  /** Exact two-sided sign-flip p over seed-level net rates. */
  pTwoSided: number | null;
};

/**
 * Pair decisions across two arms by (seed, round, agent) and test whether
 * give/keep discrepancies run predominantly one way, with the seed as the
 * unit. `match` decides which pairs count (e.g. identical stripped prompt at
 * first meetings, or identical full prompt for the same-announcement noise
 * floor).
 */
export function discrepancyTest(
  label: string, ds: readonly Decision[], armA: string, armB: string,
  match: (a: Decision, b: Decision) => boolean, cell?: DirectedCell,
): DiscrepancyTest {
  const key = (x: Decision) => `${x.study}|${x.seed}|${x.t}|${x.id}`;
  const b = new Map(ds.filter(x => x.arm === armB).map(x => [key(x), x]));
  const bySeed = new Map<string, { n: number; net: number }>();
  let pairs = 0, aOnly = 0, bOnly = 0;
  for (const a of ds) {
    if (a.arm !== armA) continue;
    if (cell && cellOf(a.meType, a.partnerType) !== cell) continue;
    const o = b.get(key(a));
    if (!o || !match(a, o)) continue;
    pairs += 1;
    const ga = isGive(a.original), gb = isGive(o.original);
    const s = bySeed.get(`${a.study}|${a.seed}`) ?? { n: 0, net: 0 };
    s.n += 1;
    if (ga && !gb) { aOnly += 1; s.net += 1; }
    if (gb && !ga) { bOnly += 1; s.net -= 1; }
    bySeed.set(`${a.study}|${a.seed}`, s);
  }
  const vals = [...bySeed.values()].map(s => s.net / s.n);
  return {
    label, pairs, aOnly, bOnly, seeds: vals.length,
    seedMeanNetRate: mean(vals), ci: vals.length ? bootstrapMean95(vals, BOOT_SAMPLES, BOOT_SEED) : null,
    pTwoSided: vals.length ? exactTwoSidedSignFlipMitm(vals) : null,
  };
}
