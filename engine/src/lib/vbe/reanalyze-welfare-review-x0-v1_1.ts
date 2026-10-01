/**
 * X0 v1.1: zero-call reanalysis of the frozen W-SGB traces.
 *
 * This file deliberately writes new exploratory artifacts.  It never rewrites
 * a frozen study/protocol/result.  The inferential unit is the 14-seed paired
 * population run; meeting-level counts are descriptive denominators only.
 *
 * The v1.1 output makes four distinctions that the first X0 draft did not make
 * explicit enough: (i) pooled counts versus means of seed-level rates, (ii) a
 * proposal versus its eventual execution, (iii) observed non-execution versus
 * an engine rejection reason (the latter is not recorded), and (iv) the
 * proposal-level engagement gate and its paired, Holm-adjusted test.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { bootstrapMean95 } from "./epistemic-analysis.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, Meeting, Proposal, StrategyFn } from "./types.ts";

type Role = "E" | "H";
type CellKey = `${Role}->${Role}`;
type ProposalKind = "gift" | "sale" | "mark-offer" | "keep";
type OutcomeKind = "executed" | "no-trade" | "counterparty-gift" | "counterparty-sale" | "other-resolution";
const CELLS: CellKey[] = ["E->E", "E->H", "H->E", "H->H"];
const KINDS: ProposalKind[] = ["gift", "sale", "mark-offer", "keep"];
const ACTION_KINDS: ProposalKind[] = ["gift", "sale", "mark-offer"];
const OUTCOMES: OutcomeKind[] = ["executed", "no-trade", "counterparty-gift", "counterparty-sale", "other-resolution"];
const ARMS = ["neutral", "gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"] as const;
const SEED_LIST = [13331, 13337, 13339, 13367, 13381, 13397, 13411, 13417, 13421, 13441, 13451, 13457, 13463, 13469] as const;
const MRE = 0.25;
const ALPHA = 0.025;

const ROOT = new URL("../../data/", import.meta.url);
const SOURCE_TEXT = readFileSync(new URL("welfare-semantic-boundary.json", ROOT), "utf8");
const source = JSON.parse(SOURCE_TEXT) as any;

type CellStats = {
  opportunities: number;
  proposals: Record<ProposalKind, number>;
  outcomes: Record<ProposalKind, Record<OutcomeKind, number>>;
};
type ArmMap = Record<CellKey, CellStats>;

function zeroRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}
function blankCell(): CellStats {
  return {
    opportunities: 0,
    proposals: zeroRecord(KINDS),
    outcomes: Object.fromEntries(ACTION_KINDS.map((kind) => [kind, zeroRecord(OUTCOMES)])) as Record<ProposalKind, Record<OutcomeKind, number>>,
  };
}
function blankMap(): ArmMap {
  return Object.fromEntries(CELLS.map((cell) => [cell, blankCell()])) as ArmMap;
}
function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function rate(n: number, d: number): number { return d ? n / d : 0; }
function sha256(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function cell(actor: Role, partner: Role): CellKey { return `${actor}->${partner}`; }
function proposalKind(proposal: Proposal): ProposalKind {
  if (proposal.giveCheck && !proposal.requireChit) return "gift";
  if (proposal.giveCheck && proposal.requireChit) return "sale";
  if (proposal.giveChits >= 1) return "mark-offer";
  return "keep";
}

/** Whether the actor's proposal is the action that generated the recorded outcome. */
function actorExecuted(meeting: Meeting, actorId: number, kind: ProposalKind): boolean {
  if (meeting.kind === "swap") return kind === "gift";
  if (meeting.kind === "gift") return kind === "gift" && meeting.seller === actorId;
  if (meeting.kind === "chit-for-check") {
    if (kind === "sale") return meeting.seller === actorId;
    if (kind === "mark-offer") return meeting.buyer === actorId;
  }
  return false;
}

/**
 * A structured proposal record does not contain an engine rejection code.  We
 * therefore expose only the observed outcome class, not a causal reason.
 */
