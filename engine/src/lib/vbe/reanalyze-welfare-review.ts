import { readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, Proposal, StrategyFn } from "./types.ts";

type Arm = string;
type Role = "E" | "H";
type CellKey = `${Role}->${Role}`;
type ProposalKind = "gift" | "sale" | "mark-offer" | "keep";

const ROOT = new URL("../../data/", import.meta.url);
const SGB = JSON.parse(readFileSync(new URL("welfare-semantic-boundary.json", ROOT), "utf8"));
const RG = JSON.parse(readFileSync(new URL("welfare-role-channel.json", ROOT), "utf8"));
const SGB_ARMS = ["neutral", "gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"] as const;
const SEEDS: number[] = SGB.seeds;
const MRE = 0.25;

function cell(actor: Role, partner: Role): CellKey { return `${actor}->${partner}`; }
function kind(p: Proposal): ProposalKind {
  if (p.giveCheck && !p.requireChit) return "gift";
  if (p.giveCheck && p.requireChit) return "sale";
  if (p.giveChits >= 1) return "mark-offer";
  return "keep";
}

type CellStats = { opportunities: number; proposals: Record<ProposalKind, number>; executed: Record<ProposalKind, number>; noneAfterProposal: Record<ProposalKind, number> };
type ArmMap = Record<CellKey, CellStats>;
const cells: CellKey[] = ["E->E", "E->H", "H->E", "H->H"];
function blankCell(): CellStats { return { opportunities: 0, proposals: { gift: 0, sale: 0, "mark-offer": 0, keep: 0 }, executed: { gift: 0, sale: 0, "mark-offer": 0, keep: 0 }, noneAfterProposal: { gift: 0, sale: 0, "mark-offer": 0, keep: 0 } }; }
function blankMap(): ArmMap { return Object.fromEntries(cells.map(k => [k, blankCell()])) as ArmMap; }

function recordDirected(map: ArmMap, actor: Role, partner: Role, p: Proposal, executed: boolean, executedKind?: ProposalKind) {
  const row = map[cell(actor, partner)];
  row.opportunities += 1;
  const k = kind(p);
  row.proposals[k] += 1;
  if (executed && executedKind) row.executed[executedKind] += 1;
  else if (!executed) row.noneAfterProposal[k] += 1;
}

function analyzeRun(run: any): ArmMap {
  const map = blankMap();
  for (const round of run.result.rounds) for (const m of round.meetings) {
    const iKind = kind(m.pi), jKind = kind(m.pj);
    const iExecuted = m.kind === "swap" || (m.kind === "gift" && m.seller === m.i) || (m.kind === "chit-for-check" && m.seller === m.i);
    const jExecuted = m.kind === "swap" || (m.kind === "gift" && m.seller === m.j) || (m.kind === "chit-for-check" && m.seller === m.j);
    const iExecutedKind: ProposalKind | undefined = m.kind === "swap" ? "gift" : m.kind === "gift" ? "gift" : m.kind === "chit-for-check" ? "sale" : undefined;
    const jExecutedKind: ProposalKind | undefined = m.kind === "swap" ? "gift" : m.kind === "gift" ? "gift" : m.kind === "chit-for-check" ? "sale" : undefined;
    recordDirected(map, m.iType, m.jType, m.pi, iExecuted, iExecutedKind);
    recordDirected(map, m.jType, m.iType, m.pj, jExecuted, jExecutedKind);
  }
  return map;
}

function mergeMaps(rows: ArmMap[]): ArmMap {
  const out = blankMap();
  for (const map of rows) for (const k of cells) {
    const a = out[k], b = map[k];
    a.opportunities += b.opportunities;
    for (const kind of Object.keys(a.proposals) as ProposalKind[]) { a.proposals[kind] += b.proposals[kind]; a.executed[kind] += b.executed[kind]; a.noneAfterProposal[kind] += b.noneAfterProposal[kind]; }
  }
  return out;
}

function rate(map: ArmMap, c: CellKey, k: ProposalKind): number { const row = map[c]; return row.opportunities ? row.proposals[k] / row.opportunities : 0; }
function executedRate(map: ArmMap, c: CellKey, k: ProposalKind): number { const row = map[c]; return row.opportunities ? row.executed[k] / row.opportunities : 0; }

type NamedRelation = { label: string; cells: CellKey[]; kind: ProposalKind; mutual?: boolean } | null;
function namedRelation(arm: Arm): NamedRelation {
  if (arm === "gift-exact" || arm === "gift-easy-only") return { label: "E→H gift", cells: ["E->H"], kind: "gift" };
  if (arm === "gift-any-holder") return { label: "E/H→H gift", cells: ["E->H", "H->H"], kind: "gift" };
  if (arm === "gift-hard-partner-only") return { label: "actor→H gift", cells: ["E->H", "H->H"], kind: "gift" };
  if (arm === "money-exact") return { label: "E→H sale", cells: ["E->H"], kind: "sale" };
  if (arm === "easy-easy-negative") return { label: "E↔E gift proposal", cells: ["E->E"], kind: "gift" };
  return null;
}

