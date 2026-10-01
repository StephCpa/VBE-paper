import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { scoreEpistemicBeliefs } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

type AuditRun = {
  mode?: string;
  robotIds: number[];
  primaryRounds: { first: number; last: number };
  result: RunResult;
};

type AuditSource = {
  label: string;
  path: string;
  include: (run: AuditRun) => boolean;
};

type AuditRow = {
  reports: number;
  pAcceptReport: number;
  pAcceptTarget: number;
  pSecondReport: number;
  pSecondTarget: number;
  pAcceptBonus: number;
  pSecondBonus: number;
  totalBonus: number;
  economicScore: number;
};

type AuditSummary = {
  runs: number;
  scoredAgentRuns: number;
  reports: number;
  fieldReports: number;
  settlements: number;
  reportsPerScoredAgentRun: number;
  fieldReportsPerSettlement: number;
  meanEconomicScore: number;
  totalEconomicScore: number;
  maximumBonus: number;
  realizedBonus: number;
  forgoneBonus: number;
  forgonePAcceptBonus: number;
  forgonePSecondBonus: number;
  retainedBonusShare: number;
  maximumBonusShareOfMeanEconomicScore: number;
  forgoneBonusShareOfEconomicScore: number;
  means: {
    pAcceptReport: number;
    pAcceptTarget: number;
    pSecondReport: number;
    pSecondTarget: number;
  };
  midpointShares: {
    pAcceptReport: number;
    pSecondReport: number;
    pSecondTarget: number;
  };
};

const SOURCES: AuditSource[] = [
  { label: "E-k1", path: "src/data/epistemic.json", include: () => true },
  { label: "E-k2", path: "src/data/epistemic-k2.json", include: () => true },
  {
    label: "E-D belief-rewarded",
    path: "src/data/epistemic-disassembly-pilot.json",
    include: (run) => run.mode === "belief-rewarded",
  },
  {
    label: "E-RW belief-rewarded",
    path: "src/data/epistemic-reward-confirmatory.json",
    include: (run) => run.mode === "belief-rewarded",
  },
];

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function summarize(rows: AuditRow[], runs: number): AuditSummary {
  const sum = (get: (row: AuditRow) => number): number => rows.reduce((total, row) => total + get(row), 0);
  const reports = sum((row) => row.reports);
  const fieldReports = 2 * reports;
  const settlements = 2 * rows.length;
  const maximumBonus = 0.5 * rows.length;
  const realizedBonus = sum((row) => row.totalBonus);
  const forgonePAcceptBonus = sum((row) => 0.25 - row.pAcceptBonus);
  const forgonePSecondBonus = sum((row) => 0.25 - row.pSecondBonus);
  const forgoneBonus = maximumBonus - realizedBonus;
  const totalEconomicScore = sum((row) => row.economicScore);
  const meanEconomicScore = average(rows.map((row) => row.economicScore));
  const midpointShare = (get: (row: AuditRow) => number): number => (
    rows.filter((row) => Math.abs(get(row) - 0.5) < 1e-12).length / rows.length
  );
  return {
    runs,
    scoredAgentRuns: rows.length,
    reports,
    fieldReports,
    settlements,
    reportsPerScoredAgentRun: reports / rows.length,
    fieldReportsPerSettlement: fieldReports / settlements,
    meanEconomicScore,
    totalEconomicScore,
    maximumBonus,
    realizedBonus,
    forgoneBonus,
    forgonePAcceptBonus,
    forgonePSecondBonus,
    retainedBonusShare: realizedBonus / maximumBonus,
    maximumBonusShareOfMeanEconomicScore: 0.5 / meanEconomicScore,
    forgoneBonusShareOfEconomicScore: forgoneBonus / totalEconomicScore,
    means: {
      pAcceptReport: average(rows.map((row) => row.pAcceptReport)),
      pAcceptTarget: average(rows.map((row) => row.pAcceptTarget)),
      pSecondReport: average(rows.map((row) => row.pSecondReport)),
      pSecondTarget: average(rows.map((row) => row.pSecondTarget)),
    },
    midpointShares: {
      pAcceptReport: midpointShare((row) => row.pAcceptReport),
      pSecondReport: midpointShare((row) => row.pSecondReport),
      pSecondTarget: midpointShare((row) => row.pSecondTarget),
    },
  };
}

function readSource(source: AuditSource): { rows: AuditRow[]; runs: number; sha256: string } {
  const text = readFileSync(source.path, "utf8");
  const report = JSON.parse(text) as { runs: AuditRun[] };
  const included = report.runs.filter(source.include);
  const rows: AuditRow[] = [];
  for (const run of included) {
    const scoring = scoreEpistemicBeliefs(
      run.result,
      run.robotIds,
      0.25,
      run.primaryRounds.first,
      run.primaryRounds.last,
    );
    for (const agent of scoring.agents) {
      const economicScore = run.result.scores[agent.agentId];
      if (typeof economicScore !== "number") throw new Error(`missing economic score for agent ${agent.agentId}`);
      rows.push({ ...agent, economicScore });
    }
  }
  return { rows, runs: included.length, sha256: sha256(text) };
}

export function buildBeliefRewardAudit() {
  const allRows: AuditRow[] = [];
  let totalRuns = 0;
  const cohorts: Record<string, AuditSummary> = {};
  const sourceSha256: Record<string, string> = {};
  for (const source of SOURCES) {
    const item = readSource(source);
    cohorts[source.label] = summarize(item.rows, item.runs);
    sourceSha256[source.path] = item.sha256;
    allRows.push(...item.rows);
    totalRuns += item.runs;
  }
  return {
    audit: "VBE-E-BELIEF-REWARD-AUDIT",
    version: "1.0",
    status: "POST-HOC MEASUREMENT AUDIT",
    scoringRule: {
      settlementUnit: "agent-run mean",
      fields: ["pAccept", "pSecond"],
      maximumPerField: 0.25,
      maximumPerScoredAgentRun: 0.5,
      pSecondTarget: "mean pAccept report of the other scored non-fixed agents",
    },
    cohorts,
    total: summarize(allRows, totalRuns),
    interpretation: {
      measurement: "Multiple within-run reports are averaged before two field-level settlements, eliminating within-run variation from the scoring objective.",
      fixedPoint: "If all scored agents report pAccept=pSecond=0.5, every pSecond report exactly matches its endogenous peer-report target.",
      stake: "The belief bonus is too small to constitute a material economic incentive relative to the task score.",
      claimBoundary: "The observed belief null cannot distinguish genuine uncertainty, midpoint anchoring, strategic reporting, or failure to represent higher-order belief.",
      rewardTransition: "The rewarded/unrewarded transition is best interpreted as a low-stakes framing manipulation, not evidence of economic reward optimization.",
    },
    sourceSha256,
    generatedAt: new Date().toISOString(),
  };
}

const audit = buildBeliefRewardAudit();
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const text = JSON.stringify(audit, null, 2);
writeFileSync("src/data/epistemic-belief-reward-audit.json", text);
writeFileSync("public/data/epistemic-belief-reward-audit.json", text);

console.log(`scored agent-runs ${audit.total.scoredAgentRuns}`);
console.log(`reports/agent-run ${audit.total.reportsPerScoredAgentRun.toFixed(4)}`);
console.log(`forgone bonus ${audit.total.forgoneBonus.toFixed(6)}/${audit.total.maximumBonus.toFixed(1)}`);
console.log(`forgone/economic score ${(100 * audit.total.forgoneBonusShareOfEconomicScore).toFixed(4)}%`);
