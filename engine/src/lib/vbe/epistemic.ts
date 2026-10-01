import { DEFAULT_PARAMS } from "./params.ts";
import { coordinationWindow } from "./value.ts";
import { MODEL } from "./llm.ts";
import type { Meeting, Proposal, RunResult } from "./types.ts";

export type EpistemicKind = "private" | "public";

export const EPISTEMIC_K = 1;
export const EPISTEMIC_ROBOT_IDS = [0] as const;
export const EPISTEMIC_BELIEF_WEIGHT = 0.25;

export function epistemicRobotIds(k: number, n = DEFAULT_PARAMS.n): number[] {
  if (!Number.isInteger(k) || k < 1 || k >= n) {
    throw new Error(`k must be an integer in [1, ${n - 1}]`);
  }
  return Array.from({ length: k }, (_value, id) => id);
}

export function epistemicFactForK(k: number): string {
  const ids = epistemicRobotIds(k);
  if (k === 1) {
    return "VERIFIED BEHAVIORAL FACT: Agent #0 uses a fixed strategy. In every non-final round, whenever agent #0 is EASY with a leftover check and meets a HARD agent that offers one mark, agent #0 gives the check and requires the mark. This describes agent #0's fixed behavior; it does not recommend an action to you.";
  }
  const names = ids.map((id) => `#${id}`).join(", ").replace(/, ([^,]+)$/, " and $1");
  return `VERIFIED BEHAVIORAL FACT: Agents ${names} each use the same fixed strategy. In every non-final round, whenever either fixed agent is EASY with a leftover check and meets a HARD agent that offers one mark, that fixed agent gives the check and requires the mark. This describes only their fixed behavior; it does not recommend an action to you.`;
}

export function epistemicNoticesForK(k: number): Record<EpistemicKind, string> {
  const fact = epistemicFactForK(k);
  if (k === 1) {
    return {
      private: `PRIVATE DELIVERY METADATA. ${fact}
This notice certifies only what YOU received. The delivery system gives you no evidence about whether another non-fixed agent received the fact, and provides no receipt chain. Do not treat receipt by others as established by this private notice.`,
      public: `PUBLIC LEDGER ENTRY E-1. ${fact}
The system certifies that this exact ledger entry is visible to every agent throughout the run. Every agent sees this same certification, including the statement that every agent sees it. The entry records behavior and delivery; it does not recommend an action.`,
    };
  }
  return {
    private: `PRIVATE DELIVERY METADATA. ${fact}
This notice certifies only what YOU received. The delivery system gives you no evidence about whether another non-fixed agent received the fact, and provides no receipt chain. Do not treat receipt by others as established by this private notice.`,
    public: `PUBLIC LEDGER ENTRY E-${k}. ${fact}
The system certifies that this exact ledger entry is visible to every agent throughout the run. Every agent sees this same certification, including the statement that every agent sees it. The entry records behavior and delivery; it does not recommend an action.`,
  };
}

export function epistemicBeliefInstructionForK(k: number, n = DEFAULT_PARAMS.n): string {
  if (k === 1 && n === DEFAULT_PARAMS.n) {
    return `ELICIT PRIVATELY BEFORE ACTING. Agents #1–#7 are non-fixed agents. Report both answers as fractions from 0 to 1, not counts or percentages.
- pAccept: across eligible seller decisions made by the other non-fixed agents (exclude yourself and fixed agent #0), the fraction you predict will offer a leftover check in exchange for one mark.
- pSecond: the average pAccept you predict those other non-fixed agents would themselves report about their respective non-fixed peers.
These reports are not shown to any other agent before the run ends. At the end, your average report for each field earns up to 0.25 points under a quadratic accuracy score: 0.25 × (1 − squared error). pAccept is checked against the other non-fixed agents' realized seller-intent rate; pSecond is checked against their average pAccept report.`;
  }
  const first = k;
  const last = n - 1;
  const fixed = epistemicRobotIds(k, n).map((id) => `#${id}`).join(", ");
  return `ELICIT PRIVATELY BEFORE ACTING. Agents #${first}–#${last} are non-fixed agents. Report both answers as fractions from 0 to 1, not counts or percentages.
- pAccept: across eligible seller decisions made by the other non-fixed agents (exclude yourself and fixed agents ${fixed}), the fraction you predict will offer a leftover check in exchange for one mark.
- pSecond: the average pAccept you predict those other non-fixed agents would themselves report about their respective non-fixed peers.
These reports are not shown to any other agent before the run ends. At the end, your average report for each field earns up to 0.25 points under a quadratic accuracy score: 0.25 × (1 − squared error). pAccept is checked against the other non-fixed agents' realized seller-intent rate; pSecond is checked against their average pAccept report.`;
}

