import { existsSync, readFileSync } from "node:fs";
import {
  SEMANTIC_BOUNDARY_ARMS,
  buildSemanticBoundaryReport,
  type SemanticBoundaryArm,
  type SemanticBoundaryReport,
  type SemanticBoundaryRun,
} from "./welfare-semantic-boundary.ts";
import type { AgentType, Meeting } from "./types.ts";

const DEFAULT_PATH = "src/data/welfare-semantic-boundary.json";
const ROUND_BIN_SIZE = 4;

export const SCOPE_CELLS = [
  "E>E:gift",
  "E>H:gift",
  "H>E:gift",
  "H>H:gift",
  "E-E:swap",
  "E-H:swap",
  "H-H:swap",
  "E>E:sale",
  "E>H:sale",
  "H>E:sale",
  "H>H:sale",
] as const;
export type ScopeCell = (typeof SCOPE_CELLS)[number];

type CountRate = { events: number; opportunities: number; rate: number };
type DynamicsBin = CountRate & { rounds: string };
type ArmDistribution = {
  meanMinimum: number;
  meanMaximum: number;
  meanWithinRunSd: number;
  meanWithinRunRange: number;
};
type GiftNeutralDistribution = {
  accountCount: number;
  positive: number;
  zero: number;
  negative: number;
  meanAccountDelta: number;
  meanMinimumDelta: number;
  meanWithinRunSdDelta: number;
  hardExposurePearson: number | null;
  byHardExposure: Array<{ hardRounds: number; accounts: number; meanDelta: number }>;
};

export type PaperOneScopeExploratoryReport = {
  status: "FROZEN-DATA EXPLORATORY — NOT PROSPECTIVELY TESTED";
  sourceStudy: string;
  model: string;
  runCount: number;
  sourceIntegrity: true;
  sourceProviderBracketValid: true;
  scopeMatrix: Record<SemanticBoundaryArm, Record<ScopeCell, CountRate>>;
  hhSwapDynamics: Record<SemanticBoundaryArm, DynamicsBin[]>;
  accountDistribution: Record<SemanticBoundaryArm, ArmDistribution>;
  giftMinusNeutralDistribution: GiftNeutralDistribution;
};

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationSd(values: number[]): number {
  const center = mean(values);
  return Math.sqrt(mean(values.map(value => (value - center) ** 2)));
}

function pearson(xs: number[], ys: number[]): number | null {
  const xMean = mean(xs);
  const yMean = mean(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - xMean) * (ys[index]! - yMean), 0);
  const xScale = Math.sqrt(xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0));
  const yScale = Math.sqrt(ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0));
  return xScale && yScale ? numerator / (xScale * yScale) : null;
}

function pairTypes(meeting: Meeting): "EE" | "EH" | "HH" {
  return [meeting.iType, meeting.jType].sort().join("") as "EE" | "EH" | "HH";
}

function directedTypes(meeting: Meeting): [AgentType, AgentType] {
  if (meeting.seller === null || meeting.buyer === null) {
    throw new Error(`directed event without seller/buyer at round ${meeting.t}`);
  }
  const sellerType = meeting.seller === meeting.i ? meeting.iType : meeting.jType;
  const buyerType = meeting.buyer === meeting.i ? meeting.iType : meeting.jType;
  return [sellerType, buyerType];
}

function opportunityPair(cell: ScopeCell): "EE" | "EH" | "HH" {
  const roles = cell.slice(0, 3);
  if (roles === "E>E" || roles === "E-E") return "EE";
  if (roles === "H>H" || roles === "H-H") return "HH";
  return "EH";
}

function eventCell(meeting: Meeting): ScopeCell | null {
  if (meeting.kind === "none") return null;
  if (meeting.kind === "swap") return `${meeting.iType === meeting.jType ? `${meeting.iType}-${meeting.jType}` : "E-H"}:swap` as ScopeCell;
  const [sellerType, buyerType] = directedTypes(meeting);
  return `${sellerType}>${buyerType}:${meeting.kind === "gift" ? "gift" : "sale"}` as ScopeCell;
}

function countRate(events: number, opportunities: number): CountRate {
  return { events, opportunities, rate: opportunities ? events / opportunities : 0 };
}

