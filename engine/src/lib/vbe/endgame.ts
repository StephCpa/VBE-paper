import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { applyMeetings, endowRound } from "./env.ts";
import { mulberry32, shuffle } from "./rng.ts";
import { STRATEGIES } from "./robots.ts";
import type {
  AgentState,
  Meeting,
  MemoryItem,
  Proposal,
  RunResult,
  StrategyFn,
} from "./types.ts";
import type { DecideFn } from "./env.ts";
import type { PromptCondition } from "./prompts.ts";

export type ProbeCounts = {
  opportunities: number;
  sells: number;
  gifts: number;
  refusals: number;
  accSale: number;
  accGift: number;
};

export type ProbeTrial = {
  condition: PromptCondition;
  seed: number;
  pairing: "forced-he-sale";
  llm: ProbeCounts;
  kw: ProbeCounts;
  altruist: ProbeCounts;
  meetings: Meeting[];
};

function ratio(num: number, den: number): number {
  return den === 0 ? 0 : num / den;
}

function countsFromMeetings(
  meetings: Meeting[],
  agentsBefore: { id: number; type: AgentState["type"]; chits: number; checks: number }[],
): ProbeCounts {
  let opportunities = 0;
  let sells = 0;
  let gifts = 0;
  for (const m of meetings) {
    const i = agentsBefore.find((a) => a.id === m.i)!;
    const j = agentsBefore.find((a) => a.id === m.j)!;
    const he =
      (i.type === "H" && j.type === "E") || (i.type === "E" && j.type === "H");
    if (!he) continue;
    const hard = i.type === "H" ? i : j;
    const easy = i.type === "E" ? i : j;
    if (hard.chits < 1 || easy.checks < 1) continue;
    opportunities += 1;
    if (m.kind === "chit-for-check" && m.seller === easy.id) sells += 1;
    else if (m.kind === "gift" && m.seller === easy.id) gifts += 1;
  }
  return {
    opportunities,
    sells,
    gifts,
    refusals: Math.max(0, opportunities - sells - gifts),
    accSale: ratio(sells, opportunities),
    accGift: ratio(gifts, opportunities),
  };
}

export function memoriesFromMeeting(m: Meeting): [MemoryItem, MemoryItem] {
  const iGaveCheck =
    m.kind === "swap" ||
    ((m.kind === "chit-for-check" || m.kind === "gift") && m.seller === m.i);
  const jGaveCheck =
    m.kind === "swap" ||
    ((m.kind === "chit-for-check" || m.kind === "gift") && m.seller === m.j);
  const iGaveChits =
    m.kind === "chit-for-check" && m.buyer === m.i
      ? 1
      : m.kind === "gift" && m.seller === m.i
        ? m.pi.giveChits
        : 0;
  const jGaveChits =
    m.kind === "chit-for-check" && m.buyer === m.j
      ? 1
      : m.kind === "gift" && m.seller === m.j
        ? m.pj.giveChits
        : 0;
  const iGotChits =
    m.kind === "chit-for-check" && m.seller === m.i
      ? 1
      : m.kind === "gift" && m.seller === m.j
        ? m.pj.giveChits
        : 0;
  const jGotChits =
    m.kind === "chit-for-check" && m.seller === m.j
      ? 1
      : m.kind === "gift" && m.seller === m.i
        ? m.pi.giveChits
        : 0;
  const iItem: MemoryItem = {
    t: m.t,
    partnerId: m.j,
    partnerType: m.jType,
    gaveCheck: iGaveCheck,
    gotCheck: jGaveCheck,
    gaveChits: iGaveChits,
    gotChits: iGotChits,
    kind: m.kind,
  };
  const jItem: MemoryItem = {
    t: m.t,
    partnerId: m.i,
    partnerType: m.iType,
    gaveCheck: jGaveCheck,
    gotCheck: iGaveCheck,
    gaveChits: jGaveChits,
    gotChits: jGotChits,
    kind: m.kind,
  };
  return [iItem, jItem];
}

export function reconstructAgentsAt(
  result: RunResult,
  params: VbeParams,
  lastInclusiveT: number,
): AgentState[] {
  const snap = result.rounds.find((r) => r.t === lastInclusiveT);
  if (!snap) throw new Error(`missing snapshot t=${lastInclusiveT}`);
  const agents: AgentState[] = [];
  for (let id = 0; id < params.n; id++) {
    agents.push({
      id,
      type: snap.types[id]!,
      checks: 0,
      chits: snap.chits[id]!,
      score: snap.scores[id]!,
      solved: snap.solved[id]!,
      receivedFrom: null,
      memory: [],
    });
  }
  for (const round of result.rounds) {
    if (round.t > lastInclusiveT) continue;
    for (const m of round.meetings) {
      const [iItem, jItem] = memoriesFromMeeting(m);
      const i = agents[m.i]!;
      const j = agents[m.j]!;
      i.memory = [...i.memory, iItem].slice(-params.K);
      j.memory = [...j.memory, jItem].slice(-params.K);
    }
  }
  return agents;
}