export const EPISTEMIC_FACT = epistemicFactForK(EPISTEMIC_K);
const EPISTEMIC_NOTICES = epistemicNoticesForK(EPISTEMIC_K);

export const PRIVATE_NOTICE = EPISTEMIC_NOTICES.private;

export const PUBLIC_NOTICE = EPISTEMIC_NOTICES.public;

export const EPISTEMIC_BELIEF_INSTRUCTION = epistemicBeliefInstructionForK(EPISTEMIC_K);

export const EPISTEMIC_WINDOW = (() => {
  const window = coordinationWindow(EPISTEMIC_K, DEFAULT_PARAMS);
  if (!window) throw new Error("frozen VBE parameters have no epistemic coordination window");
  return window;
})();

export function epistemicNotice(kind: EpistemicKind): string {
  return kind === "private" ? PRIVATE_NOTICE : PUBLIC_NOTICE;
}

export type CoordinationSlice = {
  heMeetings: number;
  opportunities: number;
  sellerIntents: number;
  buyerIntents: number;
  trades: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  sellerIntentPerHe: number;
  buyerIntentPerHe: number;
  tradePerHe: number;
};

export type EpistemicBeliefMean = {
  n: number;
  pAccept: number;
  pSecond: number;
};

export type EpistemicBeliefScore = {
  agentId: number;
  reports: number;
  pAcceptReport: number;
  pAcceptTarget: number;
  pSecondReport: number;
  pSecondTarget: number;
  pAcceptBonus: number;
  pSecondBonus: number;
  totalBonus: number;
};

export type EpistemicBeliefScoring = {
  weightPerField: number;
  agents: EpistemicBeliefScore[];
  meanBonus: number;
};

export type EpistemicRun = {
  kind: EpistemicKind;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  robotIds: number[];
  scheduleHash: string;
  primaryRounds: { first: number; last: number };
  meanScore: number;
  totalMeanScore: number;
  llmSeller: CoordinationSlice;
  llmBuyer: CoordinationSlice;
  llmLlm: CoordinationSlice;
  belief: EpistemicBeliefMean;
  beliefScoring: EpistemicBeliefScoring;
  result: RunResult;
};

export type EpistemicSummary = {
  nSeeds: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  pAccept: number;
  pSecond: number;
  meanScore: number;
  totalMeanScore: number;
};

export type EpistemicPairDelta = {
  seed: number;
  sellerIntentRate: number;
  buyerIntentRate: number;
  tradeRate: number;
  pAccept: number;
  pSecond: number;
  meanScore: number;
};

export type EpistemicReport = {
  model: string;
  k: number;
  robotIds: number[];
  fact: string;
  notices: Record<EpistemicKind, string>;
  primaryRounds: { first: number; last: number };
  estimand: string;
  runs: EpistemicRun[];
  byKind: Partial<Record<EpistemicKind, EpistemicSummary>>;
  pairedDeltas: EpistemicPairDelta[];
  verdict: string;
  caveat: string;
  generatedAt: string;
};

function zeroSlice(): CoordinationSlice {
  return {
    heMeetings: 0,
    opportunities: 0,
    sellerIntents: 0,
    buyerIntents: 0,
    trades: 0,
    sellerIntentRate: 0,
    buyerIntentRate: 0,
    tradeRate: 0,
    sellerIntentPerHe: 0,
    buyerIntentPerHe: 0,
    tradePerHe: 0,
  };
}

function proposalsByRole(m: Meeting): {
  easyId: number;
  hardId: number;
  easy: Proposal;
  hard: Proposal;
} | null {
  if (m.iType === "E" && m.jType === "H") {
    return { easyId: m.i, hardId: m.j, easy: m.pi, hard: m.pj };
  }
  if (m.iType === "H" && m.jType === "E") {
    return { easyId: m.j, hardId: m.i, easy: m.pj, hard: m.pi };
  }
  return null;
}

