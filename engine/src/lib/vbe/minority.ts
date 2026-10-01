import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { runPopulation } from "./env.ts";
import { STRATEGIES } from "./robots.ts";
import type { Meeting, RunResult } from "./types.ts";
import type { PromptCondition } from "./prompts.ts";

export const MINORITY_K = 2;

export type SaleSlice = { offers: number; accepts: number; acc: number };

export type MinorityKind = "attack" | "seed";

export type MinorityRun = {
  kind: MinorityKind;
  condition: PromptCondition;
  seed: number;
  k: number;
  robotIds: number[];
  robotStrategy: "barter" | "kw";
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  all: SaleSlice;
  llmSeller: SaleSlice;
  llmLlm: SaleSlice;
  result: RunResult;
};

export type MinorityReport = {
  model: string;
  k: number;
  n: number;
  baselineStoryInterior: number;
  robotMix: Record<string, SaleSlice>;
  runs: MinorityRun[];
  attack: SaleSlice | null;
  seed: SaleSlice | null;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

export function heIds(m: Meeting): { hardId: number; easyId: number } | null {
  const he =
    (m.iType === "H" && m.jType === "E") || (m.iType === "E" && m.jType === "H");
  if (!he) return null;
  return {
    hardId: m.iType === "H" ? m.i : m.j,
    easyId: m.iType === "E" ? m.i : m.j,
  };
}

export function saleSlice(
  result: RunResult,
  T: number,
  pred: (easyId: number, hardId: number) => boolean = () => true,
): SaleSlice {
  let offers = 0;
  let accepts = 0;
  for (const snap of result.rounds) {
    if (snap.t === T) continue;
    for (const m of snap.meetings) {
      const ids = heIds(m);
      if (!ids) continue;
      if (!m.hardHadChit || !m.easyHadCheck) continue;
      if (!pred(ids.easyId, ids.hardId)) continue;
      offers += 1;
      if (m.kind === "chit-for-check" && m.seller === ids.easyId) accepts += 1;
    }
  }
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function giftSlice(
  result: RunResult,
  T: number,
  pred: (easyId: number, hardId: number) => boolean = () => true,
): SaleSlice {
  let offers = 0;
  let accepts = 0;
  for (const snap of result.rounds) {
    if (snap.t === T) continue;
    for (const m of snap.meetings) {
      const ids = heIds(m);
      if (!ids) continue;
      if (!m.easyHadCheck) continue;
      if (!pred(ids.easyId, ids.hardId)) continue;
      offers += 1;
      if (m.kind === "gift" && m.seller === ids.easyId) accepts += 1;
    }
  }
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function slicesFor(result: RunResult, robotIds: number[], T = DEFAULT_PARAMS.T) {
  const robots = new Set(robotIds);
  const isLlm = (id: number) => !robots.has(id);
  return {
    all: saleSlice(result, T),
    llmSeller: saleSlice(result, T, (easy) => isLlm(easy)),
    llmLlm: saleSlice(result, T, (easy, hard) => isLlm(easy) && isLlm(hard)),
  };
}

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function robotMixBaselines(params: VbeParams = DEFAULT_PARAMS) {
  const out: MinorityReport["robotMix"] = {};
  const k = MINORITY_K;
  const robotIds = Array.from({ length: k }, (_, i) => i);
  const seeds = [17, 29, 41];
  const mixed = (name: "attackMix" | "seedMix") => {
    const slices = seeds.map((seed) => {
      const decide = (
        me: { id: number },
        partner: { id: number },
        t: number,
        T: number,
      ) => {
        const fn =
          robotIds.includes(me.id)
            ? name === "attackMix"
              ? STRATEGIES.barter
              : STRATEGIES.kw
            : name === "attackMix"
              ? STRATEGIES.kw
              : STRATEGIES.barter;
        return fn(me as never, partner as never, t, T);
      };
      const result = runPopulation(seed, decide, params, true);
      return slicesFor(result, robotIds, params.T).llmLlm;
    });
    return pool(slices);
  };
  out["6kw+2barter llm-llm"] = mixed("attackMix");
  out["6barter+2kw llm-llm"] = mixed("seedMix");
  out["8kw"] = pool(
    seeds.map((s) => saleSlice(runPopulation(s, STRATEGIES.kw, params, true), params.T)),
  );
  return out;
}

export const MIN_SEEDS_FOR_VERDICT = 6;

export function buildMinorityReport(
  runs: MinorityRun[],
  robotMix: MinorityReport["robotMix"],
  baselineStoryInterior = 0.4375,
): MinorityReport {
  const attackRuns = runs.filter((r) => r.kind === "attack");
  const seedRuns = runs.filter((r) => r.kind === "seed");
  const attack = attackRuns.length ? pool(attackRuns.map((r) => r.llmSeller)) : null;
  const seed = seedRuns.length ? pool(seedRuns.map((r) => r.llmSeller)) : null;

  const holds = (s: SaleSlice | null) => s && s.offers >= 2 && s.acc >= 0.3;
  const kills = (s: SaleSlice | null) => s && s.offers >= 2 && s.acc < 0.15;

  const notes = [
    `k=${MINORITY_K}/${DEFAULT_PARAMS.n} committed robots (ids 0..${MINORITY_K - 1}).`,
    `Baseline story interior ${baselineStoryInterior.toFixed(2)}.`,
    `Unit is the seed, not the pooled offer. Attack n=${attackRuns.length}, seed n=${seedRuns.length}.`,
  ];
  if (attack) {
    notes.push(
      `Attack per-seed LLM-seller ${attackRuns.map((r) => `${r.seed}:${r.llmSeller.accepts}/${r.llmSeller.offers}`).join(", ")} pooled ${attack.accepts}/${attack.offers} (${attack.acc.toFixed(2)}).`,
    );
  }
  if (seed) {
    notes.push(
      `Seed per-seed LLM-seller ${seedRuns.map((r) => `${r.seed}:${r.llmSeller.accepts}/${r.llmSeller.offers}`).join(", ")} pooled ${seed.accepts}/${seed.offers} (${seed.acc.toFixed(2)}).`,
    );
  }

  let verdict = "incomplete";
  const thin = attackRuns.length < MIN_SEEDS_FOR_VERDICT || seedRuns.length < MIN_SEEDS_FOR_VERDICT;
  if (attack && seed && thin) {
    verdict =
      "UNDERPOWERED — attack vs baseline is no detectable effect at n_seeds≤2; seed-arm 0 is consistent with no contagion but cannot carry STORY-LOCKED";
  } else if (attack && seed) {
    if (kills(attack) && !holds(seed)) {
      verdict =
        "FRAGILE — 25% iconoclasts kill story-arm mark trade; KW minority cannot install it in the label arm";
    } else if (holds(attack) && !holds(seed)) {
      verdict =
        "STORY-LOCKED — convention survives iconoclasts among story agents; KW minority does not infect label agents";
    } else if (holds(attack) && holds(seed)) {
      verdict =
        "CONTAGIOUS — story convention holds under attack, and a KW minority installs marks in the label arm";
    } else if (kills(attack) && holds(seed)) {
      verdict =
        "CRITICAL MASS — minority tips both ways: iconoclasts collapse story, KW believers install label";
    } else {
      verdict = "WEAK — minority effects exist but miss hold/kill gates";
    }
  } else if (attack && !thin) {
    verdict = kills(attack)
      ? "ATTACK KILLS — iconoclast minority collapses mark trade"
      : holds(attack)
        ? "ATTACK HOLDS — story convention survives 25% iconoclasts"
        : "ATTACK WEAK";
  }

  return {
    model: "grok-4.5",
    k: MINORITY_K,
    n: DEFAULT_PARAMS.n,
    baselineStoryInterior,
    robotMix,
    runs,
    attack,
    seed,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