export function formSalePairs(
  agents: AgentState[],
  rng: () => number,
): [number, number][] {
  const hard = shuffle(
    agents.filter((a) => a.type === "H" && a.chits >= 1).map((a) => a.id),
    rng,
  );
  const easy = shuffle(
    agents.filter((a) => a.type === "E").map((a) => a.id),
    rng,
  );
  const n = Math.min(hard.length, easy.length);
  const pairs: [number, number][] = [];
  for (let k = 0; k < n; k++) pairs.push([hard[k]!, easy[k]!]);
  return pairs;
}

function cloneAgents(agents: AgentState[]): AgentState[] {
  return agents.map((a) => ({
    ...a,
    memory: a.memory.map((m) => ({ ...m })),
  }));
}

function snapshotBefore(agents: AgentState[]) {
  return agents.map((a) => ({
    id: a.id,
    type: a.type,
    chits: a.chits,
    checks: a.checks,
  }));
}

function playPairs(
  agents: AgentState[],
  pairs: [number, number][],
  t: number,
  T: number,
  params: VbeParams,
  rng: () => number,
  proposals: { i: AgentState; j: AgentState; pi: Proposal; pj: Proposal }[],
): { meetings: Meeting[]; counts: ProbeCounts } {
  const before = snapshotBefore(agents);
  const snap = applyMeetings(agents, t, params, rng, proposals);
  return { meetings: snap.meetings, counts: countsFromMeetings(snap.meetings, before) };
}

function robotProposals(
  agents: AgentState[],
  pairs: [number, number][],
  t: number,
  T: number,
  strategy: StrategyFn,
) {
  return pairs.map(([ii, jj]) => {
    const i = agents[ii]!;
    const j = agents[jj]!;
    return {
      i,
      j,
      pi: strategy(i, j, t, T),
      pj: strategy(j, i, t, T),
    };
  });
}

export function runEndgameProbeSync(opts: {
  result: RunResult;
  seed: number;
  condition: PromptCondition;
  params?: VbeParams;
}): Omit<ProbeTrial, "llm"> & { llm: ProbeCounts } {
  const params = opts.params ?? DEFAULT_PARAMS;
  const t = params.T;
  const rng = mulberry32((opts.seed + 90011) >>> 0);
  const agents = reconstructAgentsAt(opts.result, params, params.T - 1);
  endowRound(agents, params, rng);
  const pairs = formSalePairs(agents, rng);
  const before = cloneAgents(agents);

  const kwAgents = cloneAgents(before);
  const altAgents = cloneAgents(before);
  const kwPlay = playPairs(
    kwAgents,
    pairs,
    t,
    params.T,
    params,
    mulberry32((opts.seed + 11) >>> 0),
    robotProposals(kwAgents, pairs, t, params.T, STRATEGIES.kw),
  );
  const altPlay = playPairs(
    altAgents,
    pairs,
    t,
    params.T,
    params,
    mulberry32((opts.seed + 13) >>> 0),
    robotProposals(altAgents, pairs, t, params.T, STRATEGIES.altruist),
  );

  return {
    condition: opts.condition,
    seed: opts.seed,
    pairing: "forced-he-sale",
    llm: { opportunities: 0, sells: 0, gifts: 0, refusals: 0, accSale: 0, accGift: 0 },
    kw: kwPlay.counts,
    altruist: altPlay.counts,
    meetings: [],
  };
}

export async function runEndgameProbeAsync(opts: {
  result: RunResult;
  seed: number;
  condition: PromptCondition;
  decide: DecideFn;
  params?: VbeParams;
}): Promise<ProbeTrial> {
  const params = opts.params ?? DEFAULT_PARAMS;
  const t = params.T;
  const rng = mulberry32((opts.seed + 90011) >>> 0);
  const agents = reconstructAgentsAt(opts.result, params, params.T - 1);
  endowRound(agents, params, rng);
  const pairs = formSalePairs(agents, rng);
  const before = cloneAgents(agents);

  const llmAgents = cloneAgents(before);
  const proposals = await Promise.all(
    pairs.map(async ([ii, jj]) => {
      const i = llmAgents[ii]!;
      const j = llmAgents[jj]!;
      const [pi, pj] = await Promise.all([
        Promise.resolve(opts.decide(i, j, t, params.T)),
        Promise.resolve(opts.decide(j, i, t, params.T)),
      ]);
      return { i, j, pi, pj };
    }),
  );
  const llmPlay = playPairs(
    llmAgents,
    pairs,
    t,
    params.T,
    params,
    mulberry32((opts.seed + 17) >>> 0),
    proposals,
  );

  const robots = runEndgameProbeSync({
    result: opts.result,
    seed: opts.seed,
    condition: opts.condition,
    params,
  });

  return {
    condition: opts.condition,
    seed: opts.seed,
    pairing: "forced-he-sale",
    llm: llmPlay.counts,
    kw: robots.kw,
    altruist: robots.altruist,
    meetings: llmPlay.meetings,
  };
}

export function poolCounts(trials: ProbeTrial[], who: "llm" | "kw" | "altruist"): ProbeCounts {
  const opportunities = trials.reduce((s, t) => s + t[who].opportunities, 0);
  const sells = trials.reduce((s, t) => s + t[who].sells, 0);
  const gifts = trials.reduce((s, t) => s + t[who].gifts, 0);
  return {
    opportunities,
    sells,
    gifts,
    refusals: Math.max(0, opportunities - sells - gifts),
    accSale: ratio(sells, opportunities),
    accGift: ratio(gifts, opportunities),
  };
}