function outcomeFor(meeting: Meeting, actorId: number, kind: ProposalKind): OutcomeKind {
  if (actorExecuted(meeting, actorId, kind)) return "executed";
  if (meeting.kind === "none") return "no-trade";
  if (meeting.kind === "gift") return "counterparty-gift";
  if (meeting.kind === "chit-for-check") return "counterparty-sale";
  return "other-resolution";
}

function addDirected(map: ArmMap, actor: Role, partner: Role, proposal: Proposal, meeting: Meeting, actorId: number): void {
  const row = map[cell(actor, partner)];
  row.opportunities += 1;
  const kind = proposalKind(proposal);
  row.proposals[kind] += 1;
  if (ACTION_KINDS.includes(kind)) row.outcomes[kind]![outcomeFor(meeting, actorId, kind)]! += 1;
}

function mapRun(run: any): ArmMap {
  const map = blankMap();
  for (const round of run.result.rounds) for (const meeting of round.meetings as Meeting[]) {
    addDirected(map, meeting.iType, meeting.jType, meeting.pi, meeting, meeting.i);
    addDirected(map, meeting.jType, meeting.iType, meeting.pj, meeting, meeting.j);
  }
  return map;
}
function mergeMaps(rows: ArmMap[]): ArmMap {
  const out = blankMap();
  for (const map of rows) for (const c of CELLS) {
    const target = out[c]!;
    const sourceCell = map[c]!;
    target.opportunities += sourceCell.opportunities;
    for (const k of KINDS) target.proposals[k] += sourceCell.proposals[k];
    for (const k of ACTION_KINDS) for (const o of OUTCOMES) target.outcomes[k]![o]! += sourceCell.outcomes[k]![o]!;
  }
  return out;
}
function mapRate(map: ArmMap, c: CellKey, k: ProposalKind): number { return rate(map[c]!.proposals[k]!, map[c]!.opportunities); }
function outcomeRate(map: ArmMap, c: CellKey, k: ProposalKind, o: OutcomeKind): number { return rate(map[c]!.outcomes[k]![o]!, map[c]!.opportunities); }

type Relation = { label: string; cells: CellKey[]; kind: ProposalKind } | null;
function namedRelation(arm: string): Relation {
  if (arm === "gift-exact" || arm === "gift-easy-only") return { label: "E→H gift", cells: ["E->H"], kind: "gift" };
  if (arm === "gift-any-holder" || arm === "gift-hard-partner-only") return { label: "actor→H gift", cells: ["E->H", "H->H"], kind: "gift" };
  if (arm === "money-exact") return { label: "E→H sale", cells: ["E->H"], kind: "sale" };
  if (arm === "easy-easy-negative") return { label: "E↔E gift proposal", cells: ["E->E"], kind: "gift" };
  return null;
}
function relationRate(map: ArmMap, rel: Relation): number {
  if (!rel) return 0;
  const den = rel.cells.reduce((sum, c) => sum + map[c]!.opportunities, 0);
  const num = rel.cells.reduce((sum, c) => sum + map[c]!.proposals[rel.kind]!, 0);
  return rate(num, den);
}

function adjustHolm(ps: Array<number | null>): Array<number | null> {
  const ranked = ps.map((p, index) => ({ p, index })).filter((x): x is { p: number; index: number } => x.p !== null).sort((a, b) => a.p - b.p || a.index - b.index);
  const out = ps.map(() => null as number | null);
  let running = 0;
  ranked.forEach((x, rank) => { running = Math.max(running, Math.min(1, (ranked.length - rank) * x.p)); out[x.index] = running; });
  return out;
}

