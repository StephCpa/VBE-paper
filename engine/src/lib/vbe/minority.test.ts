import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { barter, kw } from "./robots.ts";
import { buildMinorityReport, saleSlice, slicesFor } from "./minority.ts";

describe("committed minority", () => {
  it("records hardHadChit on meetings so slices can filter", () => {
    const result = runPopulation(17, kw, DEFAULT_PARAMS, true);
    const all = saleSlice(result, DEFAULT_PARAMS.T);
    assert.ok(all.offers >= 2);
    assert.equal(all.acc, 1);
    const empty = slicesFor(result, [0, 1, 2, 3, 4, 5, 6, 7], DEFAULT_PARAMS.T);
    assert.equal(empty.llmSeller.offers, 0);
  });

  it("barter minority removes some KW-KW opportunities but remaining KW still sell", () => {
    const robotIds = [0, 1];
    const decide = (me: { id: number }, partner: { id: number }, t: number, T: number) =>
      (robotIds.includes(me.id) ? barter : kw)(me as never, partner as never, t, T);
    const result = runPopulation(17, decide, DEFAULT_PARAMS, true);
    const s = slicesFor(result, robotIds, DEFAULT_PARAMS.T);
    assert.ok(s.llmLlm.offers >= 1);
    assert.equal(s.llmLlm.acc, 1);
  });

  it("verdict UNDERPOWERED at n_seeds=1", () => {
    const run = (kind: "attack" | "seed", acc: number): never =>
      ({
        kind,
        condition: kind === "attack" ? "story" : "label",
        seed: 1,
        k: 2,
        robotIds: [0, 1],
        robotStrategy: kind === "attack" ? "barter" : "kw",
        calls: 0,
        parseFails: 0,
        apiFails: 0,
        meanScore: 0,
        all: { offers: 10, accepts: acc * 10, acc },
        llmSeller: { offers: 10, accepts: Math.round(acc * 10), acc },
        llmLlm: { offers: 8, accepts: Math.round(acc * 8), acc },
        result: { rounds: [], scores: [], meanScore: 0, heOffersInterior: 0, heAcceptsInterior: 0, heOffersEnd: 0, heAcceptsEnd: 0, accInterior: 0, accEnd: 0 },
      }) as never;
    const thin = buildMinorityReport([run("attack", 0.5), run("seed", 0)], {});
    assert.match(thin.verdict, /UNDERPOWERED/);
    const fat = buildMinorityReport(
      [
        ...Array.from({ length: 6 }, (_, i) => ({ ...(run("attack", 0.5) as object), seed: i })),
        ...Array.from({ length: 6 }, (_, i) => ({ ...(run("seed", 0) as object), seed: 10 + i })),
      ] as never,
      {},
    );
    assert.match(fat.verdict, /STORY-LOCKED/);
  });
});