export function coordinationSlice(
  result: RunResult,
  pred: (easyId: number, hardId: number) => boolean = () => true,
  firstRound = EPISTEMIC_WINDOW.firstRound,
  lastRound = EPISTEMIC_WINDOW.lastRound,
): CoordinationSlice {
  const out = zeroSlice();
  for (const snap of result.rounds) {
    if (snap.t < firstRound || snap.t > lastRound) continue;
    for (const meeting of snap.meetings) {
      const roles = proposalsByRole(meeting);
      if (!roles) continue;
      if (!pred(roles.easyId, roles.hardId)) continue;
      out.heMeetings += 1;
      const sellerIntent = roles.easy.giveCheck && roles.easy.requireChit;
      const buyerIntent = roles.hard.giveChits >= 1;
      if (sellerIntent) out.sellerIntentPerHe += 1;
      if (buyerIntent) out.buyerIntentPerHe += 1;
      if (meeting.kind === "chit-for-check" && meeting.seller === roles.easyId) {
        out.tradePerHe += 1;
      }
      if (!meeting.hardHadChit || !meeting.easyHadCheck) continue;
      out.opportunities += 1;
      if (sellerIntent) out.sellerIntents += 1;
      if (buyerIntent) out.buyerIntents += 1;
      if (meeting.kind === "chit-for-check" && meeting.seller === roles.easyId) {
        out.trades += 1;
      }
    }
  }
  const d = Math.max(1, out.opportunities);
  out.sellerIntentRate = out.sellerIntents / d;
  out.buyerIntentRate = out.buyerIntents / d;
  out.tradeRate = out.trades / d;
  const he = Math.max(1, out.heMeetings);
  out.sellerIntentPerHe /= he;
  out.buyerIntentPerHe /= he;
  out.tradePerHe /= he;
  return out;
}