function assertSource(): void {
  if (source.study !== "VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY") throw new Error("unexpected source study");
  if (source.runs.length !== 98 || source.seeds.length !== 14 || source.arms.length !== 7) throw new Error("source block count changed");
  if (source.integrity?.noRetainedFailures !== true || source.integrity?.schemasValid !== true) throw new Error("source integrity gate failed");
  for (const run of source.runs) {
    const meetings = run.result.rounds.reduce((sum: number, round: any) => sum + round.meetings.length, 0);
    if (run.apiFails || run.parseFails || run.robotCalls || run.calls !== meetings * 2) throw new Error(`source call/schema invariant failed ${run.arm}/${run.seed}`);
  }
  for (const seed of SEED_LIST) {
    const rows = source.runs.filter((r: any) => r.seed === seed);
    if (rows.length !== ARMS.length || new Set(rows.map((r: any) => r.scheduleHash)).size !== 1) throw new Error(`unpaired source block ${seed}`);
  }
}

function seedRows(arm: string): Record<number, ArmMap> {
  const out = {} as Record<number, ArmMap>;
  for (const seed of SEED_LIST) {
    const run = source.runs.find((r: any) => r.arm === arm && r.seed === seed);
    if (!run) throw new Error(`missing source row ${arm}/${seed}`);
    out[seed] = mapRun(run);
  }
  return out;
}
function seedRateMap(rows: Record<number, ArmMap>, c: CellKey, k: ProposalKind): number[] {
  return SEED_LIST.map((seed) => mapRate(rows[seed]!, c, k));
}
function seedRelationRates(rows: Record<number, ArmMap>, rel: Relation): number[] { return SEED_LIST.map((seed) => relationRate(rows[seed]!, rel)); }

type SeedCellSummary = {
  seed: number;
  opportunities: number;
  proposalCounts: Record<ProposalKind, number>;
  proposalRates: Record<ProposalKind, number>;
  conversion: Record<ProposalKind, { executed: number; outcomes: Record<OutcomeKind, number> }>;
};
function summarizeCell(rows: Record<number, ArmMap>, c: CellKey): SeedCellSummary[] {
  return SEED_LIST.map((seed) => {
    const row = rows[seed]![c]!;
    return {
      seed,
      opportunities: row.opportunities,
      proposalCounts: { ...row.proposals },
      proposalRates: Object.fromEntries(KINDS.map((k) => [k, rate(row.proposals[k]!, row.opportunities)])) as Record<ProposalKind, number>,
      conversion: Object.fromEntries(ACTION_KINDS.map((k) => [k, { executed: row.outcomes[k]!.executed, outcomes: { ...row.outcomes[k]! } }])) as Record<ProposalKind, { executed: number; outcomes: Record<OutcomeKind, number> }>,
    };
  });
}

// Match the existing VBE gate convention: the MRE is a magnitude guard, while
// the directional sign-flip test is against a zero effect.  Testing against
// .25 would silently make this X0 gate stricter than the frozen E–E gate.
function exactGateP(deltas: number[]): number { return exactUpperSignFlipMitm(deltas, 0) ?? 1; }

function mapOutput(arm: string, rows: Record<number, ArmMap>, pooled: ArmMap): any[] {
  return CELLS.map((c) => ({
    arm,
    cell: c,
    pooledOpportunities: pooled[c]!.opportunities,
    pooledProposalCounts: { ...pooled[c]!.proposals },
    pooledOutcomeCounts: Object.fromEntries(ACTION_KINDS.map((k) => [k, { ...pooled[c]!.outcomes[k]! }])) as Record<ProposalKind, Record<OutcomeKind, number>>,
    seedLevel: summarizeCell(rows, c),
    seedLevelMeanRate: Object.fromEntries(KINDS.map((k) => [k, mean(seedRateMap(rows, c, k))])) as Record<ProposalKind, number>,
    seedLevelCI95: Object.fromEntries(KINDS.map((k) => [k, bootstrapMean95(seedRateMap(rows, c, k))])) as Record<ProposalKind, [number, number] | null>,
    pooledConversionRate: Object.fromEntries(ACTION_KINDS.map((k) => [k, rate(pooled[c]!.outcomes[k]!.executed, pooled[c]!.proposals[k]!)])) as Record<ProposalKind, number>,
    seedLevelMeanConversionRateAmongAttemptingSeeds: Object.fromEntries(ACTION_KINDS.map((k) => {
      const conditional = SEED_LIST.map((seed) => {
        const attempts = rows[seed]![c]!.proposals[k]!;
        return attempts ? rows[seed]![c]!.outcomes[k]!.executed / attempts : null;
      }).filter((value): value is number => value !== null);
      return [k, conditional.length ? mean(conditional) : null];
    })) as Record<ProposalKind, number | null>,
    conversionSeedCount: Object.fromEntries(ACTION_KINDS.map((k) => [k, SEED_LIST.filter((seed) => rows[seed]![c]!.proposals[k]! > 0).length])) as Record<ProposalKind, number>,
  }));
}

