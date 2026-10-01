import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { bernoulli, mulberry32, shuffle } from "./rng.ts";
import type {
  AgentState,
  AgentType,
  Meeting,
  MemoryItem,
  Proposal,
  RoundSnapshot,
  RunResult,
  StrategyFn,
  TradeKind,
} from "./types.ts";

export type DecideFn = (
  me: AgentState,
  partner: AgentState,
  t: number,
  T: number,
) => Proposal | Promise<Proposal>;

export function makeAgents(params: VbeParams, rng: () => number): AgentState[] {
  const agents: AgentState[] = [];
  for (let id = 0; id < params.n; id++) {
    agents.push({
      id,
      type: "E",
      checks: 0,
      chits: 0,
      score: 0,
      solved: false,
      receivedFrom: null,
      memory: [],
    });
  }
  const holders = shuffle(
    agents.map((a) => a.id),
    rng,
  ).slice(0, params.M);
  for (const id of holders) agents[id]!.chits = 1;
  return agents;
}

export function assignTypes(n: number, rng: () => number): AgentType[] {
  const types: AgentType[] = [
    ...Array<AgentType>(n / 2).fill("H"),
    ...Array<AgentType>(n / 2).fill("E"),
  ];
  return shuffle(types, rng);
}

export function formPairs(
  n: number,
  q: number,
  rng: () => number,
): [number, number][] {
  const ids = shuffle(
    Array.from({ length: n }, (_, i) => i),
    rng,
  );
  const pairs: [number, number][] = [];
  for (let k = 0; k + 1 < ids.length; k += 2) {
    if (rng() < q) pairs.push([ids[k]!, ids[k + 1]!]);
  }
  return pairs;
}

export function resolveMeeting(
  i: AgentState,
  j: AgentState,
  pi: Proposal,
  pj: Proposal,
): { kind: TradeKind; seller: number | null; buyer: number | null } {
  const iGive = pi.giveCheck && i.checks >= 1;
  const jGive = pj.giveCheck && j.checks >= 1;
  const iPay = Math.min(Math.max(0, Math.floor(pi.giveChits)), i.chits);
  const jPay = Math.min(Math.max(0, Math.floor(pj.giveChits)), j.chits);

  if (iGive && jGive && !pi.requireChit && !pj.requireChit) {
    i.checks -= 1;
    j.checks -= 1;
    i.receivedFrom = j.type;
    j.receivedFrom = i.type;
    return { kind: "swap", seller: null, buyer: null };
  }

  if (iGive && pi.requireChit && jPay >= 1) {
    i.checks -= 1;
    j.chits -= 1;
    i.chits += 1;
    j.receivedFrom = i.type;
    return { kind: "chit-for-check", seller: i.id, buyer: j.id };
  }

  if (jGive && pj.requireChit && iPay >= 1) {
    j.checks -= 1;
    i.chits -= 1;
    j.chits += 1;
    i.receivedFrom = j.type;
    return { kind: "chit-for-check", seller: j.id, buyer: i.id };
  }

  if (iGive && !pi.requireChit) {
    i.checks -= 1;
    j.receivedFrom = i.type;
    if (iPay >= 1) {
      i.chits -= iPay;
      j.chits += iPay;
    }
    return { kind: "gift", seller: i.id, buyer: j.id };
  }

  if (jGive && !pj.requireChit) {
    j.checks -= 1;
    i.receivedFrom = j.type;
    if (jPay >= 1) {
      j.chits -= jPay;
      i.chits += jPay;
    }
    return { kind: "gift", seller: j.id, buyer: i.id };
  }

  return { kind: "none", seller: null, buyer: null };
}

function remember(
  me: AgentState,
  partner: AgentState,
  t: number,
  gaveCheck: boolean,
  gotCheck: boolean,
  gaveChits: number,
  gotChits: number,
  kind: TradeKind,
  K: number,
) {
  const item: MemoryItem = {
    t,
    partnerId: partner.id,
    partnerType: partner.type,
    gaveCheck,
    gotCheck,
    gaveChits,
    gotChits,
    kind,
  };
  me.memory = K <= 0 ? [] : [...me.memory, item].slice(-K);
}