function namedRate(map: ArmMap, rel: NamedRelation): number { if (!rel) return 0; const den = rel.cells.reduce((n, c) => n + map[c].opportunities, 0); const num = rel.cells.reduce((n, c) => n + map[c].proposals[rel.kind], 0); return den ? num / den : 0; }

function percentile(xs: number[], q: number): number { const a = [...xs].sort((x, y) => x - y); if (!a.length) return 0; const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? a[lo]! : a[lo]! + (a[hi]! - a[lo]!) * (i - lo); }
function bootstrap(xs: number[], seed = 20260928): [number, number] { let s = seed >>> 0; const next = () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; const means: number[] = []; for (let b = 0; b < 20000; b++) { let sum = 0; for (let i = 0; i < xs.length; i++) sum += xs[Math.floor(next() * xs.length)]!; means.push(sum / xs.length); } return [percentile(means, .025), percentile(means, .975)]; }
function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / (xs.length || 1); }

function strategyNever(): Proposal { return { giveCheck: false, giveChits: 0, requireChit: false }; }
function strategyFirstBest(me: AgentState, partner: AgentState): Proposal { return me.checks >= 1 && partner.type === "H" ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }
function strategyAlwaysGive(me: AgentState): Proposal { return me.checks >= 1 ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }
function hash01(seed: number, t: number, id: number, partner: number): number { let x = (seed ^ Math.imul(t, 0x45d9f3b) ^ Math.imul(id + 1, 0x27d4eb2d) ^ Math.imul(partner + 7, 0x165667b1)) >>> 0; x = Math.imul(x ^ x >>> 16, 0x85ebca6b); x = Math.imul(x ^ x >>> 13, 0xc2b2ae35); return ((x ^ x >>> 16) >>> 0) / 4294967296; }
function surrogateForSeed(seed: number, probs: Record<CellKey, number>, includeHE: boolean): StrategyFn { return (me, partner, t) => { if (me.checks < 1) return strategyNever(); const c = cell(me.type, partner.type); let p = probs[c] ?? 0; if (!includeHE && c === "H->E") p = 0; return hash01(seed, t, me.id, partner.id) < p ? { giveCheck: true, giveChits: 0, requireChit: false } : strategyNever(); }; }

const mapsByArm: Record<string, ArmMap> = {};
const seedMaps: Record<string, Record<number, ArmMap>> = {};
for (const arm of SGB_ARMS) { const runs = SGB.runs.filter((r: any) => r.arm === arm); seedMaps[arm] = {}; for (const r of runs) seedMaps[arm][r.seed] = analyzeRun(r); mapsByArm[arm] = mergeMaps(runs.map(analyzeRun)); }
const neutral = mapsByArm.neutral;
const proposalMap: any[] = [];
for (const arm of SGB_ARMS) for (const c of cells) proposalMap.push({ arm, cell: c, opportunities: mapsByArm[arm][c].opportunities, gift: mapsByArm[arm][c].proposals.gift, sale: mapsByArm[arm][c].proposals.sale, markOffer: mapsByArm[arm][c].proposals["mark-offer"], keep: mapsByArm[arm][c].proposals.keep, giftRate: rate(mapsByArm[arm], c, "gift"), saleRate: rate(mapsByArm[arm], c, "sale"), executedGiftRate: executedRate(mapsByArm[arm], c, "gift"), executedSaleRate: executedRate(mapsByArm[arm], c, "sale"), giftNonexecution: mapsByArm[arm][c].noneAfterProposal.gift, saleNonexecution: mapsByArm[arm][c].noneAfterProposal.sale });
const namedAudit: any[] = [];
for (const arm of SGB_ARMS) { const rel = namedRelation(arm); const armRates = SEEDS.map(seed => namedRate(seedMaps[arm][seed]!, rel)); const neutralRel = namedRelation(arm); const neutralRates = SEEDS.map(seed => namedRate(seedMaps.neutral[seed]!, neutralRel)); const deltas = armRates.map((x, i) => x - neutralRates[i]!); const ci = bootstrap(armRates); namedAudit.push({ arm, relation: rel?.label ?? "none", proposalRateMean: mean(armRates), proposalRateCI: ci, neutralProposalRateMean: mean(neutralRates), deltaMean: mean(deltas), deltaCI: bootstrap(deltas), passesMRE: arm !== "neutral" && mean(deltas) >= MRE }); }
const spillover: any[] = [];
for (const arm of SGB_ARMS) for (const c of ["H->H", "H->E"] as CellKey[]) { const armRates = SEEDS.map(seed => rate(seedMaps[arm][seed]!, c, "gift")); const baseRates = SEEDS.map(seed => rate(seedMaps.neutral[seed]!, c, "gift")); spillover.push({ arm, cell: c, proposalRateMean: mean(armRates), proposalRateCI: bootstrap(armRates), neutralMean: mean(baseRates), deltaMean: mean(armRates.map((x, i) => x - baseRates[i]!)), deltaCI: bootstrap(armRates.map((x, i) => x - baseRates[i]!)) }); }

