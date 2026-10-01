import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import type { RunResult } from "./types.ts";

export const BELIEF_SENSITIVITY_SEEDS = [
  11003, 11027, 11047, 11057, 11059, 11069, 11071, 11083,
] as const;
export const BELIEF_SENSITIVITY_ROBOT_IDS = [0, 1, 2, 3] as const;
export const BELIEF_SENSITIVITY_WINDOW = { first: 5, last: 21 } as const;
export const BELIEF_WEIGHT_PER_FIELD_REPORT = 0.25;

export type SensitivityRecord = {
  t: number;
  agentId: number;
  pAccept: number;
  pSecond: number;
};

export type PerReportBeliefScore = SensitivityRecord & {
  pAcceptTarget: number;
  pSecondTarget: number;
  pAcceptBonus: number;
  pSecondBonus: number;
  totalBonus: number;
  reportedLoss: number;
  midpointLoss: number;
};

export type BeliefSensitivityRun = {
  seed: number;
  calls: number;
  beliefCalls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  robotIds: number[];
  records: SensitivityRecord[];
  scores: PerReportBeliefScore[];
  mechanicalPAcceptReports: Record<string, number>;
  llmPAcceptTargets: Record<string, number>;
  llmPSecondTargets: Record<string, number>;
  economicScores: number[];
  beliefBonusByAgent: Record<string, number>;
  settledScores: number[];
  nonMidpointShare: number;
  reportedLoss: number;
  midpointLoss: number;
  lossImprovement: number;
  meanPSecondTargetDisplacement: number;
  result: RunResult;
};

export type BeliefSensitivityReport = {
  study: "VBE-E-BELIEF-INSTRUMENT-SENSITIVITY";
  status: "PROJECT-INTERNAL INSTRUMENT GATE — NOT A BELIEF EFFECT STUDY";
  model: string;
  seeds: number[];
  runs: BeliefSensitivityRun[];
  completeSeeds: number;
  totalCalls: number;
  summary: null | {
    reports: number;
    nonMidpointShare: number;
    meanPAccept: number;
    meanPSecond: number;
    meanPAcceptTarget: number;
    meanPSecondTarget: number;
    meanPSecondTargetDisplacement: number;
    meanMaximumBonusPerAgent: number;
    meanRealizedBonusPerAgent: number;
    meanLossImprovement: number;
    positiveSeeds: number;
    lossImprovementEffect: PairedEffect;
  };
  integrity: {
    failures: boolean;
    allLlmAgentsReported: boolean;
    exactFieldCounts: boolean;
    scoringComplete: boolean;
    settlementComplete: boolean;
    fixedPointDisplaced: boolean;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    nonMidpoint: boolean;
    accuracy: boolean;
    seedDirection: boolean;
  };
  verdict:
    | "INCOMPLETE"
    | "INVALID"
    | "REPAIRED BELIEF INSTRUMENT IS SENSITIVE"
    | "MIDPOINT PERSISTS UNDER REPAIRED INSTRUMENT";
  caveat: string;
  generatedAt: string;
};