function settleRound(
  agents: AgentState[],
  params: VbeParams,
  rng: () => number,
  successDraws?: readonly number[],
) {
  if (successDraws && successDraws.length !== agents.length) {
    throw new Error("successDraws must contain one draw per agent");
  }
  const succeeds = (agentId: number, probability: number) =>
    successDraws ? successDraws[agentId]! < probability : bernoulli(probability, rng);
  for (const a of agents) {
    if (a.type === "H" && !a.solved) {
      if (a.receivedFrom) {
        if (succeeds(a.id, params.pPartner)) {
          a.solved = true;
          a.score += params.R;
        }
      } else if (a.checks >= 1) {
        a.checks -= 1;
        if (succeeds(a.id, params.pHard)) {
          a.solved = true;
          a.score += params.R;
        }
      }
    }
    if (a.checks > 0) {
      a.score += a.checks * params.v;
      a.checks = 0;
    }
  }
}

type PairProposal = {
  i: AgentState;
  j: AgentState;
  pi: Proposal;
  pj: Proposal;
};

export function endowRound(
  agents: AgentState[],
  params: VbeParams,
  rng: () => number,
) {
  const types = assignTypes(params.n, rng);
  for (const a of agents) {
    a.type = types[a.id]!;
    a.checks = params.B;
    a.solved = false;
    a.receivedFrom = null;
    if (a.type === "E") {
      a.solved = true;
      a.score += params.R;
    }
  }
}

export function beginRound(
  agents: AgentState[],
  params: VbeParams,
  rng: () => number,
): [number, number][] {
  endowRound(agents, params, rng);
  return formPairs(params.n, params.q, rng);
}

export function applyMeetings(
  agents: AgentState[],
  t: number,
  params: VbeParams,
  rng: () => number,
  proposals: PairProposal[],
  successDraws?: readonly number[],
): RoundSnapshot {
  const meetings: Meeting[] = [];
  let heOffers = 0;
  let heAccepts = 0;

  for (const { i, j, pi, pj } of proposals) {
    const iChitsBefore = i.chits;
    const jChitsBefore = j.chits;
    const iChecksBefore = i.checks;
    const jChecksBefore = j.checks;
    const { kind, seller, buyer } = resolveMeeting(i, j, pi, pj);

    const he =
      (i.type === "H" && j.type === "E") || (i.type === "E" && j.type === "H");
    if (he) {
      const hardHadChit = i.type === "H" ? iChitsBefore >= 1 : jChitsBefore >= 1;
      const easyHadCheck = i.type === "E" ? iChecksBefore >= 1 : jChecksBefore >= 1;
      if (hardHadChit && easyHadCheck) {
        heOffers += 1;
        const easyId = i.type === "E" ? i.id : j.id;
        if (kind === "chit-for-check" && seller === easyId) heAccepts += 1;
      }
    }

    remember(
      i,
      j,
      t,
      iChecksBefore > i.checks,
      i.receivedFrom !== null,
      Math.max(0, iChitsBefore - i.chits),
      Math.max(0, i.chits - iChitsBefore),
      kind,
      params.K,
    );
    remember(
      j,
      i,
      t,
      jChecksBefore > j.checks,
      j.receivedFrom !== null,
      Math.max(0, jChitsBefore - j.chits),
      Math.max(0, j.chits - jChitsBefore),
      kind,
      params.K,
    );

    const iForfeit: 0 | 1 = pi.forfeit === 1 ? 1 : 0;
    const jForfeit: 0 | 1 = pj.forfeit === 1 ? 1 : 0;
    if (iForfeit) i.score -= 1;
    if (jForfeit) j.score -= 1;

    meetings.push({
      t,
      i: i.id,
      j: j.id,
      iType: i.type,
      jType: j.type,
      pi,
      pj,
      kind,
      seller,
      buyer,
      hardHadChit: he
        ? (i.type === "H" ? iChitsBefore >= 1 : jChitsBefore >= 1)
        : false,
      easyHadCheck: he
        ? (i.type === "E" ? iChecksBefore >= 1 : jChecksBefore >= 1)
        : false,
      iForfeit,
      jForfeit,
      iPAccept: typeof pi.pAccept === "number" ? pi.pAccept : undefined,
      jPAccept: typeof pj.pAccept === "number" ? pj.pAccept : undefined,
      iPSecond: typeof pi.pSecond === "number" ? pi.pSecond : undefined,
      jPSecond: typeof pj.pSecond === "number" ? pj.pSecond : undefined,
    });
  }

  settleRound(agents, params, rng, successDraws);

  return {
    t,
    types: agents.map((a) => a.type),
    chits: agents.map((a) => a.chits),
    scores: agents.map((a) => a.score),
    meetings,
    solved: agents.map((a) => a.solved),
    heOffers,
    heAccepts,
  };
}

