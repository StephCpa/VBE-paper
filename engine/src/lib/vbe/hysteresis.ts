import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { runPopulation, type ShockConfig } from "./env.ts";
import { STRATEGIES } from "./robots.ts";
import type { RunResult } from "./types.ts";
import type { PromptCondition } from "./prompts.ts";

export const MARK_SHOCK: ShockConfig = { start: 9, end: 14 };

export type WindowCounts = {
  offers: number;
  accepts: number;
  acc: number;
};

export type HysteresisRun = {
  condition: PromptCondition;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  pre: WindowCounts;
  shock: WindowCounts;
  post: WindowCounts;
  meanScore: number;
  label: "REBOUND" | "COLLAPSE" | "NO SIGNAL" | "WEAK";
  result: RunResult;
};

export type HysteresisReport = {
  model: string;
  shock: ShockConfig;
  robot: Record<string, { pre: WindowCounts; shock: WindowCounts; post: WindowCounts; label: HysteresisRun["label"] }>;
  runs: HysteresisRun[];
  byCondition: Partial<
    Record<
      PromptCondition,
      {
        n: number;
        pre: WindowCounts;
        shock: WindowCounts;
        post: WindowCounts;
        label: HysteresisRun["label"];
      }
    >
  >;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

export function windowCounts(result: RunResult, from: number, to: number): WindowCounts {
  let offers = 0;
  let accepts = 0;
  for (const snap of result.rounds) {
    if (snap.t < from || snap.t > to) continue;
    offers += snap.heOffers;
    accepts += snap.heAccepts;
  }
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function hysteresisWindows(result: RunResult, shock: ShockConfig = MARK_SHOCK, T = DEFAULT_PARAMS.T) {
  const pre = windowCounts(result, 1, shock.start - 1);
  const during = windowCounts(result, shock.start, shock.end);
  const post = windowCounts(result, shock.end + 1, T - 1);
  return { pre, shock: during, post };
}

export function hysteresisLabel(pre: WindowCounts, post: WindowCounts): HysteresisRun["label"] {
  if (pre.offers < 2 && post.offers < 2) return "NO SIGNAL";
  if (pre.acc >= 0.3 && post.acc >= Math.max(0.25, 0.5 * pre.acc) && post.offers >= 2) {
    return "REBOUND";
  }
  if (pre.acc >= 0.3 && post.acc <= 0.15) return "COLLAPSE";
  return "WEAK";
}

function pool(windows: WindowCounts[]): WindowCounts {
  const offers = windows.reduce((s, w) => s + w.offers, 0);
  const accepts = windows.reduce((s, w) => s + w.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function robotHysteresis(
  params: VbeParams = DEFAULT_PARAMS,
  shock: ShockConfig = MARK_SHOCK,
) {
  const out: HysteresisReport["robot"] = {};
  const seeds = [17, 29, 41, 4242, 7];
  for (const name of ["kw", "barter", "reciprocity", "altruist"] as const) {
    const windows = seeds.map((seed) =>
      hysteresisWindows(runPopulation(seed, STRATEGIES[name], params, true, shock), shock, params.T),
    );
    const pre = pool(windows.map((w) => w.pre));
    const during = pool(windows.map((w) => w.shock));
    const post = pool(windows.map((w) => w.post));
    out[name] = { pre, shock: during, post, label: hysteresisLabel(pre, post) };
  }
  return out;
}

export function buildHysteresisReport(
  runs: HysteresisRun[],
  robot: HysteresisReport["robot"],
  shock: ShockConfig = MARK_SHOCK,
): HysteresisReport {
  const byCondition: HysteresisReport["byCondition"] = {};
  for (const condition of ["label", "story"] as PromptCondition[]) {
    const subset = runs.filter((r) => r.condition === condition);
    if (!subset.length) continue;
    const pre = pool(subset.map((r) => r.pre));
    const during = pool(subset.map((r) => r.shock));
    const post = pool(subset.map((r) => r.post));
    byCondition[condition] = {
      n: subset.length,
      pre,
      shock: during,
      post,
      label: hysteresisLabel(pre, post),
    };
  }
  const story = byCondition.story;
  const label = byCondition.label;
  const kw = robot.kw;
  const notes: string[] = [
    `Shock confiscates marks in rounds ${shock.start}–${shock.end}, reissues at t=${shock.end + 1}.`,
  ];
  if (kw) notes.push(`KW robot ${kw.label} (pre ${kw.pre.acc.toFixed(2)} → post ${kw.post.acc.toFixed(2)}).`);
  if (story) {
    notes.push(
      `Story pre ${story.pre.accepts}/${story.pre.offers} shock ${story.shock.accepts}/${story.shock.offers} post ${story.post.accepts}/${story.post.offers}.`,
    );
    const seeds = runs
      .filter((r) => r.condition === "story")
      .map((r) => `${r.seed}:${r.label}`)
      .join(", ");
    if (seeds) notes.push(`Per-seed story ${seeds}.`);
  }
  if (label) {
    notes.push(
      `Label pre ${label.pre.accepts}/${label.pre.offers} post ${label.post.accepts}/${label.post.offers}.`,
    );
  }

  let verdict = "incomplete";
  if (story) {
    const storyLabels = [
      ...new Set(runs.filter((r) => r.condition === "story").map((r) => r.label)),
    ];
    if (kw && kw.label !== "REBOUND") {
      verdict = "ENV FAIL — KW did not rebound after reissue; do not interpret LLM";
    } else if (storyLabels.length > 1) {
      verdict =
        "UNDERDETERMINED — per-seed labels disagree; pooled rebound withdrawn. Snap-back is also the no-institution / instruction-following signature";
    } else if (story.label === "REBOUND") {
      verdict = "REBOUND — mark convention returns after confiscation (self-fulfilling L2)";
    } else if (story.label === "COLLAPSE") {
      verdict = "COLLAPSE — convention does not return after marks are reissued";
    } else if (story.label === "NO SIGNAL") {
      verdict = "NO SIGNAL — too few sale opportunities to score hysteresis";
    } else {
      verdict = "WEAK — some post-shock trade, below rebound gate";
    }
  }

  return {
    model: "grok-4.5",
    shock,
    robot,
    runs,
    byCondition,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
