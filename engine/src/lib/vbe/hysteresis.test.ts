import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { kw } from "./robots.ts";
import {
  MARK_SHOCK,
  buildHysteresisReport,
  hysteresisLabel,
  hysteresisWindows,
  robotHysteresis,
} from "./hysteresis.ts";

describe("hysteresis", () => {
  it("KW robot rebounds after mark confiscation", () => {
    let hit = false;
    for (let seed = 1; seed <= 80; seed++) {
      const result = runPopulation(seed, kw, DEFAULT_PARAMS, true, MARK_SHOCK);
      const w = hysteresisWindows(result);
      if (w.pre.offers < 2 || w.post.offers < 2) continue;
      hit = true;
      assert.equal(w.shock.offers, 0);
      assert.ok(w.pre.acc >= 0.5, `pre acc ${w.pre.acc}`);
      assert.ok(w.post.acc >= 0.5, `post acc ${w.post.acc}`);
      assert.equal(hysteresisLabel(w.pre, w.post), "REBOUND");
      break;
    }
    assert.equal(hit, true);
  });

  it("robot table marks KW as REBOUND and barter as not using marks", () => {
    const robot = robotHysteresis();
    assert.equal(robot.kw.label, "REBOUND");
    assert.equal(robot.barter.pre.acc, 0);
    assert.equal(robot.barter.post.acc, 0);
    const report = buildHysteresisReport([], robot);
    assert.equal(report.verdict, "incomplete");
  });

  it("withdraws pooled rebound when per-seed labels disagree", () => {
    const robot = robotHysteresis();
    const stub = (seed: number, label: "WEAK" | "COLLAPSE") =>
      ({
        condition: "story",
        seed,
        calls: 0,
        parseFails: 0,
        apiFails: 0,
        pre: { offers: 4, accepts: 2, acc: 0.5 },
        shock: { offers: 0, accepts: 0, acc: 0 },
        post: { offers: 4, accepts: label === "COLLAPSE" ? 0 : 1, acc: label === "COLLAPSE" ? 0 : 0.25 },
        meanScore: 58,
        label,
        result: {
          scores: [],
          meanScore: 58,
          heOffersInterior: 0,
          heAcceptsInterior: 0,
          heOffersEnd: 0,
          heAcceptsEnd: 0,
          accInterior: 0,
          accEnd: 0,
          rounds: [],
        },
      }) as never;
    const report = buildHysteresisReport([stub(17, "WEAK"), stub(41, "COLLAPSE")], robot);
    assert.match(report.verdict, /UNDERDETERMINED/);
  });
});