export type BeforeMeetingsFn = (
  agents: AgentState[],
  t: number,
  params: VbeParams,
) => void | Promise<void>;
export type AfterMeetingsFn = (
  agents: AgentState[],
  snapshot: RoundSnapshot,
  params: VbeParams,
) => void | Promise<void>;
export type ShockConfig = { start: number; end: number };
export type RoundNotice = "normal" | "shock" | "restore";

export function applyMarkShock(
  agents: AgentState[],
  t: number,
  params: VbeParams,
  rng: () => number,
  shock?: ShockConfig,
): RoundNotice {
  if (!shock) return "normal";
  if (t >= shock.start && t <= shock.end) {
    for (const a of agents) a.chits = 0;
    return "shock";
  }
  if (t === shock.end + 1) {
    for (const a of agents) a.chits = 0;
    const holders = shuffle(
      agents.map((a) => a.id),
      rng,
    ).slice(0, params.M);
    for (const id of holders) agents[id]!.chits = 1;
    return "restore";
  }
  return "normal";
}

export function runRound(
  agents: AgentState[],
  t: number,
  params: VbeParams,
  rng: () => number,
  strategy: StrategyFn,
  shock?: ShockConfig,
): RoundSnapshot {
  const pairs = beginRound(agents, params, rng);
  applyMarkShock(agents, t, params, rng, shock);
  const proposals = pairs.map(([ii, jj]) => {
    const i = agents[ii]!;
    const j = agents[jj]!;
    return {
      i,
      j,
      pi: strategy(i, j, t, params.T),
      pj: strategy(j, i, t, params.T),
    };
  });
  return applyMeetings(agents, t, params, rng, proposals);
}

export async function runRoundWithDecide(
  agents: AgentState[],
  t: number,
  params: VbeParams,
  rng: () => number,
  decide: DecideFn,
  shock?: ShockConfig,
  beforeMeetings?: BeforeMeetingsFn,
  successDraws?: readonly number[],
  afterMeetings?: AfterMeetingsFn,
): Promise<RoundSnapshot> {
  const pairs = beginRound(agents, params, rng);
  applyMarkShock(agents, t, params, rng, shock);
  if (beforeMeetings) await beforeMeetings(agents, t, params);
  const proposals = await Promise.all(
    pairs.map(async ([ii, jj]) => {
      const i = agents[ii]!;
      const j = agents[jj]!;
      const [pi, pj] = await Promise.all([
        Promise.resolve(decide(i, j, t, params.T)),
        Promise.resolve(decide(j, i, t, params.T)),
      ]);
      return { i, j, pi, pj };
    }),
  );
  const snapshot = applyMeetings(agents, t, params, rng, proposals, successDraws);
  if (afterMeetings) await afterMeetings(agents, snapshot, params);
  return snapshot;
}