function buildScopeMatrix(runs: SemanticBoundaryRun[]): PaperOneScopeExploratoryReport["scopeMatrix"] {
  const output = {} as PaperOneScopeExploratoryReport["scopeMatrix"];
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    const meetings = runs.filter(run => run.arm === arm).flatMap(run => run.result.rounds.flatMap(round => round.meetings));
    const opportunities = { EE: 0, EH: 0, HH: 0 };
    const events = Object.fromEntries(SCOPE_CELLS.map(cell => [cell, 0])) as Record<ScopeCell, number>;
    for (const meeting of meetings) {
      opportunities[pairTypes(meeting)] += 1;
      const cell = eventCell(meeting);
      if (cell) events[cell] += 1;
    }
    output[arm] = Object.fromEntries(SCOPE_CELLS.map(cell => [cell, countRate(events[cell], opportunities[opportunityPair(cell)])])) as Record<ScopeCell, CountRate>;
  }
  return output;
}

function buildDynamics(runs: SemanticBoundaryRun[]): PaperOneScopeExploratoryReport["hhSwapDynamics"] {
  const output = {} as PaperOneScopeExploratoryReport["hhSwapDynamics"];
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    const armRuns = runs.filter(run => run.arm === arm);
    const roundCount = armRuns[0]?.result.rounds.length ?? 0;
    output[arm] = [];
    for (let start = 1; start <= roundCount; start += ROUND_BIN_SIZE) {
      const end = Math.min(roundCount, start + ROUND_BIN_SIZE - 1);
      const meetings = armRuns.flatMap(run => run.result.rounds.filter(round => round.t >= start && round.t <= end).flatMap(round => round.meetings));
      const hh = meetings.filter(meeting => pairTypes(meeting) === "HH");
      const swaps = hh.filter(meeting => meeting.kind === "swap").length;
      output[arm].push({ rounds: `${start}-${end}`, ...countRate(swaps, hh.length) });
    }
  }
  return output;
}

function runDistribution(run: SemanticBoundaryRun): ArmDistribution {
  const scores = run.result.scores;
  return {
    meanMinimum: Math.min(...scores),
    meanMaximum: Math.max(...scores),
    meanWithinRunSd: populationSd(scores),
    meanWithinRunRange: Math.max(...scores) - Math.min(...scores),
  };
}

function buildAccountDistribution(runs: SemanticBoundaryRun[]): PaperOneScopeExploratoryReport["accountDistribution"] {
  const output = {} as PaperOneScopeExploratoryReport["accountDistribution"];
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    const rows = runs.filter(run => run.arm === arm).map(runDistribution);
    output[arm] = {
      meanMinimum: mean(rows.map(row => row.meanMinimum)),
      meanMaximum: mean(rows.map(row => row.meanMaximum)),
      meanWithinRunSd: mean(rows.map(row => row.meanWithinRunSd)),
      meanWithinRunRange: mean(rows.map(row => row.meanWithinRunRange)),
    };
  }
  return output;
}

function buildGiftNeutralDistribution(runs: SemanticBoundaryRun[]): GiftNeutralDistribution {
  const accountDeltas: number[] = [];
  const hardExposures: number[] = [];
  const minimumDeltas: number[] = [];
  const sdDeltas: number[] = [];
  for (const seed of [...new Set(runs.map(run => run.seed))].sort((a, b) => a - b)) {
    const gift = runs.find(run => run.seed === seed && run.arm === "gift-exact");
    const neutral = runs.find(run => run.seed === seed && run.arm === "neutral");
    if (!gift || !neutral) throw new Error(`missing gift-neutral pair for seed ${seed}`);
    if (gift.result.scores.length !== neutral.result.scores.length) throw new Error(`account mismatch for seed ${seed}`);
    const giftStats = runDistribution(gift);
    const neutralStats = runDistribution(neutral);
    minimumDeltas.push(giftStats.meanMinimum - neutralStats.meanMinimum);
    sdDeltas.push(giftStats.meanWithinRunSd - neutralStats.meanWithinRunSd);
    for (let id = 0; id < gift.result.scores.length; id++) {
      accountDeltas.push(gift.result.scores[id]! - neutral.result.scores[id]!);
      const giftExposure = gift.result.rounds.reduce((sum, round) => sum + Number(round.types[id] === "H"), 0);
      const neutralExposure = neutral.result.rounds.reduce((sum, round) => sum + Number(round.types[id] === "H"), 0);
      if (giftExposure !== neutralExposure) throw new Error(`role-schedule mismatch for seed ${seed}, account ${id}`);
      hardExposures.push(giftExposure);
    }
  }
  const exposureLevels = [...new Set(hardExposures)].sort((a, b) => a - b);
  return {
    accountCount: accountDeltas.length,
    positive: accountDeltas.filter(value => value > 0).length,
    zero: accountDeltas.filter(value => value === 0).length,
    negative: accountDeltas.filter(value => value < 0).length,
    meanAccountDelta: mean(accountDeltas),
    meanMinimumDelta: mean(minimumDeltas),
    meanWithinRunSdDelta: mean(sdDeltas),
    hardExposurePearson: pearson(hardExposures, accountDeltas),
    byHardExposure: exposureLevels.map(hardRounds => {
      const deltas = accountDeltas.filter((_, index) => hardExposures[index] === hardRounds);
      return { hardRounds, accounts: deltas.length, meanDelta: mean(deltas) };
    }),
  };
}

