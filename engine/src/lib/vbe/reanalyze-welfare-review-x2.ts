/**
 * Generates the X2 zero-call boundary audit from frozen W-CO, W-RG and W-SGB
 * artifacts. No model or API call is made; no frozen file is modified.
 *
 *   node --experimental-strip-types src/lib/vbe/reanalyze-welfare-review-x2.ts
 *
 * Writes src/data/welfare-review-x2.json and src/data/welfare-review-x2.md.
 * Output is deterministic (fixed bootstrap seed, no wall-clock fields).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { replayRun, sha256, type Decision, type FrozenRun, type StudyId } from "./welfare-review-x1.ts";
import {
  BOOT_SAMPLES, BOOT_SEED, X2_VERSION,
  accountingWithCI, afterLoss, discrepancyTest, encounterTable, endgame, firstInCellSplit, historyAtRound, withContext,
  type ContextDecision, type Rate,
} from "./welfare-review-x2.ts";

const STUDIES: Array<{ study: StudyId; path: string }> = [
  { study: "W-CO", path: "src/data/welfare-crowding-out.json" },
  { study: "W-RG", path: "src/data/welfare-role-channel.json" },
  { study: "W-SGB", path: "src/data/welfare-semantic-boundary.json" },
];

/** Standard-execution gift arm of each study (the arms whose prompts carry the gift text and whose execution is unmodified). */
const GIFT: Record<StudyId, string> = { "W-CO": "gift-talk", "W-RG": "gift-standard", "W-SGB": "gift-exact" };
const isGiftStd = (x: Decision) => x.arm === GIFT[x.study as StudyId];
const isNeutral = (x: Decision) => (x.study === "W-RG" && x.arm === "neutral-standard") || (x.study === "W-SGB" && x.arm === "neutral");
const isHarmful = (x: Decision) => x.study === "W-SGB" && x.arm === "easy-easy-negative";

const r4 = (x: number) => (Number.isFinite(x) ? Number(x.toFixed(4)) : x);
const rci = (c: [number, number] | null) => (c ? [r4(c[0]), r4(c[1])] as [number, number] : null);

function roundDeep(o: any): any {
  if (typeof o === "number") return r4(o);
  if (Array.isArray(o)) return o.map(roundDeep);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, roundDeep(v)]));
  return o;
}