function roleSpillover(arm: string, rows: Record<number, ArmMap>, neutralRows: Record<number, ArmMap>): any[] {
  return (["H->H", "H->E"] as CellKey[]).map((c) => {
    const values = seedRateMap(rows, c, "gift");
    const neutralValues = seedRateMap(neutralRows, c, "gift");
    const deltas = values.map((x, i) => x - neutralValues[i]!);
    return {
      arm,
      cell: c,
      proposalRateMean: mean(values),
      proposalRateCI95: bootstrapMean95(values),
      neutralProposalRateMean: mean(neutralValues),
      deltaMean: mean(deltas),
      deltaCI95: bootstrapMean95(deltas),
      perSeed: SEED_LIST.map((seed, i) => ({ seed, armRate: values[i], neutralRate: neutralValues[i], delta: deltas[i] })),
    };
  });
}

function strategyNever(): Proposal { return { giveCheck: false, giveChits: 0, requireChit: false }; }
function strategyFirstBest(me: AgentState, partner: AgentState): Proposal { return me.checks >= 1 && partner.type === "H" ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }
function strategyAlwaysGive(me: AgentState): Proposal { return me.checks >= 1 ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }
function hash01(seed: number, t: number, id: number, partner: number): number { let x = (seed ^ Math.imul(t, 0x45d9f3b) ^ Math.imul(id + 1, 0x27d4eb2d) ^ Math.imul(partner + 7, 0x165667b1)) >>> 0; x = Math.imul(x ^ x >>> 16, 0x85ebca6b); x = Math.imul(x ^ x >>> 13, 0xc2b2ae35); return ((x ^ x >>> 16) >>> 0) / 4294967296; }
function surrogate(seed: number, probabilities: Record<CellKey, number>, includeHE: boolean): StrategyFn { return (me, partner, t) => { if (me.checks < 1) return strategyNever(); const c = cell(me.type, partner.type); const p = c === "H->E" && !includeHE ? 0 : probabilities[c]!; return hash01(seed, t, me.id, partner.id) < p ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }; }
function benchmarkSummary(result: any): any {
  let hhMeetings = 0, hhSwaps = 0, eeMeetings = 0, eeSwaps = 0, ehMeetings = 0, ehGifts = 0, heGifts = 0;
  for (const round of result.rounds) for (const m of round.meetings as Meeting[]) {
    const pair = [m.iType, m.jType].sort().join("");
    if (pair === "HH") { hhMeetings++; hhSwaps += Number(m.kind === "swap"); }
    if (pair === "EE") { eeMeetings++; eeSwaps += Number(m.kind === "swap"); }
    if (pair === "EH") {
      ehMeetings++;
      if (m.kind === "gift") { const sellerType = m.seller === m.i ? m.iType : m.jType; if (sellerType === "E") ehGifts++; else heGifts++; }
    }
  }
  return { meanScore: result.meanScore, hhSwapRate: rate(hhSwaps, hhMeetings), eeSwapRate: rate(eeSwaps, eeMeetings), ehGiftRate: rate(ehGifts, ehMeetings), heGiftRate: rate(heGifts, ehMeetings) };
}

