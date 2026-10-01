import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import {
  accountRun, compareFixedState, moneyFunnel, payoffTable, replayRun, stageGames,
  type Decision, type FrozenRun, type StudyId,
} from "./welfare-review-x1.ts";

const SOURCES: Array<[StudyId, string, string]> = [
  ["W-CO", "src/data/welfare-crowding-out.json", "money-talk"],
  ["W-RG", "src/data/welfare-role-channel.json", "neutral-standard"],
  ["W-SGB", "src/data/welfare-semantic-boundary.json", "neutral"],
];
const stored = JSON.parse(readFileSync("src/data/welfare-review-x1.json", "utf8"));

it("derives the transaction identities the review asked for from the frozen engine", () => {
  const t = Object.fromEntries(payoffTable().map(r => [r.category, r]));
  assert.ok(Math.abs(t["EH:swap"]!.total - 1.33) < 1e-9);
  assert.ok(Math.abs(t["EH:swap"]!.giver + 0.5) < 1e-9 && Math.abs(t["EH:swap"]!.receiver - 1.83) < 1e-9);
  assert.ok(Math.abs(t["H>H:gift"]!.total - 1.37) < 1e-9);
  assert.ok(Math.abs(t["HH:swap"]!.total - 3.66) < 1e-9);
  assert.ok(Math.abs(t["E>H:gift"]!.total - 1.83) < 1e-9);
  assert.ok(Math.abs(t["H>E:gift"]!.total + 0.96) < 1e-9);
  assert.ok(Math.abs(t["EE:swap"]!.total + 1.0) < 1e-9);
});

it("identifies the H-H stage game as a strict Prisoner's Dilemma and E-H as dominant keep", () => {
  const [hh, eh] = stageGames();
  assert.equal(hh!.prisonersDilemma, true);
  assert.equal(hh!.rowDominant, "keep"); assert.equal(hh!.colDominant, "keep");
  assert.equal(hh!.welfareMaximizing, "H give, H give");
  assert.equal(eh!.rowDominant, "keep"); assert.equal(eh!.colDominant, "keep");
  assert.equal(eh!.welfareMaximizing, "E give, H keep");
});

it("replays every frozen run exactly and reconciles its welfare to the transaction decomposition", async () => {
  let runs = 0, decisions = 0;
  for (const [study, path] of SOURCES) {
    for (const run of JSON.parse(readFileSync(path, "utf8")).runs as FrozenRun[]) {
      const rep = await replayRun(study, run);
      assert.ok(rep.scoresMatch && rep.kindsMatch, `${study} ${run.arm} ${run.seed}`);
      assert.ok(accountRun(run).reconciles, `${study} ${run.arm} ${run.seed}`);
      runs += 1; decisions += rep.decisions.length;
    }
  }
  assert.equal(runs, 182);
  assert.equal(decisions, 2728 + 3680 + 7602); // equals the three studies' frozen target-call counts
});

it("locates the zero-sale outcome at the buyer: no Hard agent ever offers a mark", async () => {
  let holding = 0, offers = 0, sellerOffers = 0;
  for (const [study, path] of SOURCES) {
    const ds: Decision[] = [];
    for (const run of JSON.parse(readFileSync(path, "utf8")).runs as FrozenRun[]) ds.push(...(await replayRun(study, run)).decisions);
    const f = moneyFunnel(ds);
    holding += f.hardDecisionsHoldingMark; offers += f.markOffersAnyCell; sellerOffers += f.sellerOffersSale;
    assert.equal(f.executedSales, 0);
  }
  assert.equal(offers, 0);
  assert.equal(holding, 3443);
  assert.ok(sellerOffers > 1500);
});

it("finds byte-identical first-meeting states across every W-SGB arm once the announcement is removed", async () => {
  const ds: Decision[] = [];
  for (const run of JSON.parse(readFileSync(SOURCES[2]![1], "utf8")).runs as FrozenRun[]) ds.push(...(await replayRun("W-SGB", run)).decisions);
  for (const arm of ["gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"]) {
    assert.equal(compareFixedState("W-SGB", ds, arm, "neutral").firstMeetingStatesIdentical, true, arm);
  }
  const negative = compareFixedState("W-SGB", ds, "easy-easy-negative", "neutral").cells.find(c => c.cell === "H>H")!;
  assert.equal(negative.decisions, 18);
  assert.equal(negative.armGivesReferenceKeeps, 8);
  assert.equal(negative.referenceGivesArmKeeps, 0);
});

it("keeps the committed X1 artifact in sync with the code", () => {
  assert.equal(stored.modelCalls, 0);
  assert.equal(stored.moneyFunnel.totals.markOffersAnyCell, 0);
  assert.equal(stored.moneyFunnel.totals.hardDecisionsHoldingMark, 3443);
  assert.equal(stored.reviewerChecks.wsgbGiftExactHtoEGifts, 99);
  assert.equal(stored.reviewerChecks.wrgGiftStandardEHSwaps, 25);
  assert.equal(stored.effectCrossChecks, 21);
  for (const s of ["W-CO", "W-RG", "W-SGB"]) {
    const r = stored.replayChecks[s];
    assert.equal(r.scoresMatch, r.runs); assert.equal(r.reconcile, r.runs);
  }
});
