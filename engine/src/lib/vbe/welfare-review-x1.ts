/**
 * X1 zero-call mechanism audit for the second AAMAS review round.
 *
 * Every quantity here is a pure function of frozen W-CO, W-RG and W-SGB
 * artifacts plus the frozen engine. No model or API call is made. Frozen
 * study files, protocols, and the engine (env.ts) are imported, never edited.
 *
 * The audit has six parts:
 *   1. engine-derived transaction payoff identities, including the E-H swap
 *      and one-way H->H transfer omitted from the submitted Table 1, and the
 *      stage games implied by those identities;
 *   2. exact replay of every frozen run through the frozen engine, which
 *      reconstructs each decision's prompt and proves the replay reproduces
 *      the recorded scores;
 *   3. an exact realized-welfare decomposition into mutually exclusive
 *      transaction categories, using the regenerated paired payoff draws;
 *   4. joint proposal tables and a bilateral money funnel;
 *   5. fixed-state comparisons at each decider's first meeting, where the
 *      prompt is byte-identical across arms except for the announcement,
 *      plus a temperature-0 determinism check across W-RG's identical-prompt
 *      gift arms;
 *   6. supplementary inference: MRES-shifted sign-flip tests, one-sided
 *      lower bounds, and leave-one-seed-out ranges.
 */
import { createHash } from "node:crypto";
import { bootstrapMean95 } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { applyMeetings, resolveMeeting, runPopulationAsyncPaired } from "./env.ts";
import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { meetingPrompt } from "./prompts.ts";
import { mulberry32 } from "./rng.ts";
import type { AgentState, AgentType, Meeting, Proposal, RunResult } from "./types.ts";

export const X1_VERSION = "1.0" as const;
export const P: VbeParams = DEFAULT_PARAMS;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const mean = (xs: readonly number[]): number =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN;

const IDLE: Proposal = { giveCheck: false, giveChits: 0, requireChit: false };

/** Unconditional give: the action named by the gift packages. */
export const isGive = (p: Proposal): boolean => p.giveCheck && !p.requireChit;
/** Mark-contingent sale offer. */
export const isSale = (p: Proposal): boolean => p.giveCheck && p.requireChit;
/** Buyer-side mark offer. */
export const isMarkOffer = (p: Proposal): boolean => Math.floor(p.giveChits) >= 1;

export type DirectedCell = "H>H" | "H>E" | "E>H" | "E>E";
export const DIRECTED_CELLS: readonly DirectedCell[] = ["H>H", "H>E", "E>H", "E>E"];
export const cellOf = (me: AgentType, partner: AgentType): DirectedCell =>
  `${me}>${partner}` as DirectedCell;

// ---------------------------------------------------------------------------
// 1. Engine-derived payoff identities
// ---------------------------------------------------------------------------

export type TransactionCategory =
  | "none"
  | "HH:swap" | "EH:swap" | "EE:swap"
  | "H>H:gift" | "H>E:gift" | "E>H:gift" | "E>E:gift"
  | "H>H:sale" | "H>E:sale" | "E>H:sale" | "E>E:sale";

export const TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  "HH:swap", "EH:swap", "EE:swap",
  "H>H:gift", "H>E:gift", "E>H:gift", "E>E:gift",
  "H>H:sale", "H>E:sale", "E>H:sale", "E>E:sale",
  "none",
];

/** Classify a resolved meeting into one mutually exclusive category. */
export function categorize(m: Pick<Meeting, "iType" | "jType" | "kind" | "seller" | "buyer" | "i" | "j">): TransactionCategory {
  if (m.kind === "none") return "none";
  if (m.kind === "swap") {
    const pair = [m.iType, m.jType].sort().join("");
    return (pair === "HH" ? "HH:swap" : pair === "EE" ? "EE:swap" : "EH:swap");
  }
  const giverType = m.seller === m.i ? m.iType : m.jType;
  const receiverType = m.buyer === m.i ? m.iType : m.jType;
  const action = m.kind === "gift" ? "gift" : "sale";
  return `${giverType}>${receiverType}:${action}` as TransactionCategory;
}

/**
 * Per-agent expected payoff change relative to no transfer, by role and
 * transfer status. These are the analytic forms; part 1 verifies each one
 * against the frozen engine by stratifying over the payoff draw.
 */
export function expectedAgentDelta(role: AgentType, gave: boolean, received: boolean, p = P): number {
  if (role === "E") return gave ? -p.v : 0;
  const base = p.R * p.pHard;
  if (received) return p.R * p.pPartner + (gave ? 0 : p.v) - base;
  return gave ? -base : 0;
}