const giftProbs = Object.fromEntries(cells.map(c => [c, rate(mapsByArm["gift-exact"], c, "gift")])) as Record<CellKey, number>;
const benchmarkNames = ["never-transfer", "first-best", "always-give", "gift-rho-surrogate", "gift-rho-without-H-to-E"] as const;
const benchmarkRuns: any[] = [];
for (const name of benchmarkNames) for (const seed of SEEDS) {
  let strategy: StrategyFn;
  if (name === "never-transfer") strategy = () => strategyNever();
  else if (name === "first-best") strategy = (me, partner) => strategyFirstBest(me, partner);
  else if (name === "always-give") strategy = (me) => strategyAlwaysGive(me);
  else strategy = surrogateForSeed(seed, giftProbs, name === "gift-rho-surrogate");
  const result = await runPopulationAsyncPaired(seed, strategy, DEFAULT_PARAMS, true);
  let hhMeetings = 0, hhSwaps = 0, eeMeetings = 0, eeSwaps = 0, ehMeetings = 0, ehGifts = 0, heGifts = 0;
  for (const round of result.rounds) for (const m of round.meetings) { const p = [m.iType, m.jType].sort().join(""); if (p === "HH") { hhMeetings++; hhSwaps += Number(m.kind === "swap"); } if (p === "EE") { eeMeetings++; eeSwaps += Number(m.kind === "swap"); } if (p === "EH") { ehMeetings++; if (m.kind === "gift") { const sellerType = m.seller === m.i ? m.iType : m.jType; if (sellerType === "E") ehGifts++; else heGifts++; } } }
  benchmarkRuns.push({ name, seed, meanScore: result.meanScore, hhSwapRate: hhMeetings ? hhSwaps / hhMeetings : 0, eeSwapRate: eeMeetings ? eeSwaps / eeMeetings : 0, ehGiftRate: ehMeetings ? ehGifts / ehMeetings : 0, heGiftRate: ehMeetings ? heGifts / ehMeetings : 0 });
}
const benchmarks = benchmarkNames.map(name => { const rows = benchmarkRuns.filter(r => r.name === name); const score = rows.map(r => r.meanScore), hh = rows.map(r => r.hhSwapRate); return { name, meanScore: mean(score), scoreCI: bootstrap(score), hhSwapRate: mean(hh), hhSwapCI: bootstrap(hh), eeSwapRate: mean(rows.map(r => r.eeSwapRate)), ehGiftRate: mean(rows.map(r => r.ehGiftRate)), heGiftRate: mean(rows.map(r => r.heGiftRate)) }; });

const ehGiverDelta = -DEFAULT_PARAMS.v;
const ehReceiverDelta = DEFAULT_PARAMS.R * (DEFAULT_PARAMS.pPartner - DEFAULT_PARAMS.pHard) + DEFAULT_PARAMS.v;
const payoffTable = [
  { relation: "H→H swap", giverDelta: 1.83, receiverDelta: 1.83, totalExpectedDelta: 3.66, basis: "Each Hard agent replaces pHard=.32 with pPartner=.93; marks absent." },
  { relation: "E→H gift", giverDelta: ehGiverDelta, receiverDelta: ehReceiverDelta, totalExpectedDelta: ehGiverDelta + ehReceiverDelta, basis: "Easy forfeits salvage v; Hard gains R·(pPartner−pHard) and retains its own check for salvage v. The received check itself is not inventoried." },
  { relation: "H→E gift", giverDelta: -0.96, receiverDelta: 0, totalExpectedDelta: -0.96, basis: "Hard gives away its only check and loses expected own solve R·pHard=.96; received check is not added to Easy inventory." },
  { relation: "E↔E swap", giverDelta: -0.5, receiverDelta: -0.5, totalExpectedDelta: -1.0, basis: "Both Easy checks lose salvage value v=.5; no received-check salvage is created." },
  { relation: "E→H mark sale", giverDelta: ehGiverDelta, receiverDelta: ehReceiverDelta, totalExpectedDelta: ehGiverDelta + ehReceiverDelta, basis: "Easy forfeits salvage v and receives an intrinsically worthless mark; Hard gains R·(pPartner−pHard) and retains its own check for salvage v. The received check itself is not inventoried." },
];