function average(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function sellerStats(result: RunResult, first: number, last: number): Map<number, { n: number; intents: number }> {
  const out = new Map(result.scores.map((_score, id) => [id, { n: 0, intents: 0 }]));
  for (const round of result.rounds) {
    if (round.t < first || round.t > last) continue;
    for (const meeting of round.meetings) {
      if (!meeting.hardHadChit || !meeting.easyHadCheck) continue;
      const easyId = meeting.iType === "E" && meeting.jType === "H"
        ? meeting.i
        : meeting.jType === "E" && meeting.iType === "H"
          ? meeting.j
          : null;
      if (easyId === null) continue;
      const proposal = easyId === meeting.i ? meeting.pi : meeting.pj;
      const stats = out.get(easyId)!;
      stats.n += 1;
      if (proposal.giveCheck && proposal.requireChit) stats.intents += 1;
    }
  }
  return out;
}

function leaveOneOutTarget(stats: Map<number, { n: number; intents: number }>, id: number): number {
  let n = 0;
  let intents = 0;
  for (const [peerId, peer] of stats) {
    if (peerId === id) continue;
    n += peer.n;
    intents += peer.intents;
  }
  if (!n) throw new Error(`no peer seller opportunities for agent ${id}`);
  return intents / n;
}

export function scoreRepairedBeliefs(
  result: RunResult,
  records: SensitivityRecord[],
): Omit<BeliefSensitivityRun,
  "seed" | "calls" | "beliefCalls" | "apiFails" | "parseFails" | "scheduleHash" | "robotIds" | "records" | "result"
> {
  const robotSet = new Set<number>(BELIEF_SENSITIVITY_ROBOT_IDS);
  const llmIds = result.scores.map((_score, id) => id).filter((id) => !robotSet.has(id));
  const stats = sellerStats(result, BELIEF_SENSITIVITY_WINDOW.first, BELIEF_SENSITIVITY_WINDOW.last);
  const pAcceptTargets = new Map(llmIds.map((id) => [id, leaveOneOutTarget(stats, id)]));
  const mechanicalReports = new Map(
    BELIEF_SENSITIVITY_ROBOT_IDS.map((id) => [id, leaveOneOutTarget(stats, id)]),
  );
  const llmMeanReports = new Map<number, number>();
  for (const id of llmIds) {
    const own = records.filter((record) => record.agentId === id);
    if (own.length) llmMeanReports.set(id, average(own.map((record) => record.pAccept)));
  }
  const pSecondTargets = new Map<number, number>();
  for (const id of llmIds) {
    const peerReports = result.scores
      .map((_score, peerId) => peerId)
      .filter((peerId) => peerId !== id)
      .map((peerId) => mechanicalReports.get(peerId) ?? llmMeanReports.get(peerId))
      .filter((value): value is number => typeof value === "number");
    if (peerReports.length !== 7) throw new Error(`missing peer reports for agent ${id}`);
    pSecondTargets.set(id, average(peerReports));
  }
  const scores = records.map((record): PerReportBeliefScore => {
    const pAcceptTarget = pAcceptTargets.get(record.agentId);
    const pSecondTarget = pSecondTargets.get(record.agentId);
    if (pAcceptTarget === undefined || pSecondTarget === undefined) {
      throw new Error(`unexpected scored agent ${record.agentId}`);
    }
    const pAcceptError = (record.pAccept - pAcceptTarget) ** 2;
    const pSecondError = (record.pSecond - pSecondTarget) ** 2;
    const midpointLoss = (0.5 - pAcceptTarget) ** 2 + (0.5 - pSecondTarget) ** 2;
    return {
      ...record,
      pAcceptTarget,
      pSecondTarget,
      pAcceptBonus: BELIEF_WEIGHT_PER_FIELD_REPORT * (1 - pAcceptError),
      pSecondBonus: BELIEF_WEIGHT_PER_FIELD_REPORT * (1 - pSecondError),
      totalBonus: BELIEF_WEIGHT_PER_FIELD_REPORT * (2 - pAcceptError - pSecondError),
      reportedLoss: pAcceptError + pSecondError,
      midpointLoss,
    };
  });
  const beliefBonusByAgent = Object.fromEntries(
    llmIds.map((id) => [
      String(id),
      scores.filter((score) => score.agentId === id).reduce((sum, score) => sum + score.totalBonus, 0),
    ]),
  );
  const settledScores = result.scores.map((score, id) => score + (beliefBonusByAgent[String(id)] ?? 0));
  return {
    scores,
    mechanicalPAcceptReports: Object.fromEntries([...mechanicalReports].map(([id, value]) => [String(id), value])),
    llmPAcceptTargets: Object.fromEntries([...pAcceptTargets].map(([id, value]) => [String(id), value])),
    llmPSecondTargets: Object.fromEntries([...pSecondTargets].map(([id, value]) => [String(id), value])),
    economicScores: [...result.scores],
    beliefBonusByAgent,
    settledScores,
    nonMidpointShare: scores.filter(
      (score) => Math.abs(score.pAccept - 0.5) > 1e-12 || Math.abs(score.pSecond - 0.5) > 1e-12,
    ).length / scores.length,
    reportedLoss: average(scores.map((score) => score.reportedLoss)),
    midpointLoss: average(scores.map((score) => score.midpointLoss)),
    lossImprovement: average(scores.map((score) => score.midpointLoss - score.reportedLoss)),
    meanPSecondTargetDisplacement: average(
      [...pSecondTargets.values()].map((target) => Math.abs(target - 0.5)),
    ),
  };
}

export function buildBeliefSensitivityReport(
  rawRuns: BeliefSensitivityRun[],
  model: string,
): BeliefSensitivityReport {
  const runs = [...rawRuns].sort((left, right) => left.seed - right.seed);
  const seen = new Set<number>();
  for (const run of runs) {
    if (!BELIEF_SENSITIVITY_SEEDS.includes(run.seed as (typeof BELIEF_SENSITIVITY_SEEDS)[number])) {
      throw new Error(`unexpected sensitivity seed ${run.seed}`);
    }
    if (seen.has(run.seed)) throw new Error(`duplicate sensitivity seed ${run.seed}`);
    seen.add(run.seed);
  }
  const llmIds = [4, 5, 6, 7];
  const integrity = {
    failures: runs.every((run) => run.apiFails === 0 && run.parseFails === 0),
    allLlmAgentsReported: runs.every((run) => llmIds.every(
      (id) => run.records.some((record) => record.agentId === id),
    )),
    exactFieldCounts: runs.every((run) => run.records.length === run.beliefCalls),
    scoringComplete: runs.every((run) => run.scores.length === run.records.length),
    settlementComplete: runs.every((run) => llmIds.every(
      (id) => typeof run.beliefBonusByAgent[String(id)] === "number",
    )),
    fixedPointDisplaced: runs.every((run) => run.meanPSecondTargetDisplacement >= 0.10),
  };
  const complete = runs.length === BELIEF_SENSITIVITY_SEEDS.length
    && BELIEF_SENSITIVITY_SEEDS.every((seed) => seen.has(seed));
  const allScores = runs.flatMap((run) => run.scores);
  const effect = runs.length ? pairedEffect(runs.map((run) => run.lossImprovement)) : null;
  const agentMaximumBonuses = runs.flatMap((run) => [4, 5, 6, 7].map(
    (id) => run.scores.filter((score) => score.agentId === id).length * 0.5,
  ));
  const agentBonuses = runs.flatMap((run) => [4, 5, 6, 7].map(
    (id) => run.beliefBonusByAgent[String(id)] ?? 0,
  ));
  const summary = allScores.length && effect ? {
    reports: allScores.length,
    nonMidpointShare: allScores.filter(
      (score) => Math.abs(score.pAccept - 0.5) > 1e-12 || Math.abs(score.pSecond - 0.5) > 1e-12,
    ).length / allScores.length,
    meanPAccept: average(allScores.map((score) => score.pAccept)),
    meanPSecond: average(allScores.map((score) => score.pSecond)),
    meanPAcceptTarget: average(allScores.map((score) => score.pAcceptTarget)),
    meanPSecondTarget: average(allScores.map((score) => score.pSecondTarget)),
    meanPSecondTargetDisplacement: average(runs.map((run) => run.meanPSecondTargetDisplacement)),
    meanMaximumBonusPerAgent: average(agentMaximumBonuses),
    meanRealizedBonusPerAgent: average(agentBonuses),
    meanLossImprovement: average(runs.map((run) => run.lossImprovement)),
    positiveSeeds: runs.filter((run) => run.lossImprovement > 0).length,
    lossImprovementEffect: effect,
  } : null;
  const integrityPass = Object.values(integrity).every(Boolean);
  const gates = {
    complete,
    integrity: integrityPass,
    nonMidpoint: Boolean(summary && summary.nonMidpointShare >= 0.5),
    accuracy: Boolean(summary && summary.meanLossImprovement >= 0.05),
    seedDirection: Boolean(summary && summary.positiveSeeds >= 7),
  };
  let verdict: BeliefSensitivityReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!integrityPass) verdict = "INVALID";
    else if (gates.nonMidpoint && gates.accuracy && gates.seedDirection) {
      verdict = "REPAIRED BELIEF INSTRUMENT IS SENSITIVE";
    } else verdict = "MIDPOINT PERSISTS UNDER REPAIRED INSTRUMENT";
  }
  return {
    study: "VBE-E-BELIEF-INSTRUMENT-SENSITIVITY",
    status: "PROJECT-INTERNAL INSTRUMENT GATE — NOT A BELIEF EFFECT STUDY",
    model,
    seeds: [...BELIEF_SENSITIVITY_SEEDS],
    runs,
    completeSeeds: runs.length,
    totalCalls: runs.reduce((sum, run) => sum + run.calls, 0),
    summary,
    integrity,
    gates,
    verdict,
    caveat: "This one-condition diagnostic tests whether the repaired reporting interface responds under a mixed robot/LLM workload. It does not estimate an information treatment effect, belief mediation, common belief, or cross-model validity.",
    generatedAt: new Date().toISOString(),
  };
}