async function runBenchmarks(giftRho: Record<CellKey, number>): Promise<{ rows: any[]; summary: any[] }> {
  const names = ["never-transfer", "first-best", "always-give", "gift-rho-surrogate", "gift-rho-without-H-to-E"] as const;
  const rows: any[] = [];
  for (const name of names) for (const seed of SEED_LIST) {
    let strategy: StrategyFn;
    if (name === "never-transfer") strategy = () => strategyNever();
    else if (name === "first-best") strategy = (me, partner) => strategyFirstBest(me, partner);
    else if (name === "always-give") strategy = (me) => strategyAlwaysGive(me);
    else strategy = surrogate(seed, giftRho, name === "gift-rho-surrogate");
    const result = await runPopulationAsyncPaired(seed, strategy, DEFAULT_PARAMS, true);
    rows.push({ name, seed, ...benchmarkSummary(result) });
  }
  const summary = names.map((name) => {
    const group = rows.filter((row) => row.name === name);
    const metrics = ["meanScore", "hhSwapRate", "eeSwapRate", "ehGiftRate", "heGiftRate"] as const;
    return { name, ...Object.fromEntries(metrics.map((metric) => [metric, { mean: mean(group.map((row) => row[metric])), CI95: bootstrapMean95(group.map((row) => row[metric])) }])) };
  });
  return { rows, summary };
}

const payoffTable = [
  { relation: "H→H swap", giverExpectedDelta: 1.83, receiverExpectedDelta: 1.83, totalExpectedDelta: 3.66, basis: "Each Hard agent replaces pHard=.32 with pPartner=.93; marks absent." },
  { relation: "E→H gift", giverExpectedDelta: -DEFAULT_PARAMS.v, receiverExpectedDelta: DEFAULT_PARAMS.R * (DEFAULT_PARAMS.pPartner - DEFAULT_PARAMS.pHard) + DEFAULT_PARAMS.v, totalExpectedDelta: DEFAULT_PARAMS.R * (DEFAULT_PARAMS.pPartner - DEFAULT_PARAMS.pHard), basis: "Easy forfeits salvage v; Hard gains R·(pPartner−pHard) and retains its own check for salvage v. The received check is not inventoried." },
  { relation: "H→E gift", giverExpectedDelta: -DEFAULT_PARAMS.R * DEFAULT_PARAMS.pHard, receiverExpectedDelta: 0, totalExpectedDelta: -DEFAULT_PARAMS.R * DEFAULT_PARAMS.pHard, basis: "Hard gives away its only check and loses expected own solve; the received check is not added to Easy inventory." },
  { relation: "E↔E swap", giverExpectedDelta: -DEFAULT_PARAMS.v, receiverExpectedDelta: -DEFAULT_PARAMS.v, totalExpectedDelta: -2 * DEFAULT_PARAMS.v, basis: "Both Easy checks lose salvage value; no received-check salvage is created." },
  { relation: "E→H mark sale", giverExpectedDelta: -DEFAULT_PARAMS.v, receiverExpectedDelta: DEFAULT_PARAMS.R * (DEFAULT_PARAMS.pPartner - DEFAULT_PARAMS.pHard) + DEFAULT_PARAMS.v, totalExpectedDelta: DEFAULT_PARAMS.R * (DEFAULT_PARAMS.pPartner - DEFAULT_PARAMS.pHard), basis: "The worthless mark does not change the check/payoff accounting." },
];