const report = { study: "VBE-X0-WELFARE-REVIEW-REANALYSIS", generatedAt: new Date().toISOString(), sourceStudies: ["VBE-W-RG-ROLE-GENERALIZATION-CHANNEL", "VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY"], threshold: MRE, proposalMap, namedAudit, spillover, benchmarks, benchmarkRuns, payoffTable, limitations: ["The frozen W-SGB meeting record stores structured proposals and executed outcomes, but not a separate engine rejection code; non-executed proposals are therefore classified as unresolved incompatibility/infeasibility rather than attributed to a single cause.", "Proposal feasibility is one check per agent per round under the frozen VBE engine; directed meeting opportunities are therefore used as the denominator.", "The scripted benchmarks are model-free engine runs on the 14 W-SGB seeds and are descriptive surplus yardsticks, not new model evidence."] };
writeFileSync(new URL("welfare-review-x0.json", ROOT), JSON.stringify(report, null, 2) + "\n");

let md = `# X0 Frozen-trace reanalysis\n\nGenerated ${report.generatedAt}. This is a zero-call analysis of W-RG and W-SGB records. The seed-level population run remains the inferential unit.\n\n## Named-relation proposal engagement\n\n| Arm | Named relation | Proposal rate | 95% bootstrap CI | Neutral rate | Arm-minus-neutral | Gate at ${MRE} |\n|---|---|---:|---:|---:|---:|---|\n`;
for (const x of namedAudit) md += `| ${x.arm} | ${x.relation} | ${x.proposalRateMean.toFixed(3)} | [${x.proposalRateCI.map((v: number) => v.toFixed(3)).join(", ")}] | ${x.neutralProposalRateMean.toFixed(3)} | ${x.deltaMean.toFixed(3)} | ${x.passesMRE ? "pass" : "fail / unengaged"} |\n`;
md += `\n## Role-conditional proposal map\n\nRates are proposals per directed actor opportunity; gift means giveCheck=true and requireChit=false.\n\n| Arm | Cell | Opportunities | Gift proposals | Sale proposals | Gift rate | Sale rate | Executed gift rate | Executed sale rate |\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n`;
for (const x of proposalMap) md += `| ${x.arm} | ${x.cell} | ${x.opportunities} | ${x.gift} | ${x.sale} | ${x.giftRate.toFixed(3)} | ${x.saleRate.toFixed(3)} | ${x.executedGiftRate.toFixed(3)} | ${x.executedSaleRate.toFixed(3)} |\n`;
md += `\n## Hard-actor spillover\n\n| Arm | Cell | Proposal rate | Neutral rate | Difference |\n|---|---|---:|---:|---:|\n`;
for (const x of spillover) md += `| ${x.arm} | ${x.cell} | ${x.proposalRateMean.toFixed(3)} | ${x.neutralMean.toFixed(3)} | ${x.deltaMean.toFixed(3)} |\n`;
md += `\n## Model-free scripted benchmarks\n\n| Policy | Mean score | 95% CI | H-H swap rate | E-H gift rate | H-E gift rate | E-E swap rate |\n|---|---:|---:|---:|---:|---:|---:|\n`;
for (const x of benchmarks) md += `| ${x.name} | ${x.meanScore.toFixed(3)} | [${x.scoreCI.map((v: number) => v.toFixed(3)).join(", ")}] | ${x.hhSwapRate.toFixed(3)} | ${x.ehGiftRate.toFixed(3)} | ${x.heGiftRate.toFixed(3)} | ${x.eeSwapRate.toFixed(3)} |\n`;
md += `\n## Transaction payoff table\n\n| Relation | Giver expected delta | Receiver expected delta | Total expected delta |\n|---|---:|---:|---:|\n`;
for (const x of payoffTable) md += `| ${x.relation} | ${x.giverDelta.toFixed(2)} | ${x.receiverDelta.toFixed(2)} | ${x.totalExpectedDelta.toFixed(2)} |\n`;
md += `\n## Interpretation boundary\n\nThe proposal map distinguishes realized H-H activation from the named E-H relation. It cannot by itself separate structured scope expansion, role misbinding, and generic transfer priming. The named-relation audit treats every package symmetrically; packages that fail the 0.25 proposal gate are not used to identify scope boundaries.\n\n`;
for (const x of report.limitations) md += `- ${x}\n`;
writeFileSync(new URL("welfare-review-x0.md", ROOT), md);
console.log(JSON.stringify({ output: ["src/data/welfare-review-x0.json", "src/data/welfare-review-x0.md"], namedAudit, benchmarks }, null, 2));