/** Realized payoff change for one agent given its own pre-drawn payoff draw. */
export function realizedAgentDelta(role: AgentType, gave: boolean, received: boolean, draw: number, p = P): number {
  if (role === "E") return gave ? -p.v : 0;
  const base = draw < p.pHard ? p.R : 0;
  if (received) return (draw < p.pPartner ? p.R : 0) + (gave ? 0 : p.v) - base;
  return gave ? -base : 0;
}

export type PayoffRow = {
  category: TransactionCategory;
  giverType: AgentType; receiverType: AgentType;
  giver: number; receiver: number; total: number;
  engineGiver: number; engineReceiver: number; engineTotal: number;
};

function twoAgents(iType: AgentType, jType: AgentType, iChits: number, jChits: number): [AgentState, AgentState] {
  const make = (id: number, type: AgentType, chits: number): AgentState => ({
    id, type, checks: 1, chits, score: type === "E" ? P.R : 0,
    solved: type === "E", receivedFrom: null, memory: [],
  });
  return [make(0, iType, iChits), make(1, jType, jChits)];
}

/**
 * Engine-integrated expected payoff for a fixed proposal pair, integrating the
 * Hard draw over its three relevant strata ([0,pH), [pH,pP), [pP,1)).
 * Both agents' draws are stratified independently.
 */
export function engineExpectedScores(
  iType: AgentType, jType: AgentType, pi: Proposal, pj: Proposal, iChits = 0, jChits = 0,
): { i: number; j: number; kind: string } {
  const cuts = [0, P.pHard, P.pPartner, 1];
  let iExp = 0, jExp = 0, kind = "";
  for (let a = 1; a < cuts.length; a++) for (let b = 1; b < cuts.length; b++) {
    const [i, j] = twoAgents(iType, jType, iChits, jChits);
    const snap = applyMeetings(
      [i, j], 1, { ...P, n: 2 },
      () => { throw new Error("unexpected structural draw"); },
      [{ i, j, pi, pj }],
      [(cuts[a - 1]! + cuts[a]!) / 2, (cuts[b - 1]! + cuts[b]!) / 2],
    );
    const w = (cuts[a]! - cuts[a - 1]!) * (cuts[b]! - cuts[b - 1]!);
    iExp += w * snap.scores[0]!;
    jExp += w * snap.scores[1]!;
    kind = snap.meetings[0]!.kind;
  }
  return { i: iExp, j: jExp, kind };
}

const GIVE: Proposal = { giveCheck: true, giveChits: 0, requireChit: false };
const SELL: Proposal = { giveCheck: true, giveChits: 0, requireChit: true };
const PAY: Proposal = { giveCheck: false, giveChits: 1, requireChit: false };

/** Build the full payoff table from the engine and check it against the analytic forms. */
export function payoffTable(): PayoffRow[] {
  const rows: PayoffRow[] = [];
  const types: AgentType[] = ["H", "E"];
  for (const g of types) for (const r of types) {
    const base = engineExpectedScores(g, r, IDLE, IDLE, 0, 1);
    for (const action of ["gift", "sale"] as const) {
      const out = action === "gift"
        ? engineExpectedScores(g, r, GIVE, IDLE, 0, 1)
        : engineExpectedScores(g, r, SELL, PAY, 0, 1);
      const expectKind = action === "gift" ? "gift" : "chit-for-check";
      if (out.kind !== expectKind) throw new Error(`engine resolved ${g}>${r}:${action} as ${out.kind}`);
      const giver = expectedAgentDelta(g, true, false), receiver = expectedAgentDelta(r, false, true);
      rows.push({
        category: `${g}>${r}:${action}` as TransactionCategory, giverType: g, receiverType: r,
        giver, receiver, total: giver + receiver,
        engineGiver: out.i - base.i, engineReceiver: out.j - base.j,
        engineTotal: out.i - base.i + out.j - base.j,
      });
    }
  }
  for (const [a, b, cat] of [["H", "H", "HH:swap"], ["E", "H", "EH:swap"], ["E", "E", "EE:swap"]] as const) {
    const base = engineExpectedScores(a, b, IDLE, IDLE);
    const out = engineExpectedScores(a, b, GIVE, GIVE);
    if (out.kind !== "swap") throw new Error(`engine resolved ${cat} as ${out.kind}`);
    const da = expectedAgentDelta(a, true, true), db = expectedAgentDelta(b, true, true);
    rows.push({
      category: cat, giverType: a, receiverType: b, giver: da, receiver: db, total: da + db,
      engineGiver: out.i - base.i, engineReceiver: out.j - base.j,
      engineTotal: out.i - base.i + out.j - base.j,
    });
  }
  for (const row of rows) {
    for (const [x, y] of [[row.giver, row.engineGiver], [row.receiver, row.engineReceiver], [row.total, row.engineTotal]] as const) {
      if (Math.abs(x - y) > 1e-9) throw new Error(`analytic/engine mismatch for ${row.category}: ${x} vs ${y}`);
    }
  }
  return rows;
}