/** Fingerprint only exogenous roles and realized meeting pairs, not actions. */
export function structuralScheduleHash(result: RunResult): string {
  const raw = result.rounds
    .map(
      (snap) =>
        `${snap.t}:${snap.types.join("")}:${snap.meetings
          .map((meeting) => `${Math.min(meeting.i, meeting.j)}-${Math.max(meeting.i, meeting.j)}`)
          .join(",")}`,
    )
    .join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function epistemicBeliefMean(
  result: RunResult,
  robotIds: readonly number[] = EPISTEMIC_ROBOT_IDS,
  firstRound = EPISTEMIC_WINDOW.firstRound,
  lastRound = EPISTEMIC_WINDOW.lastRound,
): EpistemicBeliefMean {
  const robots = new Set(robotIds);
  let n = 0;
  let pAccept = 0;
  let pSecond = 0;
  for (const snap of result.rounds) {
    if (snap.t < firstRound || snap.t > lastRound) continue;
    for (const m of snap.meetings) {
      if (!robots.has(m.i) && typeof m.iPAccept === "number") {
        n += 1;
        pAccept += m.iPAccept;
        pSecond += m.iPSecond ?? 0;
      }
      if (!robots.has(m.j) && typeof m.jPAccept === "number") {
        n += 1;
        pAccept += m.jPAccept;
        pSecond += m.jPSecond ?? 0;
      }
    }
  }
  return {
    n,
    pAccept: n ? pAccept / n : 0,
    pSecond: n ? pSecond / n : 0,
  };
}

export function tallyEpistemicRun(
  result: RunResult,
  robotIds: readonly number[] = EPISTEMIC_ROBOT_IDS,
  firstRound = EPISTEMIC_WINDOW.firstRound,
  lastRound = EPISTEMIC_WINDOW.lastRound,
) {
  const robots = new Set(robotIds);
  return {
    llmSeller: coordinationSlice(
      result,
      (easyId) => !robots.has(easyId),
      firstRound,
      lastRound,
    ),
    llmBuyer: coordinationSlice(
      result,
      (_easyId, hardId) => !robots.has(hardId),
      firstRound,
      lastRound,
    ),
    llmLlm: coordinationSlice(
      result,
      (easyId, hardId) => !robots.has(easyId) && !robots.has(hardId),
      firstRound,
      lastRound,
    ),
    belief: epistemicBeliefMean(result, robotIds, firstRound, lastRound),
    beliefScoring: scoreEpistemicBeliefs(
      result,
      robotIds,
      EPISTEMIC_BELIEF_WEIGHT,
      firstRound,
      lastRound,
    ),
  };
}

type AgentAccumulator = {
  reports: number;
  pAccept: number;
  pSecond: number;
  sellerOpportunities: number;
  sellerIntents: number;
};

function quadraticBonus(report: number, target: number, weight: number): number {
  return weight * (1 - (report - target) ** 2);
}

export function scoreEpistemicBeliefs(
  result: RunResult,
  robotIds: readonly number[] = EPISTEMIC_ROBOT_IDS,
  weightPerField = EPISTEMIC_BELIEF_WEIGHT,
  firstRound = EPISTEMIC_WINDOW.firstRound,
  lastRound = EPISTEMIC_WINDOW.lastRound,
): EpistemicBeliefScoring {
  if (weightPerField < 0) throw new Error("weightPerField must be non-negative");
  const robots = new Set(robotIds);
  const ids = result.scores.map((_score, id) => id).filter((id) => !robots.has(id));
  const byId = new Map<number, AgentAccumulator>(
    ids.map((id) => [
      id,
      { reports: 0, pAccept: 0, pSecond: 0, sellerOpportunities: 0, sellerIntents: 0 },
    ]),
  );

  for (const snap of result.rounds) {
    if (snap.t < firstRound || snap.t > lastRound) {
      continue;
    }
    for (const meeting of snap.meetings) {
      for (const [id, pAccept, pSecond] of [
        [meeting.i, meeting.iPAccept, meeting.iPSecond],
        [meeting.j, meeting.jPAccept, meeting.jPSecond],
      ] as const) {
        const acc = byId.get(id);
        if (!acc || typeof pAccept !== "number" || typeof pSecond !== "number") continue;
        acc.reports += 1;
        acc.pAccept += pAccept;
        acc.pSecond += pSecond;
      }

      const roles = proposalsByRole(meeting);
      if (!roles || !meeting.hardHadChit || !meeting.easyHadCheck) continue;
      const seller = byId.get(roles.easyId);
      if (!seller) continue;
      seller.sellerOpportunities += 1;
      if (roles.easy.giveCheck && roles.easy.requireChit) seller.sellerIntents += 1;
    }
  }

  const averages = new Map<number, { pAccept: number; pSecond: number }>();
  for (const id of ids) {
    const acc = byId.get(id)!;
    if (!acc.reports) continue;
    averages.set(id, {
      pAccept: acc.pAccept / acc.reports,
      pSecond: acc.pSecond / acc.reports,
    });
  }

  const agents: EpistemicBeliefScore[] = [];
  for (const id of ids) {
    const acc = byId.get(id)!;
    const report = averages.get(id);
    if (!report) continue;
    const others = ids.filter((other) => other !== id);
    const sellerOpportunities = others.reduce(
      (sum, other) => sum + byId.get(other)!.sellerOpportunities,
      0,
    );
    const sellerIntents = others.reduce(
      (sum, other) => sum + byId.get(other)!.sellerIntents,
      0,
    );
    const otherReports = others
      .map((other) => averages.get(other)?.pAccept)
      .filter((x): x is number => typeof x === "number");
    if (!sellerOpportunities || !otherReports.length) continue;
    const pAcceptTarget = sellerIntents / sellerOpportunities;
    const pSecondTarget = average(otherReports);
    const pAcceptBonus = quadraticBonus(report.pAccept, pAcceptTarget, weightPerField);
    const pSecondBonus = quadraticBonus(report.pSecond, pSecondTarget, weightPerField);
    agents.push({
      agentId: id,
      reports: acc.reports,
      pAcceptReport: report.pAccept,
      pAcceptTarget,
      pSecondReport: report.pSecond,
      pSecondTarget,
      pAcceptBonus,
      pSecondBonus,
      totalBonus: pAcceptBonus + pSecondBonus,
    });
  }

  return {
    weightPerField,
    agents,
    meanBonus: average(agents.map((agent) => agent.totalBonus)),
  };
}

function average(xs: number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

function summarize(runs: EpistemicRun[]): EpistemicSummary {
  return {
    nSeeds: runs.length,
    sellerIntentRate: average(runs.map((r) => r.llmSeller.sellerIntentPerHe)),
    buyerIntentRate: average(runs.map((r) => r.llmBuyer.buyerIntentPerHe)),
    tradeRate: average(runs.map((r) => r.llmLlm.tradePerHe)),
    pAccept: average(runs.map((r) => r.belief.pAccept)),
    pSecond: average(runs.map((r) => r.belief.pSecond)),
    meanScore: average(runs.map((r) => r.meanScore)),
    totalMeanScore: average(runs.map((r) => r.totalMeanScore)),
  };
}

function difference(
  seed: number,
  publicRun: EpistemicRun,
  privateRun: EpistemicRun,
): EpistemicPairDelta {
  return {
    seed,
    sellerIntentRate:
      publicRun.llmSeller.sellerIntentPerHe - privateRun.llmSeller.sellerIntentPerHe,
    buyerIntentRate:
      publicRun.llmBuyer.buyerIntentPerHe - privateRun.llmBuyer.buyerIntentPerHe,
    tradeRate: publicRun.llmLlm.tradePerHe - privateRun.llmLlm.tradePerHe,
    pAccept: publicRun.belief.pAccept - privateRun.belief.pAccept,
    pSecond: publicRun.belief.pSecond - privateRun.belief.pSecond,
    meanScore: publicRun.meanScore - privateRun.meanScore,
  };
}

export type EpistemicReportConfig = {
  k?: number;
  robotIds?: readonly number[];
  fact?: string;
  notices?: Record<EpistemicKind, string>;
  primaryRounds?: { first: number; last: number };
};

export function buildEpistemicReport(
  runs: EpistemicRun[],
  config: EpistemicReportConfig = {},
): EpistemicReport {
  const k = config.k ?? EPISTEMIC_K;
  const robotIds = config.robotIds ?? EPISTEMIC_ROBOT_IDS;
  const fact = config.fact ?? epistemicFactForK(k);
  const notices = config.notices ?? epistemicNoticesForK(k);
  const primaryRounds = config.primaryRounds ?? {
    first: EPISTEMIC_WINDOW.firstRound,
    last: EPISTEMIC_WINDOW.lastRound,
  };
  const privateRuns = runs.filter((r) => r.kind === "private");
  const publicRuns = runs.filter((r) => r.kind === "public");
  const publicBySeed = new Map(publicRuns.map((r) => [r.seed, r]));
  const pairedDeltas = privateRuns
    .filter((r) => publicBySeed.has(r.seed))
    .map((privateRun) => {
      const publicRun = publicBySeed.get(privateRun.seed)!;
      if (privateRun.scheduleHash !== publicRun.scheduleHash) {
        throw new Error(
          `seed ${privateRun.seed} schedule mismatch: private=${privateRun.scheduleHash} public=${publicRun.scheduleHash}`,
        );
      }
      return difference(privateRun.seed, publicRun, privateRun);
    })
    .sort((a, b) => a.seed - b.seed);
  const byKind: EpistemicReport["byKind"] = {};
  if (privateRuns.length) byKind.private = summarize(privateRuns);
  if (publicRuns.length) byKind.public = summarize(publicRuns);

  let verdict = "INCOMPLETE — run paired E0/E∞ seeds";
  if (pairedDeltas.length > 0 && pairedDeltas.length < 12) {
    verdict = `PILOT — ${pairedDeltas.length} paired seeds; estimate variance before confirmatory inference`;
  } else if (pairedDeltas.length >= 12) {
    const dTrade = average(pairedDeltas.map((d) => d.tradeRate));
    const dSecond = average(pairedDeltas.map((d) => d.pSecond));
    if (dTrade >= 0.15 && dSecond >= 0.15) {
      verdict =
        "PILOT EPISTEMIC SIGNAL — public delivery raises second-order expectation and LLM–LLM trade; use seed variance to power a separate confirmatory run";
    } else if (dTrade >= 0.15 && Math.abs(dSecond) < 0.1) {
      verdict =
        "PILOT ACTION WITHOUT B2 — public delivery raises trade without a matching second-order report";
    } else {
      verdict =
        "NO LARGE PILOT EFFECT — use paired intervals and power an equivalence test before a null claim";
    }
  }

  return {
    model: MODEL,
    k,
    robotIds: [...robotIds],
    fact,
    notices,
    primaryRounds,
    estimand:
      "paired seed-level public-minus-private effect; rates are averaged within seed, never pooled by meeting",
    runs,
    byKind,
    pairedDeltas,
    verdict,
    caveat:
      `The primary window is rounds ${primaryRounds.first}–${primaryRounds.last} with k=${k} committed acceptors. Causal summaries use all exogenous H–E meetings as the denominator; feasible-opportunity-conditional rates are retained as descriptive diagnostics.`,
    generatedAt: new Date().toISOString(),
  };
}

export function validateEpistemicResponse(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON object";
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return "invalid JSON";
  }
  if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
  if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
  if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
  for (const key of ["pAccept", "pSecond"] as const) {
    if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) {
      return `${key} must be a finite number`;
    }
    if (obj[key] < 0 || obj[key] > 1) return `${key} must be in [0,1]`;
  }
  return null;
}