function tally(rounds: RoundSnapshot[], scores: number[]): RunResult {
  let heOffersInterior = 0;
  let heAcceptsInterior = 0;
  let heOffersEnd = 0;
  let heAcceptsEnd = 0;
  const T = rounds.length;
  for (const snap of rounds) {
    const end = snap.t === T;
    if (end) {
      heOffersEnd += snap.heOffers;
      heAcceptsEnd += snap.heAccepts;
    } else {
      heOffersInterior += snap.heOffers;
      heAcceptsInterior += snap.heAccepts;
    }
  }
  const meanScore = scores.reduce((s, x) => s + x, 0) / Math.max(1, scores.length);
  return {
    scores,
    meanScore,
    heOffersInterior,
    heAcceptsInterior,
    heOffersEnd,
    heAcceptsEnd,
    accInterior: heOffersInterior === 0 ? 0 : heAcceptsInterior / heOffersInterior,
    accEnd: heOffersEnd === 0 ? 0 : heAcceptsEnd / heOffersEnd,
    rounds,
  };
}

export function runPopulation(
  seed: number,
  strategy: StrategyFn,
  params: VbeParams = DEFAULT_PARAMS,
  keepRounds = true,
  shock?: ShockConfig,
): RunResult {
  const rng = mulberry32(seed);
  const agents = makeAgents(params, rng);
  const rounds: RoundSnapshot[] = [];
  for (let t = 1; t <= params.T; t++) {
    const snap = runRound(agents, t, params, rng, strategy, shock);
    rounds.push(keepRounds ? snap : { ...snap, meetings: [] });
  }
  const result = tally(
    rounds,
    agents.map((a) => a.score),
  );
  if (!keepRounds) result.rounds = [];
  return result;
}

export async function runPopulationAsync(
  seed: number,
  decide: DecideFn,
  params: VbeParams = DEFAULT_PARAMS,
  keepRounds = true,
  shock?: ShockConfig,
  beforeMeetings?: BeforeMeetingsFn,
  afterMeetings?: AfterMeetingsFn,
): Promise<RunResult> {
  const rng = mulberry32(seed);
  const agents = makeAgents(params, rng);
  const rounds: RoundSnapshot[] = [];
  for (let t = 1; t <= params.T; t++) {
    const snap = await runRoundWithDecide(agents, t, params, rng, decide, shock, beforeMeetings, undefined, afterMeetings);
    rounds.push(snap);
  }
  const result = tally(rounds, agents.map((a) => a.score));
  if (!keepRounds) result.rounds = [];
  return result;
}

/**
 * Async population runner for paired causal comparisons.
 *
 * Structural randomness (initial holders, roles, pairs, shocks) is isolated
 * from payoff randomness. One payoff draw is pre-generated for every agent in
 * every round, so behavior-dependent settlement paths cannot shift later roles
 * or pairings and cannot change which random draw an agent receives.
 */
export async function runPopulationAsyncPaired(
  seed: number,
  decide: DecideFn,
  params: VbeParams = DEFAULT_PARAMS,
  keepRounds = true,
  shock?: ShockConfig,
  beforeMeetings?: BeforeMeetingsFn,
  afterMeetings?: AfterMeetingsFn,
): Promise<RunResult> {
  const structuralRng = mulberry32(seed);
  const payoffRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const agents = makeAgents(params, structuralRng);
  const rounds: RoundSnapshot[] = [];
  for (let t = 1; t <= params.T; t++) {
    const successDraws = Array.from({ length: params.n }, () => payoffRng());
    const snap = await runRoundWithDecide(
      agents,
      t,
      params,
      structuralRng,
      decide,
      shock,
      beforeMeetings,
      successDraws,
      afterMeetings,
    );
    rounds.push(snap);
  }
  const result = tally(rounds, agents.map((a) => a.score));
  if (!keepRounds) result.rounds = [];
  return result;
}

export function finiteMean(xs: number[]): number {
  const good = xs.filter((x) => Number.isFinite(x));
  if (good.length === 0) return 0;
  return good.reduce((s, x) => s + x, 0) / good.length;
}

export function finiteStd(xs: number[]): number {
  const good = xs.filter((x) => Number.isFinite(x));
  if (good.length < 2) return 0;
  const m = finiteMean(good);
  const v = good.reduce((s, x) => s + (x - m) ** 2, 0) / (good.length - 1);
  return Math.sqrt(v);
}