export type StageGame = {
  pair: "H-H" | "E-H";
  rowRole: AgentType; colRole: AgentType;
  /** payoffs[rowAction][colAction] = [row payoff, col payoff]; action 0 = keep, 1 = give. */
  payoffs: [[number, number], [number, number]][];
  rowDominant: "keep" | "give" | "none";
  colDominant: "keep" | "give" | "none";
  welfareMaximizing: string;
  prisonersDilemma: boolean;
};

/** Expected one-shot stage games implied by the engine (marks carry no value). */
export function stageGames(): StageGame[] {
  const out: StageGame[] = [];
  for (const [rowRole, colRole, pair] of [["H", "H", "H-H"], ["E", "H", "E-H"]] as const) {
    const payoffs: [[number, number], [number, number]][] = [];
    for (const ra of [0, 1]) {
      const row: [number, number][] = [];
      for (const ca of [0, 1]) {
        const s = engineExpectedScores(rowRole, colRole, ra ? GIVE : IDLE, ca ? GIVE : IDLE);
        row.push([s.i, s.j]);
      }
      payoffs.push(row as [[number, number], [number, number]]);
    }
    const dom = (who: 0 | 1): "keep" | "give" | "none" => {
      const keep = who === 0 ? [payoffs[0]![0]![0], payoffs[0]![1]![0]] : [payoffs[0]![0]![1], payoffs[1]![0]![1]];
      const give = who === 0 ? [payoffs[1]![0]![0], payoffs[1]![1]![0]] : [payoffs[0]![1]![1], payoffs[1]![1]![1]];
      if (keep.every((k, idx) => k > give[idx]! + 1e-12)) return "keep";
      if (give.every((g, idx) => g > keep[idx]! + 1e-12)) return "give";
      return "none";
    };
    const totals = [0, 1].flatMap(ra => [0, 1].map(ca => ({ ra, ca, w: payoffs[ra]![ca]![0] + payoffs[ra]![ca]![1] })));
    const best = totals.reduce((a, b) => (b.w > a.w + 1e-12 ? b : a));
    const label = (a: number) => (a ? "give" : "keep");
    const cc = payoffs[1]![1]![0], dd = payoffs[0]![0]![0], dc = payoffs[0]![1]![0], cd = payoffs[1]![0]![0];
    out.push({
      pair, rowRole, colRole, payoffs,
      rowDominant: dom(0), colDominant: dom(1),
      welfareMaximizing: `${rowRole} ${label(best.ra)}, ${colRole} ${label(best.ca)}`,
      prisonersDilemma: pair === "H-H" && dc > cc && cc > dd && dd > cd && 2 * cc > dc + cd,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Exact replay of frozen runs through the frozen engine
// ---------------------------------------------------------------------------

export type StudyId = "W-CO" | "W-RG" | "W-SGB";

export type TraceRow = {
  t: number; meId: number; partnerId: number;
  original: Proposal; executed: Proposal; eligible?: boolean; blocked?: boolean;
};

export type FrozenRun = {
  seed: number; arm: string; meanScore: number; notice: string;
  result: RunResult; trace?: TraceRow[];
};

export type Decision = {
  study: StudyId; seed: number; arm: string; t: number;
  id: number; partnerId: number; meType: AgentType; partnerType: AgentType;
  meChits: number; partnerChits: number; score: number;
  firstMeeting: boolean;
  /** Prompt with the arm's announcement removed: identical across arms iff the decision state is identical. */
  strippedHash: string;
  /** The exact prompt the model received. */
  fullHash: string;
  original: Proposal; executed: Proposal; blocked: boolean;
};

export type ReplayResult = { decisions: Decision[]; scoresMatch: boolean; kindsMatch: boolean };

/**
 * Replay a frozen run by feeding the recorded (executed) proposals back into
 * the frozen paired engine. Because roles, pairings, and payoff draws are
 * generated from the seed independently of behavior, the replay reproduces
 * the original run exactly; this is asserted, not assumed.
 */
export async function replayRun(study: StudyId, run: FrozenRun): Promise<ReplayResult> {
  const byRound = run.result.rounds;
  const traceIndex = new Map<string, TraceRow>();
  for (const row of run.trace ?? []) traceIndex.set(`${row.t}|${row.meId}`, row);
  const decisions: Decision[] = [];
  const decide = (me: AgentState, partner: AgentState, t: number): Proposal => {
    const meeting = byRound[t - 1]!.meetings.find(m => m.i === me.id || m.j === me.id);
    if (!meeting) throw new Error(`${study} ${run.arm} seed=${run.seed} t=${t}: no meeting for agent ${me.id}`);
    const executed = meeting.i === me.id ? meeting.pi : meeting.pj;
    const traced = traceIndex.get(`${t}|${me.id}`);
    if (run.trace && !traced) throw new Error(`${study} ${run.arm} seed=${run.seed} t=${t}: missing trace for ${me.id}`);
    if (traced && JSON.stringify(traced.executed) !== JSON.stringify(executed)) {
      throw new Error(`${study} ${run.arm} seed=${run.seed} t=${t}: trace/meeting proposal mismatch for ${me.id}`);
    }
    decisions.push({
      study, seed: run.seed, arm: run.arm, t, id: me.id, partnerId: partner.id,
      meType: me.type, partnerType: partner.type, meChits: me.chits, partnerChits: partner.chits,
      score: me.score, firstMeeting: me.memory.length === 0,
      strippedHash: sha256(meetingPrompt(me, partner, t, P, "label", "")),
      fullHash: sha256(meetingPrompt(me, partner, t, P, "label", run.notice)),
      original: traced?.original ?? executed, executed, blocked: traced?.blocked ?? false,
    });
    return executed;
  };
  const replayed = await runPopulationAsyncPaired(run.seed, decide, P, true);
  const scoresMatch = replayed.scores.every((s, k) => s === run.result.scores[k]);
  const kindsMatch = replayed.rounds.every((r, k) =>
    r.meetings.length === byRound[k]!.meetings.length &&
    r.meetings.every((m, q) => m.kind === byRound[k]!.meetings[q]!.kind && m.i === byRound[k]!.meetings[q]!.i));
  return { decisions, scoresMatch, kindsMatch };
}

// ---------------------------------------------------------------------------
// 3. Exact realized-welfare decomposition
// ---------------------------------------------------------------------------

/** The paired engine's per-agent, per-round payoff draws, regenerated from the seed. */
export function payoffDraws(seed: number, p = P): number[][] {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  return Array.from({ length: p.T }, () => Array.from({ length: p.n }, () => rng()));
}

export type CategoryAccount = { count: number; expected: number; realized: number };
export type RunAccount = {
  seed: number; arm: string;
  neverTransferMean: number; recordedMean: number; reconstructedMean: number;
  forfeits: number;
  categories: Record<TransactionCategory, CategoryAccount>;
  reconciles: boolean;
};

function emptyCategories(): Record<TransactionCategory, CategoryAccount> {
  return Object.fromEntries(TRANSACTION_CATEGORIES.map(c => [c, { count: 0, expected: 0, realized: 0 }])) as Record<TransactionCategory, CategoryAccount>;
}

/**
 * Decompose a run's realized total score into a never-transfer baseline plus
 * per-transaction realized contributions. The identity is exact because a
 * transfer only changes the payoff of the two agents in that meeting in that
 * round, marks have no value, and payoff draws are pre-generated per agent.
 */
export function accountRun(run: FrozenRun): RunAccount {
  const draws = payoffDraws(run.seed);
  const categories = emptyCategories();
  let neverTotal = 0, contribTotal = 0, forfeits = 0;
  for (const round of run.result.rounds) {
    const t = round.t, d = draws[t - 1]!;
    for (let id = 0; id < P.n; id++) {
      neverTotal += round.types[id] === "E" ? P.R + P.v : (d[id]! < P.pHard ? P.R : 0);
    }
    for (const m of round.meetings) {
      const cat = categorize(m);
      const gaveI = m.kind === "swap" || ((m.kind === "gift" || m.kind === "chit-for-check") && m.seller === m.i);
      const gaveJ = m.kind === "swap" || ((m.kind === "gift" || m.kind === "chit-for-check") && m.seller === m.j);
      const recI = m.kind === "swap" || ((m.kind === "gift" || m.kind === "chit-for-check") && m.buyer === m.i);
      const recJ = m.kind === "swap" || ((m.kind === "gift" || m.kind === "chit-for-check") && m.buyer === m.j);
      const exp = expectedAgentDelta(m.iType, gaveI, recI) + expectedAgentDelta(m.jType, gaveJ, recJ);
      const real = realizedAgentDelta(m.iType, gaveI, recI, d[m.i]!) + realizedAgentDelta(m.jType, gaveJ, recJ, d[m.j]!);
      const acc = categories[cat];
      acc.count += 1; acc.expected += exp; acc.realized += real;
      contribTotal += real;
      forfeits += (m.iForfeit ?? 0) + (m.jForfeit ?? 0);
    }
  }
  const recordedTotal = run.result.scores.reduce((s, x) => s + x, 0);
  const reconstructedTotal = neverTotal + contribTotal - forfeits;
  return {
    seed: run.seed, arm: run.arm,
    neverTransferMean: neverTotal / P.n, recordedMean: recordedTotal / P.n,
    reconstructedMean: reconstructedTotal / P.n, forfeits, categories,
    reconciles: Math.abs(reconstructedTotal - recordedTotal) < 1e-9 && Math.abs(run.meanScore - recordedTotal / P.n) < 1e-9,
  };
}

// ---------------------------------------------------------------------------
// Benchmarks on the same seeds
// ---------------------------------------------------------------------------

export type Benchmark = "never-transfer" | "first-best-ex-ante" | "first-best-ex-post" | "always-give";

/**
 * Model-free benchmarks on a seed, with the same paired schedule and draws.
 *  - first-best-ex-ante: meeting-by-meeting maximization of expected welfare
 *    over the engine's action space, using no realized draw (H-H swap, one-way
 *    E->H gift, otherwise keep). It is a planner benchmark, not an equilibrium.
 *  - first-best-ex-post: the same maximization using the realized draws, i.e.
 *    an omniscient planner; an upper bound on attainable welfare.
 */
export async function benchmarkMean(seed: number, which: Benchmark): Promise<number> {
  if (which === "first-best-ex-post") return exPostFirstBest(seed);
  const strategy = (me: AgentState, partner: AgentState): Proposal => {
    if (which === "never-transfer" || me.checks < 1) return IDLE;
    if (which === "always-give") return GIVE;
    return partner.type === "H" ? GIVE : IDLE;
  };
  const r = await runPopulationAsyncPaired(seed, strategy, P, false);
  return r.meanScore;
}

async function exPostFirstBest(seed: number): Promise<number> {
  const draws = payoffDraws(seed);
  let total = 0;
  // Capture the paired schedule (roles, meetings) with an idle policy.
  const idle = await runPopulationAsyncPaired(seed, () => IDLE, P, true);
  for (const round of idle.rounds) {
    const d = draws[round.t - 1]!;
    for (let id = 0; id < P.n; id++) total += round.types[id] === "E" ? P.R + P.v : (d[id]! < P.pHard ? P.R : 0);
    for (const m of round.meetings) {
      const options: number[] = [0];
      const one = (gT: AgentType, gId: number, rT: AgentType, rId: number) =>
        realizedAgentDelta(gT, true, false, d[gId]!) + realizedAgentDelta(rT, false, true, d[rId]!);
      options.push(one(m.iType, m.i, m.jType, m.j), one(m.jType, m.j, m.iType, m.i));
      options.push(realizedAgentDelta(m.iType, true, true, d[m.i]!) + realizedAgentDelta(m.jType, true, true, d[m.j]!));
      total += Math.max(...options);
    }
  }
  return total / P.n;
}

// ---------------------------------------------------------------------------
// 4. Joint proposals and the bilateral money funnel
// ---------------------------------------------------------------------------

export type JointRow = {
  pair: "H-H" | "E-H" | "E-E";
  meetings: number;
  neither: number; onlyFirst: number; onlySecond: number; both: number;
  kinds: Record<string, number>;
};

/** Joint unconditional-give proposals per meeting. For E-H, "first" is the Easy agent. */
export function jointTable(decisions: readonly Decision[]): JointRow[] {
  const byMeeting = new Map<string, Decision[]>();
  for (const x of decisions) {
    const key = `${x.seed}|${x.arm}|${x.t}|${Math.min(x.id, x.partnerId)}|${Math.max(x.id, x.partnerId)}`;
    const list = byMeeting.get(key) ?? [];
    list.push(x); byMeeting.set(key, list);
  }
  const rows = new Map<string, JointRow>();
  for (const pair of ["H-H", "E-H", "E-E"] as const) {
    rows.set(pair, { pair, meetings: 0, neither: 0, onlyFirst: 0, onlySecond: 0, both: 0, kinds: {} });
  }
  for (const [, ds] of byMeeting) {
    if (ds.length !== 2) throw new Error("meeting without exactly two decisions");
    const [a, b] = ds[0]!.meType === "E" ? [ds[0]!, ds[1]!] : [ds[1]!, ds[0]!];
    const types = [a.meType, b.meType].sort().join("");
    const pair = types === "HH" ? "H-H" : types === "EE" ? "E-E" : "E-H";
    const row = rows.get(pair)!;
    const ga = isGive(a.original), gb = isGive(b.original);
    row.meetings += 1;
    if (ga && gb) row.both += 1; else if (ga) row.onlyFirst += 1; else if (gb) row.onlySecond += 1; else row.neither += 1;
    const local = resolveMeeting(
      { ...stateOf(a), memory: [] }, { ...stateOf(b), memory: [] }, a.original, b.original,
    ).kind;
    row.kinds[local] = (row.kinds[local] ?? 0) + 1;
  }
  return [...rows.values()];
}

function stateOf(x: Decision): AgentState {
  return { id: x.id, type: x.meType, checks: 1, chits: x.meChits, score: x.score, solved: x.meType === "E", receivedFrom: null, memory: [] };
}

export type MoneyFunnel = {
  ehMeetings: number;
  hardHoldsMark: number;
  sellerOffersSale: number;
  buyerOffersMark: number;
  bothCompatible: number;
  executedSales: number;
  hardDecisionsHoldingMark: number;
  markOffersAnyCell: number;
};

/** The bilateral E->H sale funnel, with nested denominators. */
export function moneyFunnel(decisions: readonly Decision[]): MoneyFunnel {
  const f: MoneyFunnel = { ehMeetings: 0, hardHoldsMark: 0, sellerOffersSale: 0, buyerOffersMark: 0, bothCompatible: 0, executedSales: 0, hardDecisionsHoldingMark: 0, markOffersAnyCell: 0 };
  const index = new Map<string, Decision>();
  for (const x of decisions) index.set(`${x.seed}|${x.arm}|${x.t}|${x.id}`, x);
  for (const x of decisions) {
    if (x.meType === "H" && x.meChits >= 1) {
      f.hardDecisionsHoldingMark += 1;
      if (isMarkOffer(x.original)) f.markOffersAnyCell += 1;
    }
    if (x.meType !== "E" || x.partnerType !== "H") continue;
    const h = index.get(`${x.seed}|${x.arm}|${x.t}|${x.partnerId}`)!;
    f.ehMeetings += 1;
    if (h.meChits < 1) continue;
    f.hardHoldsMark += 1;
    if (!isSale(x.original)) continue;
    f.sellerOffersSale += 1;
    if (!isMarkOffer(h.original)) continue;
    f.buyerOffersMark += 1;
    if (resolveMeeting(stateOf(x), stateOf(h), x.original, h.original).kind === "chit-for-check") f.bothCompatible += 1;
    if (resolveMeeting(stateOf(x), stateOf(h), x.executed, h.executed).kind === "chit-for-check") f.executedSales += 1;
  }
  return f;
}

// ---------------------------------------------------------------------------
// 5. Fixed-state comparisons
// ---------------------------------------------------------------------------

export type FixedStateCell = {
  cell: DirectedCell;
  decisions: number;
  seedsWithDecisions: number;
  armGiveRate: number; referenceGiveRate: number;
  armGivesReferenceKeeps: number; referenceGivesArmKeeps: number;
  seedMeanDifference: number; bootstrap95: [number, number] | null;
};

export type FixedStateComparison = {
  study: StudyId; arm: string; reference: string;
  /** Every first-meeting state must hash identically across arms once the announcement is removed. */
  firstMeetingStatesIdentical: boolean;
  cells: FixedStateCell[];
};

const key = (x: Decision) => `${x.seed}|${x.t}|${x.id}`;

/**
 * Compare an arm with a reference arm at decisions taken from byte-identical
 * states (identical prompt once the announcement is removed). At a decider's
 * first meeting the state contains no post-treatment history: same round,
 * role, inventories, score, and an empty memory. Differences there are the
 * announcement's direct effect at that state, free of trajectory feedback.
 */
export function compareFixedState(
  study: StudyId, decisions: readonly Decision[], arm: string, reference: string,
  filter: (x: Decision) => boolean = x => x.firstMeeting,
): FixedStateComparison {
  const ref = new Map(decisions.filter(x => x.arm === reference && filter(x)).map(x => [key(x), x]));
  const pairs = decisions.filter(x => x.arm === arm && filter(x)).map(x => [x, ref.get(key(x))] as const);
  const firstMeetingStatesIdentical = pairs.every(([a, r]) => r !== undefined && r.strippedHash === a.strippedHash);
  const cells: FixedStateCell[] = DIRECTED_CELLS.map(cell => {
    const matched = pairs.filter(([a, r]) => r && cellOf(a.meType, a.partnerType) === cell && r.strippedHash === a.strippedHash) as Array<readonly [Decision, Decision]>;
    const bySeed = new Map<number, number[]>();
    let ag = 0, rg = 0, aOnly = 0, rOnly = 0;
    for (const [a, r] of matched) {
      const ga = Number(isGive(a.original)), gr = Number(isGive(r.original));
      ag += ga; rg += gr; if (ga && !gr) aOnly += 1; if (gr && !ga) rOnly += 1;
      const list = bySeed.get(a.seed) ?? []; list.push(ga - gr); bySeed.set(a.seed, list);
    }
    const seedMeans = [...bySeed.values()].map(mean);
    return {
      cell, decisions: matched.length, seedsWithDecisions: bySeed.size,
      armGiveRate: matched.length ? ag / matched.length : Number.NaN,
      referenceGiveRate: matched.length ? rg / matched.length : Number.NaN,
      armGivesReferenceKeeps: aOnly, referenceGivesArmKeeps: rOnly,
      seedMeanDifference: mean(seedMeans), bootstrap95: seedMeans.length ? bootstrapMean95(seedMeans) : null,
    };
  });
  return { study, arm, reference, firstMeetingStatesIdentical, cells };
}

/** Seed-level closed-loop give-rate difference for one directed cell (all decisions). */
export function closedLoopDifference(decisions: readonly Decision[], arm: string, reference: string, cell: DirectedCell): number {
  const rate = (a: string) => {
    const bySeed = new Map<number, number[]>();
    for (const x of decisions) if (x.arm === a && cellOf(x.meType, x.partnerType) === cell) {
      const list = bySeed.get(x.seed) ?? []; list.push(Number(isGive(x.original))); bySeed.set(x.seed, list);
    }
    return new Map([...bySeed].map(([s, xs]) => [s, mean(xs)]));
  };
  const A = rate(arm), R = rate(reference);
  return mean([...A.keys()].filter(s => R.has(s)).map(s => A.get(s)! - R.get(s)!));
}

export type DeterminismCheck = {
  armA: string; armB: string; identicalPrompts: number; identicalProposals: number;
  /** Among identical prompts: A gives unconditionally and B does not, and the reverse. */
  aGivesBKeeps: number; bGivesAKeeps: number;
  firstMeetingIdenticalPrompts: number; firstMeetingIdenticalProposals: number;
};

/** Temperature-0 check: decisions with byte-identical full prompts in two arms. */
export function determinismCheck(decisions: readonly Decision[], armA: string, armB: string): DeterminismCheck {
  const b = new Map(decisions.filter(x => x.arm === armB).map(x => [key(x), x]));
  const out: DeterminismCheck = { armA, armB, identicalPrompts: 0, identicalProposals: 0, aGivesBKeeps: 0, bGivesAKeeps: 0, firstMeetingIdenticalPrompts: 0, firstMeetingIdenticalProposals: 0 };
  const strip = (p: Proposal) => JSON.stringify([p.giveCheck, Math.floor(p.giveChits), p.requireChit]);
  for (const a of decisions) {
    if (a.arm !== armA) continue;
    const other = b.get(key(a));
    if (!other || other.fullHash !== a.fullHash) continue;
    const same = strip(a.original) === strip(other.original);
    out.identicalPrompts += 1; if (same) out.identicalProposals += 1;
    if (a.firstMeeting) { out.firstMeetingIdenticalPrompts += 1; if (same) out.firstMeetingIdenticalProposals += 1; }
    if (isGive(a.original) && !isGive(other.original)) out.aGivesBKeeps += 1;
    if (isGive(other.original) && !isGive(a.original)) out.bGivesAKeeps += 1;
  }
  return out;
}

export type DynamicsRow = { arm: string; cell: DirectedCell; ordinal: string; decisions: number; gives: number; rate: number };

/**
 * Descriptive closed-loop dynamics: unconditional-give rate by the decider's
 * meeting ordinal (1st, 2nd, 3rd, 4th or later meeting in the run). Later
 * ordinals condition on realized history, so this is not a causal estimate.
 */
export function dynamicsByOrdinal(decisions: readonly Decision[], arms: readonly string[], cells: readonly DirectedCell[]): DynamicsRow[] {
  const ordinal = new Map<Decision, number>();
  const groups = new Map<string, Decision[]>();
  for (const x of decisions) {
    const g = `${x.seed}|${x.arm}|${x.id}`;
    const list = groups.get(g) ?? []; list.push(x); groups.set(g, list);
  }
  for (const list of groups.values()) [...list].sort((a, b) => a.t - b.t).forEach((x, k) => ordinal.set(x, k + 1));
  const rows: DynamicsRow[] = [];
  const bins = [["1", 1, 1], ["2", 2, 2], ["3", 3, 3], ["4+", 4, Infinity]] as const;
  for (const arm of arms) for (const cell of cells) for (const [label, lo, hi] of bins) {
    const sel = decisions.filter(x => x.arm === arm && cellOf(x.meType, x.partnerType) === cell && ordinal.get(x)! >= lo && ordinal.get(x)! <= hi);
    const gives = sel.filter(x => isGive(x.original)).length;
    rows.push({ arm, cell, ordinal: label, decisions: sel.length, gives, rate: sel.length ? gives / sel.length : Number.NaN });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// W-RG execution-filter audit
// ---------------------------------------------------------------------------

export type FilterAudit = {
  arm: string; blockedProposals: number;
  /** local resolution with both original proposals -> local resolution after the filter */
  transitions: Record<string, number>;
};

/** For each meeting touched by a W-RG filter, compare original and executed local resolutions. */
export function filterAudit(decisions: readonly Decision[], arm: string): FilterAudit {
  const index = new Map(decisions.filter(x => x.arm === arm).map(x => [key(x), x]));
  const seen = new Set<string>();
  const transitions: Record<string, number> = {};
  let blockedProposals = 0;
  for (const x of index.values()) {
    if (x.blocked) blockedProposals += 1;
    const partner = index.get(`${x.seed}|${x.t}|${x.partnerId}`)!;
    if (!x.blocked && !partner.blocked) continue;
    const mk = `${x.seed}|${x.t}|${Math.min(x.id, x.partnerId)}`;
    if (seen.has(mk)) continue;
    seen.add(mk);
    const label = (a: Decision, b: Decision, which: "original" | "executed") => {
      const res = resolveMeeting(stateOf(a), stateOf(b), a[which], b[which]);
      return categorize({ iType: a.meType, jType: b.meType, kind: res.kind, seller: res.seller, buyer: res.buyer, i: a.id, j: b.id });
    };
    const t = `${label(x, partner, "original")} -> ${label(x, partner, "executed")}`;
    transitions[t] = (transitions[t] ?? 0) + 1;
  }
  return { arm, blockedProposals, transitions };
}

// ---------------------------------------------------------------------------
// 6. Supplementary inference
// ---------------------------------------------------------------------------

export type SupplementaryEffect = {
  name: string; n: number; mean: number; mres: number;
  positive: number; negative: number; ties: number;
  minSeedDelta: number;
  /** Two-sided 95% percentile interval; its lower end is a one-sided 97.5% lower bound. */
  bootstrap95: [number, number] | null;
  lowerBoundExceedsMres: boolean;
  /** Exact upper-tail sign-flip p for H0: delta <= 0 (as frozen). */
  pZero: number | null;
  /** Exact upper-tail sign-flip p for H0: delta <= MRES (supplementary). */
  pMres: number | null;
  holmPMres: number | null;
  leaveOneOutMin: number; leaveOneOutMax: number;
  values: number[];
};

export function supplementaryEffect(name: string, values: readonly number[], mres: number): SupplementaryEffect {
  const xs = [...values];
  const loo = xs.map((_, k) => mean(xs.filter((__, q) => q !== k)));
  const ci = bootstrapMean95(xs);
  return {
    name, n: xs.length, mean: mean(xs), mres,
    positive: xs.filter(x => x > 0).length, negative: xs.filter(x => x < 0).length, ties: xs.filter(x => x === 0).length,
    minSeedDelta: Math.min(...xs), bootstrap95: ci, lowerBoundExceedsMres: ci ? ci[0] > mres : false,
    pZero: exactUpperSignFlipMitm(xs, 0), pMres: exactUpperSignFlipMitm(xs, mres), holmPMres: null,
    leaveOneOutMin: Math.min(...loo), leaveOneOutMax: Math.max(...loo), values: xs,
  };
}

/** Holm step-down adjustment of the MRES-shifted p-values within one family. */
export function holmMres(family: SupplementaryEffect[]): void {
  const order = family.map((e, k) => ({ k, p: e.pMres ?? 1 })).sort((a, b) => a.p - b.p);
  let running = 0;
  order.forEach(({ k, p }, rank) => {
    running = Math.max(running, Math.min(1, (family.length - rank) * p));
    family[k]!.holmPMres = running;
  });
}