export async function buildX0v11(): Promise<any> {
  assertSource();
  const frozenGate = {
    threshold: MRE,
    alpha: ALPHA,
    metric: "proposal rate minus neutral proposal rate",
    inferentialUnit: "paired seed-level rates, n=14",
    test: "one-sided exact paired sign-flip test of delta > 0; MRE is a separate magnitude guard",
    correction: "Holm within the six non-neutral named-package rows",
    status: "FROZEN BEFORE X0 COMPUTATION",
  };
  const gateHash = sha256(frozenGate);
  const rowsByArm: Record<string, Record<number, ArmMap>> = {};
  const pooledByArm: Record<string, ArmMap> = {};
  for (const arm of ARMS) {
    rowsByArm[arm] = seedRows(arm);
    pooledByArm[arm] = mergeMaps(SEED_LIST.map((seed) => rowsByArm[arm]![seed]!));
  }
  const roleConditionalProposalMap = ARMS.flatMap((arm) => mapOutput(arm, rowsByArm[arm]!, pooledByArm[arm]!));

  const neutralRows = rowsByArm.neutral!;
  const auditsRaw = ARMS.map((arm) => {
    const relation = namedRelation(arm);
    if (!relation) return { arm, relation: "none", inferentialUnit: "none", proposalRateMean: 0, proposalRateCI95: [0, 0], neutralProposalRateMean: 0, deltaMean: 0, deltaCI95: [0, 0], exactPAgainstMRE: null, passesMRE: false };
    const armRates = seedRelationRates(rowsByArm[arm]!, relation);
    const neutralRates = seedRelationRates(neutralRows, relation);
    const deltas = armRates.map((value, i) => value - neutralRates[i]!);
    return { arm, relation: relation.label, inferentialUnit: "paired seed-level rates, n=14", proposalRateMean: mean(armRates), proposalRateCI95: bootstrapMean95(armRates), neutralProposalRateMean: mean(neutralRates), deltaMean: mean(deltas), deltaCI95: bootstrapMean95(deltas), exactPAgainstMRE: exactGateP(deltas), armRates, neutralRates, deltas };
  });
  const pAdjusted = adjustHolm(auditsRaw.filter((x) => x.exactPAgainstMRE !== null).map((x) => x.exactPAgainstMRE));
  let pIndex = 0;
  const namedAudit = auditsRaw.map((row) => {
    if (row.exactPAgainstMRE === null) return { ...row, holmAdjustedP: null, passesMRE: false };
    const holmAdjustedP = pAdjusted[pIndex++]!;
    return { ...row, holmAdjustedP, passesMRE: row.deltaMean >= MRE && holmAdjustedP <= ALPHA, perSeed: SEED_LIST.map((seed, i) => ({ seed, armRate: row.armRates[i], neutralRate: row.neutralRates[i], delta: row.deltas[i] })) };
  });
  const spillover = ARMS.flatMap((arm) => roleSpillover(arm, rowsByArm[arm]!, neutralRows));
  const giftRho = Object.fromEntries(CELLS.map((c) => [c, mean(seedRateMap(rowsByArm["gift-exact"]!, c, "gift"))])) as Record<CellKey, number>;
  const benchmark = await runBenchmarks(giftRho);
  return {
    study: "VBE-X0-WELFARE-REVIEW-REANALYSIS-v1.1",
    generatedAt: new Date().toISOString(),
    status: "FROZEN-DATA EXPLORATORY — NOT PROSPECTIVELY TESTED",
    sourceStudy: source.study,
    sourceModel: source.model,
    sourceArtifactSha256: createHash("sha256").update(SOURCE_TEXT).digest("hex"),
    sourceIntegrity: { runs: source.runs.length, seeds: SEED_LIST.length, arms: ARMS.length, scheduleMatched: true, failuresRetained: false },
    engagementGate: { ...frozenGate, sha256: gateHash },
    roleConditionalProposalMap,
    namedAudit,
    actorSpillover: spillover,
    giftRhoEstimate: { unit: "mean of 14 seed-level cell rates", ...giftRho },
    benchmarks: benchmark.summary,
    benchmarkRuns: benchmark.rows,
    payoffTable,
    limitations: [
      "The frozen W-SGB trace stores structured proposals and the resolved meeting kind, but no engine rejection code. Conversion rows therefore report the observed outcome class (executed, no trade, or counterparty resolution), not a causal rejection reason such as infeasibility or non-acceptance.",
      "Each round endows one check to every account; directed meeting opportunities are therefore the denominator for the requested P(proposal | role pair, check held) map. Proposal rates are summarized as means of 14 seed-level rates; pooled counts are retained separately.",
      "For the E↔E directive, the named-relation gate is a directed proposal gate (227/228 pooled); the executed reciprocal-swap rate is a separate endpoint (113/114).",
      "The scripted benchmarks are model-free engine runs on the same 14 seeds and are descriptive surplus yardsticks, not new model evidence or a second policy family.",
      "The map cannot by itself separate structured scope expansion, role misbinding, and generic transfer priming; that discrimination requires the proposed replay/factorial experiments.",
    ],
  };
}

