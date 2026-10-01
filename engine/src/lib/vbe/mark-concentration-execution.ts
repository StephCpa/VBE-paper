import { runPopulationAsyncPaired } from "./env.ts";
import { structuralScheduleHash } from "./epistemic.ts";
import {
  type MarkAllocation,
  type MarkConcentrationRun,
  sha256MarkConcentration,
} from "./mark-concentration.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { kw } from "./robots.ts";
import type { AgentState, Meeting, RoundSnapshot, RunResult } from "./types.ts";

function isQualifyingTrade(meeting: Meeting): boolean {
  return meeting.kind === "chit-for-check"
    && ((meeting.iType === "E" && meeting.jType === "H" && meeting.seller === meeting.i)
      || (meeting.iType === "H" && meeting.jType === "E" && meeting.seller === meeting.j));
}

function isFuture(round: RoundSnapshot): boolean {
  return round.t >= 5 && round.t <= 23;
}

function heMeeting(meeting: Meeting): boolean {
  return (meeting.iType === "H" && meeting.jType === "E")
    || (meeting.iType === "E" && meeting.jType === "H");
}

function preHistoryHash(result: RunResult): string {
  return sha256MarkConcentration(result.rounds.filter((round) => round.t <= 4));
}

export async function runMarkConcentrationArm(
  seed: number,
  allocation: MarkAllocation,
): Promise<MarkConcentrationRun> {
  let supportIds: number[] = [];
  let interventionChits: number[] = [];
  const beforeMeetings = (agents: AgentState[], t: number): void => {
    if (t === 1) {
      supportIds = agents.filter((agent) => agent.chits === 1).map((agent) => agent.id).sort((a, b) => a - b);
      if (supportIds.length !== 4) throw new Error(`initial support mismatch seed=${seed}`);
    }
    if (t !== 5) return;
    for (const agent of agents) agent.chits = 0;
    allocation.allocation.forEach((amount, index) => {
      agents[supportIds[index]!]!.chits = amount;
    });
    interventionChits = agents.map((agent) => agent.chits);
  };
  const result = await runPopulationAsyncPaired(
    seed,
    (me, partner, t, T) => kw(me, partner, t, T),
    DEFAULT_PARAMS,
    true,
    undefined,
    beforeMeetings,
  );
  const futureRounds = result.rounds.filter(isFuture);
  const meetings = futureRounds.flatMap((round) => round.meetings);
  const futureTrades = meetings.filter(isQualifyingTrade).length;
  const futureEligibleOpportunities = meetings.filter(
    (meeting) => heMeeting(meeting) && meeting.hardHadChit && meeting.easyHadCheck,
  ).length;
  const futureHeMeetings = meetings.filter(heMeeting).length;
  const markSupplyInvariant = interventionChits.reduce((sum, value) => sum + value, 0) === DEFAULT_PARAMS.M
    && result.rounds.every((round) => round.chits.reduce((sum, value) => sum + value, 0) === DEFAULT_PARAMS.M);
  return {
    seed,
    allocation,
    supportIds,
    interventionChits,
    scheduleHash: structuralScheduleHash(result),
    preHistoryHash: preHistoryHash(result),
    futureHeMeetings,
    futureEligibleOpportunities,
    futureTrades,
    velocityPerMark: futureTrades / DEFAULT_PARAMS.M,
    meanHolderCount: futureRounds.reduce(
      (sum, round) => sum + round.chits.filter((amount) => amount > 0).length,
      0,
    ) / futureRounds.length,
    meanScore: result.meanScore,
    markSupplyInvariant,
    mechanicalFidelity: futureTrades === futureEligibleOpportunities,
  };
}
