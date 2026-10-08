import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, it } from "node:test";
import { replayRun, type Decision, type FrozenRun, type StudyId } from "./welfare-review-x1.ts";
import { accountingWithCI, afterLoss, rateOf, withContext, type ContextDecision } from "./welfare-review-x2.ts";

const SOURCES: Array<[StudyId, string]> = [
  ["W-CO", "src/data/welfare-crowding-out.json"],
  ["W-RG", "src/data/welfare-role-channel.json"],
  ["W-SGB", "src/data/welfare-semantic-boundary.json"],
];
const GIFT: Record<string, string> = { "W-CO": "gift-talk", "W-RG": "gift-standard", "W-SGB": "gift-exact" };
const stored = JSON.parse(readFileSync("src/data/welfare-review-x2.json", "utf8"));
const runsBy = new Map<StudyId, FrozenRun[]>();
let all: ContextDecision[] = [];

before(async () => {
  for (const [study, path] of SOURCES) {
    const runs = JSON.parse(readFileSync(path, "utf8")).runs as FrozenRun[];
    runsBy.set(study, runs);
    const ds: Decision[] = [];
    for (const run of runs) ds.push(...(await replayRun(study, run)).decisions);
    all.push(...withContext(ds, runs));
  }
});

it("derives meeting indices consistent with the replayed agent memory", () => {
  assert.equal(all.length, 14010);
  for (const x of all) {
    assert.equal(x.firstMeeting, x.meetingIndex === 1, `${x.study} ${x.arm} ${x.seed} t=${x.t} id=${x.id}`);
    assert.equal(x.history.length, x.meetingIndex - 1);
    if (x.prev) assert.ok(x.prev.t < x.t);
    assert.ok(x.cellIndex <= x.meetingIndex);
  }
});

it("separates the round-confounded pooled history contrast from the exact-round contrast", () => {
  const gift = all.filter(x => x.arm === GIFT[x.study] && x.cell === "E>H");
  // Round 1 cannot carry history.
  assert.equal(gift.filter(x => x.t === 1 && x.meetingIndex > 1).length, 0);
  const pooledFirst = rateOf(gift.filter(x => x.t <= 2 && x.meetingIndex === 1));
  const priorR2 = rateOf(gift.filter(x => x.t === 2 && x.meetingIndex > 1));
  const firstR2 = rateOf(gift.filter(x => x.t === 2 && x.meetingIndex === 1));
  assert.deepEqual([pooledFirst.gives, pooledFirst.decisions], [41, 81]);
  assert.deepEqual([priorR2.gives, priorR2.decisions], [1, 20]);
  assert.deepEqual([firstR2.gives, firstR2.decisions], [13, 29]);
});

it("reports endgame H-H giving with meetings, not only decisions, as units", () => {
  const fin = all.filter(x => x.arm === GIFT[x.study] && x.cell === "H>H" && x.t === 24);
  assert.deepEqual([rateOf(fin).gives, rateOf(fin).decisions], [27, 30]);
  const meetings = new Set(fin.map(x => `${x.study}|${x.seed}|${Math.min(x.id, x.partnerId)}`));
  assert.equal(meetings.size, 15);
});

it("splits giving after an unreciprocated transfer by where the loss occurred", () => {
  const gift = afterLoss(all, "gift", x => x.arm === GIFT[x.study]).rows;
  const row = (name: string) => gift.find(r => r.condition.trim() === name)!;
  assert.deepEqual([row("previous meeting: unreciprocated own transfer").gives, row("previous meeting: unreciprocated own transfer").decisions], [94, 106]);
  assert.deepEqual([row("same cell, new partner").gives, row("same cell, new partner").decisions], [9, 14]);
  const harmful = afterLoss(all, "harmful", x => x.study === "W-SGB" && x.arm === "easy-easy-negative").rows;
  const h = harmful.find(r => r.condition === "previous meeting: unreciprocated own transfer")!;
  assert.deepEqual([h.gives, h.decisions], [7, 19]);
});

it("keeps every accounting component summing to the net welfare difference", () => {
  const a = accountingWithCI(runsBy.get("W-SGB")!, "W-SGB", "gift-exact", "neutral");
  assert.ok(Math.abs(a.componentSum - a.net.mean) < 1e-9);
  assert.ok(Math.abs(a.net.mean - 2.0625) < 1e-9);
  assert.equal(a.roundedComponentSum, 2.07); // why the figure needs a rounding note
});

it("keeps the committed X2 artifact in sync with the code", () => {
  assert.equal(stored.modelCalls, 0);
  assert.equal(stored.decisions, 14010);
  const pooled = stored.endgame.find((e: any) => e.label.startsWith("Gift") && e.cell === "H>H");
  assert.deepEqual([pooled.final.gives, pooled.final.decisions, pooled.final.meetings, pooled.final.bothGaveMeetings], [27, 30, 15, 13]);
  const named = stored.endgame.find((e: any) => e.label.startsWith("Gift") && e.cell === "E>H");
  assert.deepEqual([named.final.gives, named.final.decisions], [4, 31]);
  const hist = stored.historyAtExactRound[0];
  assert.equal(hist.cell, "E>H");
  assert.ok(hist.standardized.ci[0] > 0);
  for (const d of stored.discrepancies.samePromptNoise) assert.ok(d.ci[0] < 0 && d.ci[1] > 0, d.label);
  for (const d of stored.discrepancies.firstDecision) assert.ok(d.ci[0] > 0 || d.ci[1] < 0, d.label);
});
