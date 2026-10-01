import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { kw } from "./robots.ts";
import {
  LAYER4_FEE,
  agentsForLastRound,
  buildLayer4Report,
  layer4Prompt,
  layer4Verdict,
  tallyLayer4,
  type Layer4Trial,
} from "./layer4.ts";

describe("layer 4 probe", () => {
  it("last-round prompt states the fee and that the game ends", () => {
    const result = runPopulation(3, kw, DEFAULT_PARAMS, true);
    const agents = agentsForLastRound(result, 3);
    const me = agents[0]!;
    const text = layer4Prompt(me, DEFAULT_PARAMS.T, DEFAULT_PARAMS, "story", "defense", LAYER4_FEE);
    assert.match(text, /LAST ROUND/);
    assert.match(text, /forfeit 1 score/);
    assert.match(text, /YES or NO/);
    assert.doesNotMatch(text, /giveCheck/);
  });

  it("verdict is NO L4 when almost nobody pays", () => {
    const trials: Layer4Trial[] = [];
    for (const condition of ["label", "story"] as const) {
      for (const question of ["commemorative", "defense"] as const) {
        for (let i = 0; i < 8; i++) {
          trials.push({
            condition,
            seed: 1,
            agentId: i,
            type: i % 2 ? "H" : "E",
            marks: i < 4 ? 1 : 0,
            question,
            answer: "NO",
          });
        }
      }
    }
    const v = layer4Verdict(tallyLayer4(trials));
    assert.match(v.verdict, /NO L4/);
  });

  it("verdict is LAYER 4 when only the story arm pays", () => {
    const trials: Layer4Trial[] = [];
    for (const condition of ["label", "story"] as const) {
      for (const question of ["commemorative", "defense"] as const) {
        for (let i = 0; i < 10; i++) {
          trials.push({
            condition,
            seed: 1,
            agentId: i,
            type: "E",
            marks: 0,
            question,
            answer: condition === "story" && i < 5 ? "YES" : "NO",
          });
        }
      }
    }
    const report = buildLayer4Report(trials);
    assert.match(report.verdict, /LAYER 4/);
    assert.equal(report.byCondition.story?.defense.rate, 0.5);
    assert.equal(report.byCondition.label?.defense.rate, 0);
  });
});
