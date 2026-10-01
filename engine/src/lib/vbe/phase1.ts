import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { runPopulation, runPopulationAsync } from "./env.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, type PromptCondition } from "./prompts.ts";
import { STRATEGIES, idleProposal } from "./robots.ts";
import type { AgentState, Proposal, RunResult } from "./types.ts";
import { poolCounts, type ProbeTrial } from "./endgame.ts";

export type Phase1Run = {
  condition: PromptCondition;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  result: RunResult;
};

export type Phase1Report = {
  model: string;
  params: VbeParams;
  robotBaselines: Record<
    string,
    { mean: number; accInterior: number; accEnd: number }
  >;
  runs: Phase1Run[];
  byCondition: Partial<
    Record<
      PromptCondition,
      {
        n: number;
        meanScore: number;
        accInterior: number;
        accEnd: number;
        heOffersInterior: number;
        heAcceptsInterior: number;
        heOffersEnd: number;
        heAcceptsEnd: number;
        probeOffers?: number;
        probeSells?: number;
        probeGifts?: number;
        l2: "YES" | "WEAK" | "NO";
      }
    >
  >;
  endgameProbe?: {
    pairing: "forced-he-sale";
    trials: ProbeTrial[];
  };
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function l2Label(
  accI: number,
  accE: number,
  offersEnd: number,
  giftEnd = 1,
): "YES" | "WEAK" | "NO" {
  const uses = accI >= 0.4;
  if (!uses) return "NO";
  // Collapse is identified only if last-round (or probe) sale opportunities exist
  // AND agents neither sell nor gift leftover checks.
  if (offersEnd >= 2 && accE <= 0.15 && giftEnd <= 0.2) return "YES";
  return "WEAK";
}

export async function runLlmEconomy(opts: {
  condition: PromptCondition;
  seed: number;
  params?: VbeParams;
}): Promise<Phase1Run> {
  const params = opts.params ?? DEFAULT_PARAMS;
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    void T;
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  ${opts.condition} seed=${opts.seed} round ${t}/${params.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, params, opts.condition),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!r.ok) {
      apiFails += 1;
      console.warn(`  api fail t=${t} #${me.id}: ${r.error}`);
      return idleProposal();
    }
    const parsed = parseProposal(r.text);
    if (
      r.text.trim() === "" ||
      (!r.text.includes("giveCheck") && !r.text.includes("give_check"))
    ) {
      parseFails += 1;
    }
    return parsed;
  };

  const result = await runPopulationAsync(opts.seed, decide, params, true);
  console.log(
    `done ${opts.condition} seed=${opts.seed} mean=${result.meanScore.toFixed(2)} acc ${result.accInterior.toFixed(2)}→${result.accEnd.toFixed(2)} calls=${calls} apiFails=${apiFails} parseFails=${parseFails}`,
  );
  return {
    condition: opts.condition,
    seed: opts.seed,
    calls,
    parseFails,
    apiFails,
    result,
  };
}