async function main(): Promise<void> {
  const sources: Record<string, string> = {};
  const runsBy = new Map<StudyId, FrozenRun[]>();
  const all: ContextDecision[] = [];
  for (const { study, path } of STUDIES) {
    const text = readFileSync(path, "utf8");
    sources[path] = sha256(text);
    const runs = JSON.parse(text).runs as FrozenRun[];
    runsBy.set(study, runs);
    const ds: Decision[] = [];
    for (const run of runs) {
      const rep = await replayRun(study, run);
      if (!rep.scoresMatch || !rep.kindsMatch) throw new Error(`${study} ${run.arm} ${run.seed}: replay mismatch`);
      ds.push(...rep.decisions);
    }
    all.push(...withContext(ds, runs));
  }

  // ---- 1. endgame ----------------------------------------------------------
  const endgameRows = [
    ["W-SGB", "gift-exact", "H>H"], ["W-SGB", "gift-exact", "H>E"], ["W-SGB", "gift-exact", "E>H"],
    ["W-SGB", "gift-any-holder", "H>H"], ["W-SGB", "gift-hard-partner-only", "H>H"],
    ["W-SGB", "neutral", "H>H"], ["W-SGB", "easy-easy-negative", "H>H"], ["W-SGB", "easy-easy-negative", "E>E"],
    ["W-RG", "gift-standard", "H>H"], ["W-RG", "neutral-standard", "H>H"],
    ["W-CO", "gift-talk", "H>H"], ["W-CO", "money-talk", "H>H"],
  ] as const;
  const endgames = [
    endgame(all, "Gift (standard execution), three studies pooled", isGiftStd, "H>H"),
    endgame(all, "Gift (standard execution), three studies pooled", isGiftStd, "E>H"),
    endgame(all, "Neutral, W-RG and W-SGB pooled", isNeutral, "H>H"),
    ...endgameRows.map(([s, a, c]) => endgame(all, `${s} ${a}`, x => x.study === s && x.arm === a, c)),
  ];
  const firstInCell = [
    firstInCellSplit(all, "Gift (standard execution), three studies pooled", isGiftStd, "E>H"),
    ...(["W-CO", "W-RG", "W-SGB"] as StudyId[]).map(s => firstInCellSplit(all, `${s} ${GIFT[s]}`, x => x.study === s && x.arm === GIFT[s], "E>H")),
  ];

  // ---- 2. first versus prior meeting at exact rounds ------------------------
  const history = [
    historyAtRound(all, "Gift (standard execution), three studies", isGiftStd, "E>H", Object.values(GIFT)),
    historyAtRound(all, "Gift exact, W-SGB", x => x.study === "W-SGB" && x.arm === "gift-exact", "E>H", ["gift-exact"]),
    historyAtRound(all, "Gift (standard execution), three studies", isGiftStd, "H>E", Object.values(GIFT)),
    historyAtRound(all, "Gift (standard execution), three studies", isGiftStd, "H>H", Object.values(GIFT)),
    historyAtRound(all, "Neutral, W-RG and W-SGB", isNeutral, "H>H", ["neutral-standard", "neutral"]),
  ];

  // ---- 3. after an unreciprocated transfer ----------------------------------
  const losses = [
    afterLoss(all, "Gift (standard execution), three studies", isGiftStd),
    afterLoss(all, "Gift exact, W-SGB", x => x.study === "W-SGB" && x.arm === "gift-exact"),
    afterLoss(all, "Harmful E-E, W-SGB", isHarmful),
    afterLoss(all, "Neutral, W-RG and W-SGB", isNeutral),
  ];

  // ---- 4. encounter tables ----------------------------------------------------
  const encounters = [
    ...(["W-CO", "W-RG", "W-SGB"] as StudyId[]).flatMap(s => [
      encounterTable(all, s, GIFT[s], "E>H", "account meeting index", true),
      encounterTable(all, s, GIFT[s], "E>H", "index within directed cell", true),
    ]),
  ];
  const sgbCurves = ([
    ["gift-exact", "H>H"], ["gift-exact", "H>E"], ["gift-exact", "E>H"], ["gift-exact", "E>E"],
    ["easy-easy-negative", "E>E"], ["easy-easy-negative", "H>H"], ["easy-easy-negative", "H>E"],
    ["neutral", "H>H"], ["neutral", "H>E"], ["neutral", "E>H"], ["neutral", "E>E"],
  ] as const).map(([a, c]) => encounterTable(all, "W-SGB", a, c, "account meeting index", true));

  // ---- 5a. accounting with per-component intervals ---------------------------
  const accounting = [
    accountingWithCI(runsBy.get("W-SGB")!, "W-SGB", "gift-exact", "neutral"),
    accountingWithCI(runsBy.get("W-RG")!, "W-RG", "gift-standard", "neutral-standard"),
    accountingWithCI(runsBy.get("W-SGB")!, "W-SGB", "easy-easy-negative", "neutral"),
  ];

  // ---- 5b. seed-clustered discrepancy tests -----------------------------------
  const firstState = (a: Decision, b: Decision) => a.firstMeeting && b.firstMeeting && a.strippedHash === b.strippedHash;
  const samePrompt = (a: Decision, b: Decision) => a.fullHash === b.fullHash;
  const discrepancies = {
    firstDecision: [
      discrepancyTest("W-SGB gift exact vs neutral, E->H (named)", all, "gift-exact", "neutral", firstState, "E>H"),
      discrepancyTest("W-SGB gift exact vs neutral, H->H", all, "gift-exact", "neutral", firstState, "H>H"),
      discrepancyTest("W-SGB gift exact vs neutral, H->E", all, "gift-exact", "neutral", firstState, "H>E"),
      discrepancyTest("W-SGB harmful E-E vs neutral, H->H", all, "easy-easy-negative", "neutral", firstState, "H>H"),
      discrepancyTest("W-SGB money exact vs neutral, H->H", all, "money-exact", "neutral", firstState, "H>H"),
      discrepancyTest("W-RG gift vs neutral, E->H (named)", all, "gift-standard", "neutral-standard", firstState, "E>H"),
      discrepancyTest("W-RG gift vs neutral, H->H", all, "gift-standard", "neutral-standard", firstState, "H>H"),
      discrepancyTest("W-CO gift vs money, E->H (named)", all, "gift-talk", "money-talk", firstState, "E>H"),
      discrepancyTest("W-CO gift vs money, H->H", all, "gift-talk", "money-talk", firstState, "H>H"),
    ],
    samePromptNoise: [
      discrepancyTest("W-RG gift-standard vs gift-hh-blocked", all, "gift-standard", "gift-hh-blocked", samePrompt),
      discrepancyTest("W-RG gift-standard vs gift-eh-gift-blocked", all, "gift-standard", "gift-eh-gift-blocked", samePrompt),
      discrepancyTest("W-RG gift-hh-blocked vs gift-eh-gift-blocked", all, "gift-hh-blocked", "gift-eh-gift-blocked", samePrompt),
    ],
  };

  const out = roundDeep({
    analysis: "VBE-X2-ZERO-CALL-BOUNDARY-AUDIT",
    version: X2_VERSION,
    status: "POST-HOC ZERO-CALL DESCRIPTIVE REANALYSIS OF FROZEN TRACES — SUPPLEMENTARY; NOT A PROSPECTIVE CLAIM",
    modelCalls: 0,
    sources,
    bootstrap: { samples: BOOT_SAMPLES, seed: BOOT_SEED, unit: "seed (resampled with replacement within study)" },
    decisions: all.length,
    endgame: endgames,
    historyAtExactRound: history,
    afterUnreciprocatedTransfer: losses,
    encounterIndex: encounters,
    firstInCell,
    wsgbCurves: sgbCurves,
    accounting,
    discrepancies,
  });
  void rci;
  writeFileSync("src/data/welfare-review-x2.json", `${JSON.stringify(out, null, 2)}\n`);
  writeFileSync("src/data/welfare-review-x2.md", renderMarkdown(out));
  console.log(`X2 written: ${all.length} decisions from ${[...runsBy.values()].reduce((s, r) => s + r.length, 0)} replayed runs, 0 model calls.`);
}