export function buildPaperOneScopeExploratoryReport(stored: SemanticBoundaryReport): PaperOneScopeExploratoryReport {
  const rebuilt = buildSemanticBoundaryReport(stored.runs, stored.model, stored.providerBracket.valid);
  if (!rebuilt.gates.complete || !rebuilt.gates.integrity) throw new Error("source study is incomplete or fails integrity");
  if (rebuilt.providerBracket.valid !== true) throw new Error("source provider bracket is not valid");
  return {
    status: "FROZEN-DATA EXPLORATORY — NOT PROSPECTIVELY TESTED",
    sourceStudy: rebuilt.study,
    model: rebuilt.model,
    runCount: rebuilt.runs.length,
    sourceIntegrity: true,
    sourceProviderBracketValid: true,
    scopeMatrix: buildScopeMatrix(rebuilt.runs),
    hhSwapDynamics: buildDynamics(rebuilt.runs),
    accountDistribution: buildAccountDistribution(rebuilt.runs),
    giftMinusNeutralDistribution: buildGiftNeutralDistribution(rebuilt.runs),
  };
}

function fixed(value: number | null, digits = 3): string {
  return value === null ? "NA" : value.toFixed(digits);
}

function printMarkdown(report: PaperOneScopeExploratoryReport): void {
  console.log("# Paper 1 frozen-data exploratory scope audit\n");
  console.log(`Status: **${report.status}**\n`);
  console.log("## Full role-relation scope matrix (pooled events/opportunities; meeting-normalized rate)\n");
  console.log(`| Arm | ${SCOPE_CELLS.join(" | ")} |`);
  console.log(`|---|${SCOPE_CELLS.map(() => "---:").join("|")}|`);
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    console.log(`| ${arm} | ${SCOPE_CELLS.map(cell => { const x = report.scopeMatrix[arm][cell]; return `${x.events}/${x.opportunities} (${fixed(x.rate)})`; }).join(" | ")} |`);
  }
  console.log("\n## H-H swap adoption dynamics (four-round pooled bins)\n");
  console.log(`| Arm | ${report.hhSwapDynamics.neutral.map(bin => bin.rounds).join(" | ")} |`);
  console.log(`|---|${report.hhSwapDynamics.neutral.map(() => "---:").join("|")}|`);
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    console.log(`| ${arm} | ${report.hhSwapDynamics[arm].map(bin => `${bin.events}/${bin.opportunities} (${fixed(bin.rate)})`).join(" | ")} |`);
  }
  console.log("\n## Account-level distribution\n");
  console.log("| Arm | Mean run minimum | Mean run maximum | Mean within-run SD | Mean run range |");
  console.log("|---|---:|---:|---:|---:|");
  for (const arm of SEMANTIC_BOUNDARY_ARMS) {
    const x = report.accountDistribution[arm];
    console.log(`| ${arm} | ${fixed(x.meanMinimum, 4)} | ${fixed(x.meanMaximum, 4)} | ${fixed(x.meanWithinRunSd, 4)} | ${fixed(x.meanWithinRunRange, 4)} |`);
  }
  const paired = report.giftMinusNeutralDistribution;
  console.log(`\nGift − neutral account trajectories: ${paired.positive} positive, ${paired.zero} zero, ${paired.negative} negative of ${paired.accountCount}; mean account delta ${fixed(paired.meanAccountDelta, 4)}; mean seed-level minimum delta ${fixed(paired.meanMinimumDelta, 4)}; mean within-run SD delta ${fixed(paired.meanWithinRunSdDelta, 4)}; Pearson correlation with Hard-role rounds ${fixed(paired.hardExposurePearson, 4)}.`);
  console.log("\n| Hard-role rounds | Accounts | Mean gift − neutral score delta |");
  console.log("|---:|---:|---:|");
  for (const row of paired.byHardExposure) console.log(`| ${row.hardRounds} | ${row.accounts} | ${fixed(row.meanDelta, 4)} |`);
}

if (import.meta.main) {
  const path = process.argv[2] ?? DEFAULT_PATH;
  if (!existsSync(path)) throw new Error(`missing result file: ${path}`);
  const stored = JSON.parse(readFileSync(path, "utf8")) as SemanticBoundaryReport;
  const report = buildPaperOneScopeExploratoryReport(stored);
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else printMarkdown(report);
}