export function buildReport(
  runs: Phase1Run[],
  params: VbeParams,
  robotBaselines: Phase1Report["robotBaselines"],
  probeTrials: ProbeTrial[] = [],
): Phase1Report {
  const byCondition = {} as Phase1Report["byCondition"];
  const conditions = [...new Set(runs.map((r) => r.condition))] as PromptCondition[];
  for (const condition of conditions) {
    const subset = runs.filter((r) => r.condition === condition);
    const meanScore =
      subset.reduce((s, r) => s + r.result.meanScore, 0) / Math.max(1, subset.length);
    const heOffersInterior = subset.reduce((s, r) => s + r.result.heOffersInterior, 0);
    const heAcceptsInterior = subset.reduce((s, r) => s + r.result.heAcceptsInterior, 0);
    const heOffersEnd = subset.reduce((s, r) => s + r.result.heOffersEnd, 0);
    const heAcceptsEnd = subset.reduce((s, r) => s + r.result.heAcceptsEnd, 0);
    const accInterior = heOffersInterior === 0 ? 0 : heAcceptsInterior / heOffersInterior;
    const accEnd = heOffersEnd === 0 ? 0 : heAcceptsEnd / heOffersEnd;
    const probe = poolCounts(
      probeTrials.filter((t) => t.condition === condition),
      "llm",
    );
    const useProbe = probe.opportunities > 0;
    byCondition[condition] = {
      n: subset.length,
      meanScore,
      accInterior,
      accEnd,
      heOffersInterior,
      heAcceptsInterior,
      heOffersEnd,
      heAcceptsEnd,
      probeOffers: probe.opportunities,
      probeSells: probe.sells,
      probeGifts: probe.gifts,
      l2: l2Label(
        accInterior,
        useProbe ? probe.accSale : accEnd,
        useProbe ? probe.opportunities : heOffersEnd,
        useProbe ? probe.accGift : 1,
      ),
    };
  }

  const label = byCondition.label;
  const story = byCondition.story;
  let verdict = "incomplete";
  if (label && story) {
    if (label.l2 === "NO" && story.l2 === "NO") {
      verdict = "NO L2 — neither label nor story produced monetary equilibrium";
    } else if (label.l2 === "NO" && story.l2 !== "NO") {
      verdict =
        "INSTALLED FICTION — story produces mark-mediated trade where label does not (channel c)";
    } else if (label.l2 !== "NO") {
      verdict = "SPONTANEOUS L2 — label condition already uses marks as media of exchange";
    }
  }

  const n = Math.max(label?.n ?? 0, story?.n ?? 0);
  const notes: string[] = [`n=${n} seed${n === 1 ? "" : "s"}.`];
  if (label && story) {
    notes.push(
      `Interior mark-for-check ${story.heAcceptsInterior}/${story.heOffersInterior} vs label ${label.heAcceptsInterior}/${label.heOffersInterior}.`,
    );
  }
  if (probeTrials.length) {
    const s = poolCounts(
      probeTrials.filter((t) => t.condition === "story"),
      "llm",
    );
    notes.push(
      `Endgame probe (forced H–E): story sell ${s.sells}/${s.opportunities}, gift ${s.gifts}/${s.opportunities}.`,
    );
  } else if ((story?.heOffersEnd ?? 0) < 2) {
    notes.push(
      `Story last-round H–E sale opportunities = ${story?.heOffersEnd ?? 0}, so endgame collapse is under-powered.`,
    );
  }

  return {
    model: "grok-4.5",
    params,
    robotBaselines,
    runs,
    byCondition,
    endgameProbe: probeTrials.length
      ? { pairing: "forced-he-sale" as const, trials: probeTrials }
      : undefined,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}

export function robotBaselinesFor(params: VbeParams): Phase1Report["robotBaselines"] {
  const robotBaselines: Phase1Report["robotBaselines"] = {};
  for (const name of ["never", "barter", "reciprocity", "kw", "altruist"] as const) {
    const r = runPopulation(4242, STRATEGIES[name], params, false);
    robotBaselines[name] = {
      mean: r.meanScore,
      accInterior: r.accInterior,
      accEnd: r.accEnd,
    };
  }
  return robotBaselines;
}

export async function runPhase1(opts?: {
  seeds?: number[];
  conditions?: PromptCondition[];
  params?: VbeParams;
  existing?: Phase1Run[];
  onProgress?: (report: Phase1Report) => void;
}): Promise<Phase1Report> {
  const params = opts?.params ?? DEFAULT_PARAMS;
  const seeds = opts?.seeds ?? [17, 29];
  const conditions = opts?.conditions ?? (["label", "story"] as PromptCondition[]);
  const robotBaselines = robotBaselinesFor(params);
  const runs: Phase1Run[] = [...(opts?.existing ?? [])];
  if (runs.length) opts?.onProgress?.(buildReport(runs, params, robotBaselines));

  const done = new Set(runs.map((r) => `${r.condition}:${r.seed}`));
  for (const condition of conditions) {
    for (const seed of seeds) {
      const key = `${condition}:${seed}`;
      if (done.has(key)) {
        console.log(`skip ${key}`);
        continue;
      }
      runs.push(await runLlmEconomy({ condition, seed, params }));
      done.add(key);
      opts?.onProgress?.(buildReport(runs, params, robotBaselines));
    }
  }

  return buildReport(runs, params, robotBaselines);
}