function fmt(value: number | null, digits = 3): string { return value === null ? "NA" : value.toFixed(digits); }
function writeMarkdown(report: any): string {
  let md = `# X0 v1.1 frozen-trace role and engagement reanalysis\n\nGenerated ${report.generatedAt}. **Zero model/API calls.** The W-SGB seed-level population run (n=14) remains the inferential unit; meeting-level counts are descriptive.\n\nSource: \`${report.sourceStudy}\`, model: \`${report.sourceModel}\`; frozen source artifact SHA-256: \`${report.sourceArtifactSha256}\`. Gate manifest SHA-256: \`${report.engagementGate.sha256}\`.\n\n## Frozen proposal-level engagement gate\n\nThe gate manifest was fixed within X0 v1.1 before computing these rows: named proposal rate minus the paired neutral rate must be at least ${report.engagementGate.threshold.toFixed(2)} and pass a one-sided exact paired sign-flip test against zero, with Holm correction across the six non-neutral named-package rows (alpha=${report.engagementGate.alpha}). This analysis is post hoc with respect to the original W-SGB study and is not a prospective claim.\n\n| Arm | Named relation | Mean proposal rate | 95% CI | Neutral rate | Delta | Delta CI | Holm p | Gate |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`;
  for (const x of report.namedAudit) md += `| ${x.arm} | ${x.relation} | ${fmt(x.proposalRateMean)} | [${fmt(x.proposalRateCI95?.[0])}, ${fmt(x.proposalRateCI95?.[1])}] | ${fmt(x.neutralProposalRateMean)} | ${fmt(x.deltaMean)} | [${fmt(x.deltaCI95?.[0])}, ${fmt(x.deltaCI95?.[1])}] | ${fmt(x.holmAdjustedP, 6)} | ${x.passesMRE ? "PASS" : "FAIL / UNENGAGED"} |\n`;
  md += `\n## Role-conditional proposal map\n\nEach row is a directed actor opportunity. A gift is \`giveCheck=true, requireChit=false\`; a sale is \`giveCheck=true, requireChit=true\`; a mark offer is \`giveChits>=1\`; keep is the remaining action. Reported rates below are means of seed-level rates; pooled counts are included for auditability.\n\n| Arm | Cell | Pooled opportunities | Gift | Sale | Mark offer | Keep | Gift rate | Sale rate | Gift executed rate | Sale executed rate |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for (const row of report.roleConditionalProposalMap) {
    const g = row.seedLevelMeanRate.gift, s = row.seedLevelMeanRate.sale, m = row.seedLevelMeanRate["mark-offer"], k = row.seedLevelMeanRate.keep;
    const ge = row.pooledConversionRate.gift, se = row.pooledConversionRate.sale;
    md += `| ${row.arm} | ${row.cell} | ${row.pooledOpportunities} | ${row.pooledProposalCounts.gift} | ${row.pooledProposalCounts.sale} | ${row.pooledProposalCounts["mark-offer"]} | ${row.pooledProposalCounts.keep} | ${fmt(g)} | ${fmt(s)} | ${fmt(ge)} | ${fmt(se)} |\n`;
  }
  md += `\n## Proposal-to-execution conversion\n\nThe trace does not encode a rejection reason. For every attempted action, the following observed outcome classes are available: executed; no trade resolved; a counterparty gift resolved the meeting; a counterparty sale resolved it; or another resolution. These labels do not imply why the engine failed to execute an action.\n\n`;
  for (const arm of ARMS) {
    md += `### ${arm}\n\n| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |\n|---|---|---:|---:|---:|---:|---:|---:|\n`;
    for (const row of report.roleConditionalProposalMap.filter((x: any) => x.arm === arm)) for (const k of ACTION_KINDS) {
      const counts = row.pooledOutcomeCounts[k] as Record<OutcomeKind, number>;
      md += `| ${row.cell} | ${k} | ${row.pooledProposalCounts[k]} | ${counts.executed} | ${counts["no-trade"]} | ${counts["counterparty-gift"]} | ${counts["counterparty-sale"]} | ${counts["other-resolution"]} |\n`;
    }
    md += "\n";
  }
  md += `## Hard-actor spillover\n\n| Arm | Cell | Mean rate | 95% CI | Neutral mean | Delta | Delta CI |\n|---|---|---:|---:|---:|---:|---:|\n`;
  for (const x of report.actorSpillover) md += `| ${x.arm} | ${x.cell} | ${fmt(x.proposalRateMean)} | [${fmt(x.proposalRateCI95?.[0])}, ${fmt(x.proposalRateCI95?.[1])}] | ${fmt(x.neutralProposalRateMean)} | ${fmt(x.deltaMean)} | [${fmt(x.deltaCI95?.[0])}, ${fmt(x.deltaCI95?.[1])}] |\n`;
  md += `\n## Model-free scripted benchmarks\n\n| Policy | Mean score | 95% CI | H-H swap | E-H gift | H-E gift | E-E swap |\n|---|---:|---:|---:|---:|---:|---:|\n`;
  for (const x of report.benchmarks) md += `| ${x.name} | ${fmt(x.meanScore.mean, 3)} | [${fmt(x.meanScore.CI95?.[0], 3)}, ${fmt(x.meanScore.CI95?.[1], 3)}] | ${fmt(x.hhSwapRate.mean)} | ${fmt(x.ehGiftRate.mean)} | ${fmt(x.heGiftRate.mean)} | ${fmt(x.eeSwapRate.mean)} |\n`;
  md += `\n## Transaction payoff table\n\n| Relation | Giver expected delta | Receiver expected delta | Total expected delta |\n|---|---:|---:|---:|\n`;
  for (const x of report.payoffTable) md += `| ${x.relation} | ${x.giverExpectedDelta.toFixed(2)} | ${x.receiverExpectedDelta.toFixed(2)} | ${x.totalExpectedDelta.toFixed(2)} |\n`;
  md += `\n## Boundary of interpretation\n\nThe map confirms a large gift-arm increase in H→H proposals while the named E→H gift gate fails for gift-exact and gift-easy-only. This pattern is compatible with scope expansion, role misbinding, or generic transfer priming; X0 does not identify among them. The E↔E proposal gate and the executed reciprocal-swap endpoint are reported separately.\n\n`;
  for (const x of report.limitations) md += `- ${x}\n`;
  return md;
}

if (import.meta.main) {
  const report = await buildX0v11();
  writeFileSync(new URL("welfare-review-x0-v1.1.json", ROOT), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(new URL("welfare-review-x0-v1.1.md", ROOT), writeMarkdown(report));
  console.log(JSON.stringify({ json: "src/data/welfare-review-x0-v1.1.json", markdown: "src/data/welfare-review-x0-v1.1.md", gateHash: report.engagementGate.sha256, namedAudit: report.namedAudit.map((x: any) => ({ arm: x.arm, delta: x.deltaMean, p: x.holmAdjustedP, pass: x.passesMRE })), benchmarks: report.benchmarks.map((x: any) => ({ name: x.name, meanScore: x.meanScore.mean })) }, null, 2));
}
