import {
  ACCEPT_STIMULI,
  SCHELLING_MENUS,
  acceptancePrompt,
  schellingPrompt,
  type Stimulus,
  type SchellingMenu,
} from "./prompts.ts";
import { grokChat, mapPool, parseChoice, parseYesNo } from "./llm.ts";

export type AcceptTrial = {
  stimulus: Stimulus;
  sample: number;
  raw: string;
  answer: "YES" | "NO" | "NA";
};

export type SchellingTrial = {
  menu: SchellingMenu;
  sample: number;
  raw: string;
  choice: string;
};

export type Phase0Report = {
  model: string;
  acceptN: number;
  schellingN: number;
  accept: {
    id: string;
    kind: string;
    label: string;
    yes: number;
    n: number;
    rate: number;
  }[];
  floor: "LOW" | "HIGH" | "SPLIT";
  culturalFloor?: "LOW" | "HIGH";
  novelFloor?: "LOW" | "HIGH";
  schelling: {
    id: string;
    kind: string;
    n: number;
    match: number;
    top: string;
    histogram: Record<string, number>;
  }[];
  trials: { accept: AcceptTrial[]; schelling: SchellingTrial[] };
  generatedAt: string;
};

function pairMatchRate(choices: string[]): number {
  const n = choices.length;
  if (n < 2) return 0;
  let hits = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs += 1;
      if (choices[i] === choices[j]) hits += 1;
    }
  }
  return pairs === 0 ? 0 : hits / pairs;
}

export async function runPhase0(opts?: {
  acceptN?: number;
  schellingN?: number;
  concurrency?: number;
}): Promise<Phase0Report> {
  const acceptN = opts?.acceptN ?? 8;
  const schellingN = opts?.schellingN ?? 12;
  const concurrency = opts?.concurrency ?? 6;

  const acceptJobs = ACCEPT_STIMULI.flatMap((stimulus) =>
    Array.from({ length: acceptN }, (_, sample) => ({ stimulus, sample })),
  );
  const acceptTrials = await mapPool(acceptJobs, concurrency, async (job) => {
    const r = await grokChat({
      prompt: acceptancePrompt(job.stimulus),
      maxTokens: 8,
      temperature: 0,
    });
    return {
      stimulus: job.stimulus,
      sample: job.sample,
      raw: r.ok ? r.text : r.error ?? "",
      answer: r.ok ? parseYesNo(r.text) : "NA",
    } satisfies AcceptTrial;
  });

  const schellingJobs = SCHELLING_MENUS.flatMap((menu) =>
    Array.from({ length: schellingN }, (_, sample) => ({ menu, sample })),
  );
  const schellingTrials = await mapPool(schellingJobs, concurrency, async (job) => {
    const r = await grokChat({
      prompt: schellingPrompt(job.menu),
      maxTokens: 12,
      temperature: 0,
    });
    const raw = r.ok ? r.text : r.error ?? "";
    return {
      menu: job.menu,
      sample: job.sample,
      raw,
      choice: parseChoice(raw, job.menu.items),
    } satisfies SchellingTrial;
  });

  const accept = ACCEPT_STIMULI.map((s) => {
    const rows = acceptTrials.filter((t) => t.stimulus.id === s.id);
    const yes = rows.filter((t) => t.answer === "YES").length;
    const n = rows.length;
    return { id: s.id, kind: s.kind, label: s.label, yes, n, rate: n ? yes / n : 0 };
  });
  const culturalMax = Math.max(
    0,
    ...accept.filter((a) => a.kind === "cultural").map((a) => a.rate),
  );
  const novelMax = Math.max(
    0,
    ...accept.filter((a) => a.kind === "novel").map((a) => a.rate),
  );
  const culturalFloor = culturalMax < 0.15 ? "LOW" : "HIGH";
  const novelFloor = novelMax < 0.15 ? "LOW" : "HIGH";
  const floor =
    culturalFloor === novelFloor ? culturalFloor : "SPLIT";

  const schelling = SCHELLING_MENUS.map((menu) => {
    const rows = schellingTrials.filter((t) => t.menu.id === menu.id);
    const histogram: Record<string, number> = {};
    for (const it of menu.items) histogram[it] = 0;
    const choices = rows.map((t) => t.choice);
    for (const c of choices) histogram[c] = (histogram[c] ?? 0) + 1;
    const top =
      Object.entries(histogram).sort((a, b) => b[1] - a[1])[0]?.[0] ?? menu.items[0]!;
    return {
      id: menu.id,
      kind: menu.kind,
      n: rows.length,
      match: pairMatchRate(choices),
      top,
      histogram,
    };
  });

  return {
    model: "grok-4.5",
    acceptN,
    schellingN,
    accept,
    floor,
    culturalFloor,
    novelFloor,
    schelling,
    trials: { accept: acceptTrials, schelling: schellingTrials },
    generatedAt: new Date().toISOString(),
  };
}
