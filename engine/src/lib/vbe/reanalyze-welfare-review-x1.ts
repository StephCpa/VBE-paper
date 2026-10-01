/**
 * Generates the X1 zero-call mechanism audit from frozen W-CO, W-RG and W-SGB
 * artifacts. No model or API call is made; no frozen file is modified.
 *
 *   node --experimental-strip-types src/lib/vbe/reanalyze-welfare-review-x1.ts
 *
 * Writes src/data/welfare-review-x1.json and src/data/welfare-review-x1.md.
 * Output is deterministic (no wall-clock fields), so re-running is idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { bootstrapMean95 } from "./epistemic-analysis.ts";
import { SEMANTIC_CONTRASTS } from "./welfare-semantic-boundary.ts";
import {
  DIRECTED_CELLS, P, TRANSACTION_CATEGORIES, X1_VERSION,
  accountRun, benchmarkMean, closedLoopDifference, compareFixedState, determinismCheck, dynamicsByOrdinal,
  filterAudit, holmMres, isGive, jointTable, moneyFunnel, payoffTable, replayRun, sha256,
  stageGames, supplementaryEffect,
  type Benchmark, type Decision, type FrozenRun, type RunAccount, type StudyId, type SupplementaryEffect,
  type TransactionCategory,
} from "./welfare-review-x1.ts";

type StudySpec = { study: StudyId; path: string; arms: string[]; reference: string; seeds: number[] };

const STUDIES: StudySpec[] = [
  { study: "W-CO", path: "src/data/welfare-crowding-out.json", arms: ["money-talk", "gift-talk"], reference: "money-talk", seeds: [] },
  { study: "W-RG", path: "src/data/welfare-role-channel.json", arms: ["neutral-standard", "gift-standard", "gift-hh-blocked", "gift-eh-gift-blocked"], reference: "neutral-standard", seeds: [] },
  { study: "W-SGB", path: "src/data/welfare-semantic-boundary.json", arms: ["neutral", "gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"], reference: "neutral", seeds: [] },
];

const round = (x: number, d = 4) => (Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const fmt = (x: number | null | undefined, d = 4) => (x === null || x === undefined || !Number.isFinite(x) ? "NA" : x.toFixed(d));
const ci = (c: [number, number] | null) => (c ? `[${fmt(c[0], 3)}, ${fmt(c[1], 3)}]` : "NA");
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

async function main(): Promise<void> {
  const sources: Record<string, string> = {};
  const loaded = new Map<StudyId, { raw: any; runs: FrozenRun[] }>();
  for (const spec of STUDIES) {
    const text = readFileSync(spec.path, "utf8");
    sources[spec.path] = sha256(text);
    const raw = JSON.parse(text);
    spec.seeds = [...raw.seeds];
    loaded.set(spec.study, { raw, runs: raw.runs as FrozenRun[] });
  }

  // ---- parts 2 & 3: replay and account every run -------------------------
  const decisions = new Map<StudyId, Decision[]>();
  const accounts = new Map<StudyId, RunAccount[]>();
  const replayChecks: Record<string, { runs: number; scoresMatch: number; kindsMatch: number; reconcile: number; decisions: number }> = {};
  for (const spec of STUDIES) {
    const ds: Decision[] = [], as: RunAccount[] = [];
    let sm = 0, km = 0, rc = 0;
    for (const run of loaded.get(spec.study)!.runs) {
      const rep = await replayRun(spec.study, run);
      if (!rep.scoresMatch || !rep.kindsMatch) throw new Error(`${spec.study} ${run.arm} seed ${run.seed}: replay does not reproduce the frozen run`);
      sm += 1; km += 1;
      ds.push(...rep.decisions);
      const acc = accountRun(run);
      if (!acc.reconciles) throw new Error(`${spec.study} ${run.arm} seed ${run.seed}: welfare decomposition does not reconcile`);
      rc += 1; as.push(acc);
    }
    decisions.set(spec.study, ds); accounts.set(spec.study, as);
    replayChecks[spec.study] = { runs: loaded.get(spec.study)!.runs.length, scoresMatch: sm, kindsMatch: km, reconcile: rc, decisions: ds.length };
  }

  // ---- benchmarks on each study's seeds -----------------------------------
  const benchmarks: Record<string, Record<Benchmark, number>> = {};
  for (const spec of STUDIES) {
    const row = {} as Record<Benchmark, number>;
    for (const b of ["never-transfer", "first-best-ex-ante", "first-best-ex-post", "always-give"] as Benchmark[]) {
      row[b] = avg(await Promise.all(spec.seeds.map(s => benchmarkMean(s, b))));
    }
    benchmarks[spec.study] = row;
  }

  // ---- welfare accounting by arm, and decomposition versus the reference --
  const accounting: Record<string, any> = {};
  for (const spec of STUDIES) {
    const as = accounts.get(spec.study)!;
    const nSeeds = spec.seeds.length;
    const perAcct = (sum: number) => sum / (nSeeds * P.n);
    const byArm: Record<string, any> = {};
    for (const arm of spec.arms) {
      const runs = as.filter(a => a.arm === arm);
      const cats: Record<string, { count: number; expectedPerAccount: number; realizedPerAccount: number; residualPerAccount: number }> = {};
      for (const c of TRANSACTION_CATEGORIES) {
        const count = runs.reduce((s, r) => s + r.categories[c].count, 0);
        const e = runs.reduce((s, r) => s + r.categories[c].expected, 0);
        const z = runs.reduce((s, r) => s + r.categories[c].realized, 0);
        cats[c] = { count, expectedPerAccount: round(perAcct(e)), realizedPerAccount: round(perAcct(z)), residualPerAccount: round(perAcct(z - e)) };
      }
      const welfare = avg(runs.map(r => r.recordedMean));
      const never = avg(runs.map(r => r.neverTransferMean));
      byArm[arm] = {
        meanWelfare: round(welfare), neverTransferSameSeeds: round(never),
        gainOverNeverTransfer: round(welfare - never),
        shareOfExAnteFeasibleGain: round((welfare - never) / (benchmarks[spec.study]!["first-best-ex-ante"] - never)),
        forfeits: runs.reduce((s, r) => s + r.forfeits, 0),
        categories: cats,
      };
    }
    // Decomposition of each arm's difference from the reference arm.
    const decomposition: Record<string, any> = {};
    for (const arm of spec.arms) {
      if (arm === spec.reference) continue;
      const rows: Record<string, { countDelta: number; expectedDeltaPerAccount: number; realizedDeltaPerAccount: number }> = {};
      let totalRealized = 0;
      for (const c of TRANSACTION_CATEGORIES) {
        const a = byArm[arm].categories[c], r = byArm[spec.reference].categories[c];
        const rd = a.realizedPerAccount - r.realizedPerAccount;
        totalRealized += rd;
        if (a.count === 0 && r.count === 0) continue;
        rows[c] = { countDelta: a.count - r.count, expectedDeltaPerAccount: round(a.expectedPerAccount - r.expectedPerAccount), realizedDeltaPerAccount: round(rd) };
      }
      decomposition[`${arm} - ${spec.reference}`] = {
        welfareDelta: round(byArm[arm].meanWelfare - byArm[spec.reference].meanWelfare),
        sumOfRealizedCategoryDeltas: round(totalRealized),
        rows,
      };
    }
    accounting[spec.study] = { byArm, decomposition };
  }

  // ---- part 4: joint proposals and money funnel ---------------------------
  const joint: Record<string, any> = {}, funnel: Record<string, any> = {};
  const funnelTotals = { hardDecisionsHoldingMark: 0, markOffersAnyCell: 0, executedSales: 0 };
  for (const spec of STUDIES) {
    const ds = decisions.get(spec.study)!;
    joint[spec.study] = {}; funnel[spec.study] = {};
    for (const arm of spec.arms) {
      const armDs = ds.filter(x => x.arm === arm);
      joint[spec.study][arm] = jointTable(armDs);
      const f = moneyFunnel(armDs);
      funnel[spec.study][arm] = f;
      funnelTotals.hardDecisionsHoldingMark += f.hardDecisionsHoldingMark;
      funnelTotals.markOffersAnyCell += f.markOffersAnyCell;
      funnelTotals.executedSales += f.executedSales;
    }
  }

  // ---- part 5: fixed-state comparisons and determinism --------------------
  const fixedState: any[] = [];
  for (const spec of STUDIES) {
    const ds = decisions.get(spec.study)!;
    const targets = spec.study === "W-RG" ? ["gift-standard"] : spec.arms.filter(a => a !== spec.reference);
    for (const arm of targets) {
      const cmp = compareFixedState(spec.study, ds, arm, spec.reference);
      if (!cmp.firstMeetingStatesIdentical) throw new Error(`${spec.study} ${arm}: first-meeting states are not identical to ${spec.reference}`);
      fixedState.push({
        ...cmp,
        cells: cmp.cells.map(c => ({
          ...c,
          armGiveRate: round(c.armGiveRate), referenceGiveRate: round(c.referenceGiveRate),
          seedMeanDifference: round(c.seedMeanDifference),
          bootstrap95: c.bootstrap95 ? [round(c.bootstrap95[0]), round(c.bootstrap95[1])] : null,
          closedLoopSeedMeanDifference: round(closedLoopDifference(ds, arm, spec.reference, c.cell)),
        })),
      });
    }
  }
  const firstMeetingCounts: Record<string, number> = {};
  for (const spec of STUDIES) firstMeetingCounts[spec.study] = decisions.get(spec.study)!.filter(x => x.arm === spec.reference && x.firstMeeting).length;

  const wrg = decisions.get("W-RG")!;
  const determinism = [
    determinismCheck(wrg, "gift-standard", "gift-hh-blocked"),
    determinismCheck(wrg, "gift-standard", "gift-eh-gift-blocked"),
    determinismCheck(wrg, "gift-hh-blocked", "gift-eh-gift-blocked"),
  ];
  const filters = ["gift-hh-blocked", "gift-eh-gift-blocked"].map(arm => filterAudit(wrg, arm));
  const dynamics = {
    "W-CO": dynamicsByOrdinal(decisions.get("W-CO")!, ["money-talk", "gift-talk"], ["H>H", "H>E", "E>H"]),
    "W-RG": dynamicsByOrdinal(wrg, ["neutral-standard", "gift-standard"], ["H>H", "H>E", "E>H"]),
    "W-SGB": dynamicsByOrdinal(decisions.get("W-SGB")!, ["neutral", "gift-exact", "easy-easy-negative"], ["H>H", "H>E", "E>H", "E>E"]),
  };

  // ---- named-relation engagement: closed loop vs first decision ----------
  // Named relation per W-SGB package, as coded in the frozen X0 v1.1 gate.
  const NAMED: Record<string, { cells: string[]; action: "give" | "sale"; label: string }> = {
    "gift-exact": { cells: ["E>H"], action: "give", label: "E->H gift" },
    "gift-easy-only": { cells: ["E>H"], action: "give", label: "E->H gift" },
    "gift-any-holder": { cells: ["E>H", "H>H"], action: "give", label: "actor->H gift" },
    "gift-hard-partner-only": { cells: ["E>H", "H>H"], action: "give", label: "actor->H gift" },
    "money-exact": { cells: ["E>H"], action: "sale", label: "E->H sale" },
    "easy-easy-negative": { cells: ["E>E"], action: "give", label: "E->E gift" },
  };
  const THRESHOLDS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
  const sgbDs = decisions.get("W-SGB")!;
  const namedRate = (arm: string, named: (typeof NAMED)[string], firstOnly: boolean) => {
    const bySeed = new Map<number, number[]>();
    for (const x of sgbDs) {
      if (x.arm !== arm || !named.cells.includes(`${x.meType}>${x.partnerType}`) || (firstOnly && !x.firstMeeting)) continue;
      const hit = named.action === "give" ? isGive(x.original) : x.original.giveCheck && x.original.requireChit;
      const list = bySeed.get(x.seed) ?? []; list.push(Number(hit)); bySeed.set(x.seed, list);
    }
    return new Map([...bySeed].map(([s, v]) => [s, avg(v)]));
  };
  const namedEngagement = Object.entries(NAMED).map(([arm, named]) => {
    const row: any = { arm, namedRelation: named.label };
    for (const [scope, firstOnly] of [["closedLoop", false], ["firstDecision", true]] as const) {
      const a = namedRate(arm, named, firstOnly), r = namedRate("neutral", named, firstOnly);
      const diffs = [...a.keys()].filter(s => r.has(s)).map(s => a.get(s)! - r.get(s)!);
      const delta = avg(diffs);
      const c = bootstrapMean95(diffs);
      row[scope] = { seeds: diffs.length, delta: round(delta), bootstrap95: c ? [round(c[0]), round(c[1])] : null, clears: THRESHOLDS.map(t => ({ threshold: t, clears: delta >= t })) };
    }
    return row;
  });

  // ---- part 6: supplementary inference -------------------------------------
  const inference: Record<string, SupplementaryEffect[]> = {};
  const crossCheck: string[] = [];
  const seedValues = (study: StudyId, left: string, right: string, metric: (r: FrozenRun) => number) => {
    const runs = loaded.get(study)!.runs;
    return STUDIES.find(s => s.study === study)!.seeds.map(seed => {
      const a = runs.find(r => r.seed === seed && r.arm === left)!, b = runs.find(r => r.seed === seed && r.arm === right)!;
      return metric(a) - metric(b);
    });
  };
  const welfare = (r: FrozenRun) => r.meanScore;
  const hhRate = (r: FrozenRun) => (r as any).mechanism.hhSwapRate as number;
  const check = (label: string, mine: number[], stored: Array<{ delta: number }>) => {
    const ok = mine.length === stored.length && mine.every((x, k) => Math.abs(x - stored[k]!.delta) < 1e-9);
    if (!ok) throw new Error(`recomputed seed values differ from frozen effect: ${label}`);
    crossCheck.push(label);
  };
  {
    const raw = loaded.get("W-CO")!.raw;
    const v = seedValues("W-CO", "gift-talk", "money-talk", welfare);
    check("W-CO giftMinusMoneyScore", v, raw.effects.giftMinusMoneyScore.values);
    inference["W-CO"] = [supplementaryEffect("gift - money welfare", v, 0.5)];
  }
  {
    const raw = loaded.get("W-RG")!.raw, out: SupplementaryEffect[] = [];
    for (const [name, left, right, metric, mres] of [
      ["giftMinusNeutralScore", "gift-standard", "neutral-standard", welfare, 0.5],
      ["giftMinusHhBlockedScore", "gift-standard", "gift-hh-blocked", welfare, 0.5],
      ["ehBlockedMinusHhBlockedScore", "gift-eh-gift-blocked", "gift-hh-blocked", welfare, 0.5],
      ["giftMinusHhBlockedSwapRate", "gift-standard", "gift-hh-blocked", hhRate, 0.5],
    ] as const) {
      const v = seedValues("W-RG", left, right, metric);
      check(`W-RG ${name}`, v, raw.effects[name].values);
      out.push(supplementaryEffect(`${left} - ${right} ${metric === welfare ? "welfare" : "H-H swap rate"}`, v, mres));
    }
    inference["W-RG"] = out;
  }
  {
    const raw = loaded.get("W-SGB")!.raw, hh: SupplementaryEffect[] = [], wf: SupplementaryEffect[] = [];
    for (const [name, [left, right]] of Object.entries(SEMANTIC_CONTRASTS)) {
      const vh = seedValues("W-SGB", left, right, hhRate), vw = seedValues("W-SGB", left, right, welfare);
      check(`W-SGB ${name} hh`, vh, raw.effects[name].hhSwapRate.values);
      check(`W-SGB ${name} welfare`, vw, raw.effects[name].welfare.values);
      hh.push(supplementaryEffect(`${left} - ${right} H-H swap rate`, vh, 0.25));
      wf.push(supplementaryEffect(`${left} - ${right} welfare`, vw, 0.5));
    }
    holmMres(hh); holmMres(wf);
    inference["W-SGB H-H swap rate"] = hh;
    inference["W-SGB welfare"] = wf;
  }

  // ---- reviewer-specific arithmetic ---------------------------------------
  const sgb = accounting["W-SGB"].byArm;
  const rgStd = accounting["W-RG"].byArm["gift-standard"];
  const reviewerChecks = {
    wsgbGiftExactHtoEGifts: sgb["gift-exact"].categories["H>E:gift"].count,
    wsgbNeutralHtoEGifts: sgb["neutral"].categories["H>E:gift"].count,
    wsgbGiftExactHtoEExpectedPerAccount: sgb["gift-exact"].categories["H>E:gift"].expectedPerAccount,
    wsgbGiftMinusNeutralHtoEExpectedPerAccount: round(sgb["gift-exact"].categories["H>E:gift"].expectedPerAccount - sgb["neutral"].categories["H>E:gift"].expectedPerAccount),
    wrgGiftStandardEHSwaps: rgStd.categories["EH:swap"].count,
    wrgGiftStandardEtoHOneWay: rgStd.categories["E>H:gift"].count,
    wrgEHSwapAvoidableLossVersusOneWayTotal: round(rgStd.categories["EH:swap"].count * P.v, 2),
    staticHHMagnitude: round((83 * 3.66) / (12 * 8)),
  };

  const out = {
    analysis: "VBE-X1-ZERO-CALL-MECHANISM-AUDIT",
    version: X1_VERSION,
    status: "POST-HOC ZERO-CALL REANALYSIS OF FROZEN TRACES — SUPPLEMENTARY; NOT A PROSPECTIVE CLAIM",
    modelCalls: 0,
    sources,
    params: P,
    replayChecks,
    effectCrossChecks: crossCheck.length,
    payoffTable: payoffTable(),
    stageGames: stageGames(),
    benchmarks: Object.fromEntries(Object.entries(benchmarks).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([b, x]) => [b, round(x)]))])),
    accounting,
    reviewerChecks,
    joint,
    moneyFunnel: { byStudyArm: funnel, totals: funnelTotals },
    fixedState: { firstMeetingDecisionsPerArm: firstMeetingCounts, comparisons: fixedState },
    namedEngagement,
    determinism,
    dynamics: Object.fromEntries(Object.entries(dynamics).map(([k, rows]) => [k, rows.map(r => ({ ...r, rate: round(r.rate) }))])),
    filterAudit: filters,
    inference: Object.fromEntries(Object.entries(inference).map(([k, fam]) => [k, fam.map(e => ({
      ...e, mean: round(e.mean), minSeedDelta: round(e.minSeedDelta),
      bootstrap95: e.bootstrap95 ? [round(e.bootstrap95[0]), round(e.bootstrap95[1])] : null,
      leaveOneOutMin: round(e.leaveOneOutMin), leaveOneOutMax: round(e.leaveOneOutMax),
      values: e.values.map(x => round(x, 6)),
    }))])),
  };
  writeFileSync("src/data/welfare-review-x1.json", `${JSON.stringify(out, null, 2)}\n`);
  writeFileSync("src/data/welfare-review-x1.md", renderMarkdown(out));
  console.log(`X1 written: ${Object.values(replayChecks).reduce((s, x) => s + x.runs, 0)} runs replayed exactly, ${Object.values(replayChecks).reduce((s, x) => s + x.decisions, 0)} decisions, ${crossCheck.length} frozen effects cross-checked, 0 model calls.`);
}

function renderMarkdown(o: any): string {
  const L: string[] = [];
  L.push("# X1 zero-call mechanism audit", "");
  L.push(`**Zero model/API calls.** Post-hoc, supplementary reanalysis of frozen W-CO, W-RG and W-SGB traces. The seed-level population run remains the inferential unit; meeting-level counts are descriptive. Version ${o.version}.`, "");
  L.push("Source SHA-256:", "");
  for (const [p, h] of Object.entries(o.sources)) L.push(`- \`${p}\`: \`${h}\``);
  L.push("", "## Replay and reconciliation", "");
  L.push("Every frozen run was replayed through the frozen engine by feeding back its recorded proposals. Each replay reproduces the recorded final scores and every meeting resolution, so every reconstructed prompt below is the prompt the model actually received. Every run's realized welfare also reconciles exactly to a never-transfer baseline plus per-transaction contributions.", "");
  L.push("| Study | Runs | Exact replays | Reconciled | Decisions |", "|---|---:|---:|---:|---:|");
  for (const [s, r] of Object.entries<any>(o.replayChecks)) L.push(`| ${s} | ${r.runs} | ${r.scoresMatch} | ${r.reconcile} | ${r.decisions} |`);
  L.push("", `Recomputed seed-level effects match ${o.effectCrossChecks} frozen effect vectors exactly.`, "");

  L.push("## 1. Transaction payoff identities", "");
  L.push("Expected direct change relative to no transfer, computed analytically and verified against the frozen engine by integrating over the payoff-draw strata. Marks carry no value, so a sale moves the same payoff as a gift in the same direction.", "");
  L.push("| Category | Giver | Receiver | Total |", "|---|---:|---:|---:|");
  for (const r of o.payoffTable) L.push(`| ${r.category} | ${fmt(r.giver, 2)} | ${fmt(r.receiver, 2)} | ${fmt(r.total, 2)} |`);
  L.push("", "Stage games implied by these identities (expected round payoffs; action 0 = keep, 1 = unconditional give):", "");
  for (const g of o.stageGames) {
    L.push(`- **${g.pair}** (row ${g.rowRole}, column ${g.colRole}): keep/keep ${g.payoffs[0][0].map((x: number) => fmt(x, 2)).join(", ")}; keep/give ${g.payoffs[0][1].map((x: number) => fmt(x, 2)).join(", ")}; give/keep ${g.payoffs[1][0].map((x: number) => fmt(x, 2)).join(", ")}; give/give ${g.payoffs[1][1].map((x: number) => fmt(x, 2)).join(", ")}. Dominant: row ${g.rowDominant}, column ${g.colDominant}. Welfare-maximizing: ${g.welfareMaximizing}. Prisoner's Dilemma: ${g.prisonersDilemma}.`);
  }
  L.push("", "## 2. Benchmarks on the same seeds", "");
  L.push("Model-free engine runs with the same paired schedules and payoff draws. The ex-ante first best maximizes expected welfare meeting by meeting over the engine's action space without using realized draws (H-H swap; one-way E->H gift; otherwise keep); it is a planner benchmark and not an equilibrium. The ex-post first best uses realized draws and is an omniscient upper bound.", "");
  L.push("| Study | Never transfer | Ex-ante first best | Ex-post first best | Always give |", "|---|---:|---:|---:|---:|");
  for (const [s, b] of Object.entries<any>(o.benchmarks)) L.push(`| ${s} | ${fmt(b["never-transfer"], 3)} | ${fmt(b["first-best-ex-ante"], 3)} | ${fmt(b["first-best-ex-post"], 3)} | ${fmt(b["always-give"], 3)} |`);

  L.push("", "## 3. Exact welfare accounting", "");
  L.push("Per arm: realized mean welfare, the same seeds' never-transfer welfare, and the share of the ex-ante feasible gain captured. Category contributions are per account (summed over meetings, divided by seeds x 8 accounts). The residual is realized minus expected, i.e. payoff-draw luck.", "");
  for (const [s, acc] of Object.entries<any>(o.accounting)) {
    L.push(`### ${s}`, "");
    L.push("| Arm | Welfare | Never | Gain | Share of ex-ante gain | HH:swap n / real. | EH:swap n / real. | E>H:gift n / real. | H>E:gift n / real. | H>H:gift n / real. | EE:swap n / real. |", "|---|---:|---:|---:|---:|---|---|---|---|---|---|");
    for (const [arm, a] of Object.entries<any>(acc.byArm)) {
      const c = (k: string) => `${a.categories[k].count} / ${fmt(a.categories[k].realizedPerAccount, 3)}`;
      L.push(`| ${arm} | ${fmt(a.meanWelfare, 3)} | ${fmt(a.neverTransferSameSeeds, 3)} | ${fmt(a.gainOverNeverTransfer, 3)} | ${fmt(a.shareOfExAnteFeasibleGain, 3)} | ${c("HH:swap")} | ${c("EH:swap")} | ${c("E>H:gift")} | ${c("H>E:gift")} | ${c("H>H:gift")} | ${c("EE:swap")} |`);
    }
    L.push("", "Decomposition of each arm's welfare difference from the reference arm into realized category contributions (accounting identity, not causal mediation):", "");
    for (const [name, d] of Object.entries<any>(acc.decomposition)) {
      const parts = Object.entries<any>(d.rows).filter(([, r]) => Math.abs(r.realizedDeltaPerAccount) >= 0.0005 || r.countDelta !== 0)
        .map(([k, r]) => `${k} ${r.countDelta >= 0 ? "+" : ""}${r.countDelta} (${r.realizedDeltaPerAccount >= 0 ? "+" : ""}${fmt(r.realizedDeltaPerAccount, 3)})`);
      L.push(`- **${name}**: welfare ${d.welfareDelta >= 0 ? "+" : ""}${fmt(d.welfareDelta, 4)} = sum of category deltas ${fmt(d.sumOfRealizedCategoryDeltas, 4)}; ${parts.join("; ")}.`);
    }
    L.push("");
  }
  L.push("Reviewer-specific arithmetic:", "");
  for (const [k, v] of Object.entries(o.reviewerChecks)) L.push(`- \`${k}\`: ${v}`);

  L.push("", "## 4. Joint proposals and the money funnel", "");
  L.push("Joint unconditional-give proposals per meeting (original model proposals; for E-H the first agent is Easy), with the local engine resolution of those proposals.", "");
  for (const [s, arms] of Object.entries<any>(o.joint)) {
    L.push(`### ${s}`, "", "| Arm | Pair | Meetings | Neither | Only first | Only second | Both | Local resolutions |", "|---|---|---:|---:|---:|---:|---:|---|");
    for (const [arm, rows] of Object.entries<any>(arms)) for (const r of rows) {
      L.push(`| ${arm} | ${r.pair} | ${r.meetings} | ${r.neither} | ${r.onlyFirst} | ${r.onlySecond} | ${r.both} | ${Object.entries(r.kinds).map(([k, v]) => `${k}: ${v}`).join(", ")} |`);
    }
    L.push("");
  }
  L.push("Bilateral E->H sale funnel with nested denominators: E-H meetings -> Hard buyer holds a mark -> Easy seller proposes a mark-contingent sale -> Hard buyer offers a mark -> proposals compatible -> executed.", "");
  L.push("| Study | Arm | E-H meetings | Buyer holds mark | Seller offers sale | Buyer offers mark | Compatible | Executed | Hard decisions holding a mark | Mark offers (any cell) |", "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const [s, arms] of Object.entries<any>(o.moneyFunnel.byStudyArm)) for (const [arm, f] of Object.entries<any>(arms)) {
    L.push(`| ${s} | ${arm} | ${f.ehMeetings} | ${f.hardHoldsMark} | ${f.sellerOffersSale} | ${f.buyerOffersMark} | ${f.bothCompatible} | ${f.executedSales} | ${f.hardDecisionsHoldingMark} | ${f.markOffersAnyCell} |`);
  }
  const t = o.moneyFunnel.totals;
  L.push("", `Across all 13 arms of the three studies: ${t.markOffersAnyCell} mark offers in ${t.hardDecisionsHoldingMark} Hard decisions taken while holding a mark; ${t.executedSales} executed sales.`, "");

  L.push("## 5. Fixed-state comparisons", "");
  L.push("At a decider's first meeting its prompt contains no post-treatment history: same round, role, inventories, score, and an empty memory. The reconstructed prompts are byte-identical across arms once the announcement is removed (asserted for every first meeting). Differences at these states are the announcement's direct effect at a fixed state, free of trajectory feedback. Rates use original model proposals; 'give' is an unconditional give. The closed-loop column is the seed-level difference over all decisions in the cell.", "");
  L.push(`First-meeting decisions per arm: ${Object.entries(o.fixedState.firstMeetingDecisionsPerArm).map(([s, n]) => `${s} ${n}`).join(", ")}.`, "");
  L.push("| Study | Arm vs reference | Cell | n | Arm give | Ref give | Arm-only / Ref-only | First-meeting diff [95% CI] | Closed-loop diff |", "|---|---|---|---:|---:|---:|---:|---|---:|");
  for (const c of o.fixedState.comparisons) for (const x of c.cells) {
    L.push(`| ${c.study} | ${c.arm} vs ${c.reference} | ${x.cell} | ${x.decisions} | ${fmt(x.armGiveRate, 3)} | ${fmt(x.referenceGiveRate, 3)} | ${x.armGivesReferenceKeeps} / ${x.referenceGivesArmKeeps} | ${fmt(x.seedMeanDifference, 3)} ${ci(x.bootstrap95)} | ${fmt(x.closedLoopSeedMeanDifference, 3)} |`);
  }
  L.push("", "Named-relation engagement in W-SGB, closed loop versus first decision. Delta is the seed-level named-relation rate minus neutral. The 0.25 value is the post-hoc descriptive screen used in X0; the threshold columns show where each conclusion would change.", "");
  L.push(`| Arm | Named relation | Closed-loop delta [95% CI] | First-decision delta [95% CI] | Closed loop clears (${[0.05, 0.1, 0.15, 0.2, 0.25, 0.3].join("/")}) | First decision clears |`, "|---|---|---|---|---|---|");
  for (const r of o.namedEngagement) {
    const mark = (c: any[]) => c.map(x => (x.clears ? "Y" : "n")).join("");
    L.push(`| ${r.arm} | ${r.namedRelation} | ${fmt(r.closedLoop.delta, 3)} ${ci(r.closedLoop.bootstrap95)} | ${fmt(r.firstDecision.delta, 3)} ${ci(r.firstDecision.bootstrap95)} | ${mark(r.closedLoop.clears)} | ${mark(r.firstDecision.clears)} |`);
  }
  L.push("", "Temperature-0 determinism across W-RG's byte-identical gift arms (decisions whose full prompt, including the announcement, is identical):", "");
  L.push("| Arm A | Arm B | Identical prompts | Identical proposals | Agreement | A gives, B keeps | B gives, A keeps | First-meeting identical / agreeing |", "|---|---|---:|---:|---:|---:|---:|---|");
  for (const d of o.determinism) L.push(`| ${d.armA} | ${d.armB} | ${d.identicalPrompts} | ${d.identicalProposals} | ${fmt(d.identicalProposals / d.identicalPrompts, 3)} | ${d.aGivesBKeeps} | ${d.bGivesAKeeps} | ${d.firstMeetingIdenticalPrompts} / ${d.firstMeetingIdenticalProposals} |`);
  L.push("", "Closed-loop dynamics (descriptive): unconditional-give rate by the decider's meeting ordinal within a run. Later ordinals condition on realized history.", "");
  L.push("| Study | Arm | Cell | 1st | 2nd | 3rd | 4th+ |", "|---|---|---|---|---|---|---|");
  for (const [s, rows] of Object.entries<any>(o.dynamics)) {
    const keys = [...new Set(rows.map((r: any) => `${r.arm}|${r.cell}`))] as string[];
    for (const k of keys) {
      const [arm, cell] = k.split("|");
      const cellsOut = ["1", "2", "3", "4+"].map(b => { const r = rows.find((x: any) => x.arm === arm && x.cell === cell && x.ordinal === b); return r && r.decisions ? `${fmt(r.rate, 2)} (${r.gives}/${r.decisions})` : "NA"; });
      L.push(`| ${s} | ${arm} | ${cell} | ${cellsOut.join(" | ")} |`);
    }
  }
  L.push("", "W-RG execution-filter audit: local resolution of the two original proposals versus the executed proposals, for every meeting touched by the filter.", "");
  for (const f of o.filterAudit) L.push(`- **${f.arm}**: ${f.blockedProposals} blocked proposals; ${Object.entries(f.transitions).map(([k, v]) => `${k}: ${v}`).join("; ")}.`);

  L.push("", "## 6. Supplementary inference", "");
  L.push("Labelled supplementary; the frozen gates are unchanged. `p(0)` is the frozen one-sided exact sign-flip p for H0: delta <= 0. `p(MRES)` tests H0: delta <= MRES by applying the same test to delta - MRES; Holm is within each W-SGB endpoint family. The lower end of the two-sided 95% percentile interval is a one-sided 97.5% lower bound. Leave-one-out is the range of the mean after dropping each seed.", "");
  L.push("| Family | Contrast | n | Mean | +/-/0 | Min seed | 95% CI | LB > MRES | p(0) | p(MRES) | Holm p(MRES) | LOO range |", "|---|---|---:|---:|---|---:|---|---|---:|---:|---:|---|");
  for (const [fam, es] of Object.entries<any>(o.inference)) for (const e of es) {
    L.push(`| ${fam} | ${e.name} | ${e.n} | ${fmt(e.mean, 4)} | ${e.positive}/${e.negative}/${e.ties} | ${fmt(e.minSeedDelta, 3)} | ${ci(e.bootstrap95)} | ${e.lowerBoundExceedsMres} | ${fmt(e.pZero, 6)} | ${fmt(e.pMres, 6)} | ${fmt(e.holmPMres, 6)} | [${fmt(e.leaveOneOutMin, 3)}, ${fmt(e.leaveOneOutMax, 3)}] |`);
  }
  L.push("", "## Boundary of interpretation", "");
  L.push("- Everything here is post hoc with respect to the frozen studies and adds no model evidence. The frozen verdicts and gates are unchanged.");
  L.push("- The welfare decomposition is an exact accounting identity, not a natural-mediation estimate: arms differ in which transactions occur because model behavior responds to history.");
  L.push("- First-meeting comparisons fix the decider's state but not the population's later trajectory; they identify the announcement's effect on the first decision, not the closed-loop policy.");
  L.push("- The fixed-state sample is the empty-history slice of the state space, so it is representative of first decisions, not of all states.");
  return `${L.join("\n")}\n`;
}

await main();