const f = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "NA" : x.toFixed(d));
const c = (ci: [number, number] | null | undefined, d = 2) => (ci ? `[${f(ci[0], d)}, ${f(ci[1], d)}]` : "NA");
const kr = (r: Rate) => (r.decisions ? `${f(r.rate)} (${r.gives}/${r.decisions}; ${r.seeds} seeds)` : "— (0/0)");

function renderMarkdown(o: any): string {
  const L: string[] = [];
  L.push("# X2 zero-call boundary audit", "");
  L.push(`**Zero model/API calls.** Post-hoc, descriptive reanalysis of the frozen W-CO, W-RG and W-SGB traces, replayed exactly through the frozen engine by X1. Version ${o.version}. ${o.decisions} decisions. Every interval resamples whole seeds (${o.bootstrap.samples} percentile-bootstrap resamples, seed ${o.bootstrap.seed}, stratified by study); a decision or meeting is never treated as an independent unit. History, round and partner are not randomized, so nothing here identifies a mechanism.`, "");
  L.push("Source SHA-256:", "");
  for (const [p, h] of Object.entries(o.sources)) L.push(`- \`${p}\`: \`${h}\``);

  L.push("", "## 1. Endgame by exact round", "");
  L.push("Rates are unconditional-give rates in the directed cell. Rounds are calendar rounds (the prompt states `Round t of 24`). For symmetric cells, final-round meetings and meetings in which both gave are also counted, because the two decisions in one meeting are not independent. `Final − earlier` is the pooled final-round rate minus the pooled rate in rounds 1–23, with a seed-cluster bootstrap interval.", "");
  L.push("| Selection | Cell | Final round (t=24) | Meetings / both gave | Rounds 22–24 | Rounds 1–21 | Rounds 1–8 | Final − earlier [95% CI] |", "|---|---|---|---|---|---|---|---|");
  for (const e of o.endgame) {
    L.push(`| ${e.label} | ${e.cell} | ${kr(e.final)} | ${e.final.meetings} / ${e.final.bothGaveMeetings ?? "—"} | ${kr(e.lastThree)} | ${kr(e.rounds1to21)} | ${kr(e.rounds1to8)} | ${f(e.finalMinusEarlier)} ${c(e.finalMinusEarlierCI)} |`);
  }
  L.push("", "Stage-game arithmetic for a Hard agent in an H–H meeting (Table 2 of the paper): keeping instead of giving gains 3.29 − 2.79 = 0.50 when the partner gives and 0.96 − 0 = 0.96 when the partner keeps. In the final round no future meeting remains.", "");

  L.push("## 2. First meeting versus prior meeting at the same exact round", "");
  L.push("Round 1 cannot contain history, so a comparison that pools first meetings over rounds 1–2 against prior-meeting decisions (which exist only in round 2) mixes a round contrast into the history contrast. The rows below compare the two groups within each exact round, and a Mantel–Haenszel round-standardized risk difference pools rounds 2–6 within study (weights n_first·n_prior/(n_first+n_prior)). First meeting = the account's first meeting of the run (empty memory); prior meeting = at least one earlier meeting in any role.", "");
  for (const h of o.historyAtExactRound) {
    L.push(`### ${h.cell}, ${h.label}`, "");
    L.push(`- Pooled rounds 1–2 (confounded by round): first ${kr(h.pooledRounds12.first)} vs prior ${kr(h.pooledRounds12.prior)}; difference ${f(h.pooledRounds12.difference)}.`);
    L.push(`- Round-standardized (rounds 2–${h.standardized.maxRound}): difference ${f(h.standardized.difference)} ${c(h.standardized.ci)}; ${h.standardized.firstDecisions} first-meeting and ${h.standardized.priorDecisions} prior-meeting decisions.`, "");
    L.push("| Round | First meeting | Prior meeting | Difference |", "|---:|---|---|---:|");
    for (const r of h.exactRounds) L.push(`| ${r.t} | ${kr(r.first)} | ${kr(r.prior)} | ${f(r.difference)} |`);
    L.push("");
  }

  L.push("## 3. Giving after an unreciprocated transfer", "");
  L.push("An unreciprocated transfer is a meeting in which the account's check moved and it received none (as shown in its own memory). Agents are randomly rematched each round, and the prompt shows partner ids in the agent's last four meetings, so giving toward a new partner after a loss is not a test of retaliation against the partner who failed to reciprocate. Rows are not mutually exclusive.", "");
  for (const a of o.afterUnreciprocatedTransfer) {
    L.push(`### ${a.cell}, ${a.label}`, "", "| Condition | Give rate (k/n; seeds) | 95% CI |", "|---|---|---|");
    for (const r of a.rows) L.push(`| ${r.condition} | ${kr(r)} | ${c(r.ci)} |`);
    L.push("");
  }

  L.push("## 4. Named E→H gift by encounter index, two definitions", "");
  L.push("`account meeting index` counts every meeting of the account in the run, in any role (roles are redrawn each round, so the n-th meeting may be in a different role from the first). `index within directed cell` counts only the account's meetings as an Easy decider facing a Hard partner. Bin `2+` pools every later encounter. R2 §4.3 reported first → second meeting under the first definition; first → all later meetings is the `2+` column.", "");
  L.push("| Study | Arm | Definition | 1st | 2nd | 3rd | 4th+ | 2nd and later |", "|---|---|---|---|---|---|---|---|");
  for (const t of o.encounterIndex) L.push(`| ${t.study} | ${t.arm} | ${t.definition} | ${t.bins.map((b: any) => kr(b)).join(" | ")} |`);
  L.push("", "First decision in the named cell, split by whether it is also the account's first meeting of the run (pooled rate, seed-cluster 95% interval):", "");
  L.push("| Selection | Cell | First meeting of the run | First E→H decision after a meeting in another role | Later E→H decisions |", "|---|---|---|---|---|");
  for (const r of o.firstInCell) L.push(`| ${r.label} | ${r.cell} | ${kr(r.firstMeeting)} ${c(r.firstMeeting.ci)} | ${kr(r.firstInCellAfterOtherRole)} ${c(r.firstInCellAfterOtherRole.ci)} | ${kr(r.laterInCell)} ${c(r.laterInCell.ci)} |`);
  L.push("", "W-SGB curves used by Figure 2B and its supplementary companion (account meeting index; pooled rate with seed-cluster 95% interval):", "");
  L.push("| Arm | Cell | 1st | 2nd | 3rd | 4th+ |", "|---|---|---|---|---|---|");
  for (const t of o.wsgbCurves) L.push(`| ${t.arm} | ${t.cell} | ${t.bins.slice(0, 4).map((b: any) => `${kr(b)} ${c(b.ci)}`).join(" | ")} |`);

  L.push("", "## 5. Seed-clustered uncertainty", "", "### Realized welfare accounting with per-component intervals", "");
  L.push("Per seed, each component is the realized contribution difference (arm − reference) summed over meetings and divided by 8 accounts; intervals bootstrap the seed-level values. Components are computed from unrounded values; rounding each to two decimals can make the displayed parts differ from the displayed total.", "");
  for (const a of o.accounting) {
    L.push(`**${a.study}: ${a.arm} − ${a.reference}** (sum of unrounded components ${f(a.componentSum, 4)}; sum of rounded components ${f(a.roundedComponentSum)}; net ${f(a.net.mean, 4)})`, "");
    L.push("| Component | Mean per account | 95% CI | Seeds +/− |", "|---|---:|---|---|");
    for (const r of [...a.components, a.net]) L.push(`| ${r.group} | ${f(r.mean, 3)} | ${c(r.ci, 3)} | ${r.positiveSeeds}/${r.negativeSeeds} of ${r.seeds} |`);
    L.push("");
  }
  L.push("### One-directional discrepancies, seed as unit", "");
  L.push("Decisions are paired across arms by (seed, round, agent). First-decision pairs require identical prompts once the announcement is removed; same-prompt pairs require identical full prompts (the W-RG gift arms share the announcement). The seed-level statistic is (A gives & B keeps − B gives & A keeps) / matched pairs in that seed; p is the exact two-sided sign-flip p over seeds. W-CO's reference is the money announcement, so its rows are gift − money, not gift − neutral, and are not pooled with the others.", "");
  L.push("| Comparison | Pairs | A-only / B-only | Seeds | Seed-mean net rate [95% CI] | Two-sided p |", "|---|---:|---|---:|---|---:|");
  for (const d of [...o.discrepancies.firstDecision, ...o.discrepancies.samePromptNoise]) {
    L.push(`| ${d.label} | ${d.pairs} | ${d.aOnly} / ${d.bOnly} | ${d.seeds} | ${f(d.seedMeanNetRate, 3)} ${c(d.ci, 3)} | ${f(d.pTwoSided, 5)} |`);
  }
  L.push("", "## Boundary of interpretation", "");
  L.push("- Everything here is post hoc and descriptive. Later meetings condition on realized history; round, history, partner identity and own prior action are correlated and none is randomized.");
  L.push("- Endgame persistence is inconsistent with an account in which giving is sustained only by future incentives and final-round best responses; it does not identify what sustains giving.");
  L.push("- Within-round first-versus-prior comparisons remove the round confound in the pooled comparison, but prior meetings also change scores, own prior actions and other prompt content. Identifying a memory effect requires a fixed-state memory intervention (Protocol B2).");
  L.push("- Giving toward a new partner after an unreciprocated transfer does not test retaliation against the partner who failed to reciprocate; same-partner cases are reported separately and are few.");
  return `${L.join("\n")}\n`;
}

await main();
