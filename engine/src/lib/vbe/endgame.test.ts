import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { altruist, kw } from "./robots.ts";
import { formSalePairs, reconstructAgentsAt, runEndgameProbeSync } from "./endgame.ts";
import { endowRound } from "./env.ts";
import { mulberry32 } from "./rng.ts";

describe("endgame probe", () => {
  it("KW refuses last-round sales on forced H–E pairs", () => {
    let hit = false;
    for (let seed = 1; seed <= 40; seed++) {
      const result = runPopulation(seed, kw, DEFAULT_PARAMS, true);
      const trial = runEndgameProbeSync({
        result,
        seed,
        condition: "label",
      });
      if (trial.kw.opportunities < 2) continue;
      hit = true;
      assert.equal(trial.kw.sells, 0);
      assert.equal(trial.kw.gifts, 0);
      break;
    }
    assert.equal(hit, true);
  });

  it("altruist gifts leftover checks instead of selling them", () => {
    let hit = false;
    for (let seed = 1; seed <= 40; seed++) {
      const result = runPopulation(seed, altruist, DEFAULT_PARAMS, true);
      const trial = runEndgameProbeSync({
        result,
        seed,
        condition: "label",
      });
      if (trial.altruist.opportunities < 2) continue;
      hit = true;
      assert.equal(trial.altruist.sells, 0);
      assert.ok(trial.altruist.gifts >= 1);
      break;
    }
    assert.equal(hit, true);
  });

  it("forced pairing only matches Hard-with-mark to Easy", () => {
    const result = runPopulation(3, kw, DEFAULT_PARAMS, true);
    const agents = reconstructAgentsAt(result, DEFAULT_PARAMS, DEFAULT_PARAMS.T - 1);
    endowRound(agents, DEFAULT_PARAMS, mulberry32(99));
    const pairs = formSalePairs(agents, mulberry32(100));
    for (const [i, j] of pairs) {
      const a = agents[i]!;
      const b = agents[j]!;
      const types = [a.type, b.type].sort().join("");
      assert.equal(types, "EH");
      const hard = a.type === "H" ? a : b;
      assert.ok(hard.chits >= 1);
    }
  });
});
