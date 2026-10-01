import { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
import { endowRound } from "./env.ts";
import { reconstructAgentsAt } from "./endgame.ts";
import { mulberry32 } from "./rng.ts";
import { RULES, STORY, formatMemory, type PromptCondition } from "./prompts.ts";
import type { AgentState, RunResult } from "./types.ts";

export type Layer4Question = "commemorative" | "defense";

export type Layer4Trial = {
  condition: PromptCondition;
  seed: number;
  agentId: number;
  type: AgentState["type"];
  marks: number;
  question: Layer4Question;
  answer: "YES" | "NO" | "NA";
};

export type Layer4Cell = {
  n: number;
  yes: number;
  na: number;
  rate: number;
  holdersYes: number;
  holdersN: number;
  outsidersYes: number;
  outsidersN: number;
};

export type Layer4Report = {
  model: string;
  fee: number;
  round: "last";
  questions: Layer4Question[];
  trials: Layer4Trial[];
  byCondition: Partial<
    Record<PromptCondition, Record<Layer4Question, Layer4Cell>>
  >;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

export const LAYER4_FEE = 1;

export function layer4Prompt(
  me: AgentState,
  t: number,
  params: VbeParams,
  condition: PromptCondition,
  question: Layer4Question,
  fee: number,
): string {
  const story = condition === "story" ? `\n${STORY}\n` : "";
  const economy = RULES.split("PROPOSAL (JSON only)")[0]!.trim();
  const offer =
    question === "commemorative"
      ? `OFFER. You may forfeit ${fee} score points to receive one commemorative mark. It cannot be traded, pays nothing, and the game ends after this round. Your leftover check still converts to ${params.v} if you keep it. Paying does not verify anyone.`
      : `OFFER. You may forfeit ${fee} score points so that marks remain recognized as the medium of exchange in the written record of this economy. Nobody else's score changes. The game ends after this round. You receive no mark and no check.`;
  return `${economy}
Parameters: R=${params.R}, pH=${params.pHard}, pP=${params.pPartner}, v=${params.v}, T=${params.T}.
The inventory object is a "mark": a nonce token with no use value.
${story}
NOW
Round ${t} of ${params.T} (LAST ROUND).
You are agent #${me.id}. Problem: ${me.type === "H" ? "HARD (unsolved)" : "EASY (already paid)"}. Checks: ${me.checks}. Marks: ${me.chits}. Score so far: ${me.score.toFixed(2)}.
Your recent meetings: ${formatMemory(me)}.

${offer}

Answer YES or NO only.`;
}

export function emptyCell(): Layer4Cell {
  return {
    n: 0,
    yes: 0,
    na: 0,
    rate: 0,
    holdersYes: 0,
    holdersN: 0,
    outsidersYes: 0,
    outsidersN: 0,
  };
}

export function tallyLayer4(trials: Layer4Trial[]): Layer4Report["byCondition"] {
  const out: Layer4Report["byCondition"] = {};
  for (const condition of ["label", "story"] as PromptCondition[]) {
    const rec = {} as Record<Layer4Question, Layer4Cell>;
    for (const q of ["commemorative", "defense"] as Layer4Question[]) {
      const subset = trials.filter((t) => t.condition === condition && t.question === q);
      const valid = subset.filter((t) => t.answer !== "NA");
      const yes = valid.filter((t) => t.answer === "YES");
      const holders = valid.filter((t) => t.marks >= 1);
      const outsiders = valid.filter((t) => t.marks < 1);
      rec[q] = {
        n: valid.length,
        yes: yes.length,
        na: subset.length - valid.length,
        rate: valid.length === 0 ? 0 : yes.length / valid.length,
        holdersYes: holders.filter((t) => t.answer === "YES").length,
        holdersN: holders.length,
        outsidersYes: outsiders.filter((t) => t.answer === "YES").length,
        outsidersN: outsiders.length,
      };
    }
    out[condition] = rec;
  }
  return out;
}

export function layer4Verdict(by: Layer4Report["byCondition"]): {
  verdict: string;
  caveat: string;
} {
  const storyD = by.story?.defense;
  const labelD = by.label?.defense;
  const storyC = by.story?.commemorative;
  const labelC = by.label?.commemorative;
  if (!storyD || !labelD || !storyC || !labelC) {
    return { verdict: "incomplete", caveat: "Need both arms." };
  }
  const storyPay = Math.max(storyD.rate, storyC.rate);
  const labelPay = Math.max(labelD.rate, labelC.rate);
  const notes = [
    `Defense story ${storyD.yes}/${storyD.n} vs label ${labelD.yes}/${labelD.n}.`,
    `Commemorative story ${storyC.yes}/${storyC.n} vs label ${labelC.yes}/${labelC.n}.`,
    `Fee=${LAYER4_FEE} on the last round, so continuation value of a mark is 0.`,
  ];
  if (storyPay < 0.2 && labelPay < 0.2) {
    return {
      verdict:
        "NO L4 — agents will not burn score to defend or commemorate the mark (instrumental L2 only)",
      caveat: notes.join(" "),
    };
  }
  if (labelPay >= 0.2 && storyPay - labelPay < 0.15) {
    return {
      verdict:
        "HELPFULNESS — both arms burn score; not specific to the installed story",
      caveat: notes.join(" "),
    };
  }
  if (storyPay >= 0.2 && storyPay - labelPay >= 0.15) {
    return {
      verdict:
        "LAYER 4 — story arm burns score to defend or commemorate a dying mark",
      caveat: notes.join(" "),
    };
  }
  return {
    verdict: "WEAK L4 — some payment, below the story-vs-label gap",
    caveat: notes.join(" "),
  };
}

export function agentsForLastRound(
  result: RunResult,
  seed: number,
  params: VbeParams = DEFAULT_PARAMS,
): AgentState[] {
  const agents = reconstructAgentsAt(result, params, params.T - 1);
  endowRound(agents, params, mulberry32((seed + 70001) >>> 0));
  return agents;
}

export function buildLayer4Report(trials: Layer4Trial[]): Layer4Report {
  const byCondition = tallyLayer4(trials);
  const { verdict, caveat } = layer4Verdict(byCondition);
  return {
    model: "grok-4.5",
    fee: LAYER4_FEE,
    round: "last",
    questions: ["commemorative", "defense"],
    trials,
    byCondition,
    verdict,
    caveat,
    generatedAt: new Date().toISOString(),
  };
}
