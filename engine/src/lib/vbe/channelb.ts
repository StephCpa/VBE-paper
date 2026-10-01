import { DEFAULT_PARAMS } from "./params.ts";
import { runPopulation } from "./env.ts";
import { STRATEGIES } from "./robots.ts";
import type { Meeting, RunResult, TradeKind } from "./types.ts";
import type { PromptCondition } from "./prompts.ts";

export type ExampleBank = "kw" | "barter";

export type ChannelBRun = {
  bank: ExampleBank;
  condition: PromptCondition;
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  accInterior: number;
  heOffersInterior: number;
  heAcceptsInterior: number;
  accEnd: number;
  result: RunResult;
};

export type ChannelBReport = {
  model: string;
  examples: Record<ExampleBank, string>;
  baselineLabelInterior: number;
  baselineStoryInterior: number;
  runs: ChannelBRun[];
  byBank: Partial<
    Record<ExampleBank, { n: number; accInterior: number; offers: number; accepts: number }>
  >;
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function lineFor(m: Meeting): string {
  return `t${m.t} #${m.i}(${m.iType}) vs #${m.j}(${m.jType}) kind=${m.kind} left={giveCheck:${m.pi.giveCheck},giveMarks:${m.pi.giveChits},requireMark:${m.pi.requireChit}} right={giveCheck:${m.pj.giveCheck},giveMarks:${m.pj.giveChits},requireMark:${m.pj.requireChit}}`;
}

export function pickMeetings(
  result: RunResult,
  kind: TradeKind,
  limit: number,
  pred: (m: Meeting) => boolean = () => true,
): Meeting[] {
  const out: Meeting[] = [];
  for (const snap of result.rounds) {
    for (const m of snap.meetings) {
      if (m.kind !== kind || !pred(m)) continue;
      out.push(m);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function buildKwExamples(seed = 4242): string {
  const result = runPopulation(seed, STRATEGIES.kw, DEFAULT_PARAMS, true);
  const sales = pickMeetings(result, "chit-for-check", 3);
  const lastRefuse = pickMeetings(
    result,
    "none",
    1,
    (m) =>
      m.t === DEFAULT_PARAMS.T &&
      ((m.iType === "H" && m.jType === "E") || (m.iType === "E" && m.jType === "H")),
  );
  const swaps = pickMeetings(result, "swap", 1);
  return [...sales, ...swaps, ...lastRefuse].map(lineFor).join("\n");
}

export function buildBarterExamples(seed = 4242): string {
  const result = runPopulation(seed, STRATEGIES.barter, DEFAULT_PARAMS, true);
  const swaps = pickMeetings(result, "swap", 4);
  const none = pickMeetings(result, "none", 1);
  return [...swaps, ...none].map(lineFor).join("\n");
}

export function poolBank(runs: ChannelBRun[], bank: ExampleBank) {
  const subset = runs.filter((r) => r.bank === bank);
  const offers = subset.reduce((s, r) => s + r.heOffersInterior, 0);
  const accepts = subset.reduce((s, r) => s + r.heAcceptsInterior, 0);
  return {
    n: subset.length,
    offers,
    accepts,
    accInterior: offers === 0 ? 0 : accepts / offers,
  };
}

export function buildChannelBReport(
  runs: ChannelBRun[],
  examples: Record<ExampleBank, string>,
): ChannelBReport {
  const byBank: ChannelBReport["byBank"] = {};
  for (const bank of ["kw", "barter"] as ExampleBank[]) {
    if (runs.some((r) => r.bank === bank)) byBank[bank] = poolBank(runs, bank);
  }
  const kw = byBank.kw;
  const barter = byBank.barter;
  const notes = [
    "Label arm only — no Harari story. Transcripts are from robot populations, not these partners.",
    `Baseline label interior 0.00 (0/22). Baseline story 0.44 (14/32).`,
  ];
  if (kw) notes.push(`KW transcripts ${kw.accepts}/${kw.offers} (${kw.accInterior.toFixed(2)}).`);
  if (barter) {
    notes.push(`Barter transcripts ${barter.accepts}/${barter.offers} (${barter.accInterior.toFixed(2)}).`);
  }

  let verdict = "incomplete";
  if (kw) {
    const kwOn = kw.offers >= 2 && kw.accInterior >= 0.3;
    const barterOff = !barter || barter.accInterior < 0.15;
    const barterOn = barter && barter.offers >= 2 && barter.accInterior >= 0.3;
    if (kwOn && barterOn) {
      verdict =
        "PROMPT LENGTH — both transcript banks induce mark use; not specifically KW distillation";
    } else if (kwOn && barterOff) {
      verdict =
        "CHANNEL B — KW transcripts install mark-mediated trade in the label arm without the story";
    } else if (kw.accInterior >= 0.15 && barterOff) {
      verdict =
        "WEAK B — KW transcripts raise mark use above label, below the 0.30 install gate";
    } else {
      verdict =
        "STORY ONLY — examples of mark use do not install L2; the Harari story is not replaceable by transcripts";
    }
  }

  return {
    model: "grok-4.5",
    examples,
    baselineLabelInterior: 0,
    baselineStoryInterior: 0.4375,
    runs,
    byBank,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
