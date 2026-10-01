import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  buildBarterExamples,
  buildChannelBReport,
  buildKwExamples,
  type ChannelBReport,
  type ChannelBRun,
  type ExampleBank,
} from "./channelb.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadExisting(): ChannelBRun[] {
  const path = "src/data/channelb.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as ChannelBReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: ChannelBReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/channelb.json", json);
  writeFileSync("public/data/channelb.json", json);
}

async function runOne(bank: ExampleBank, seed: number, examples: string): Promise<ChannelBRun> {
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
      console.log(`  ${bank} seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", "", examples),
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

  const result = await runPopulationAsync(seed, decide, DEFAULT_PARAMS, true);
  const run: ChannelBRun = {
    bank,
    condition: "label",
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    accInterior: result.accInterior,
    heOffersInterior: result.heOffersInterior,
    heAcceptsInterior: result.heAcceptsInterior,
    accEnd: result.accEnd,
    result,
  };
  console.log(
    `done ${bank} seed=${seed} acc ${run.heAcceptsInterior}/${run.heOffersInterior} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const examples = {
  kw: buildKwExamples(),
  barter: buildBarterExamples(),
};
console.log("KW examples\n" + examples.kw);
console.log("Barter examples\n" + examples.barter);

const jobs: { bank: ExampleBank; seed: number }[] = [
  { bank: "kw", seed: 17 },
  { bank: "kw", seed: 29 },
  { bank: "barter", seed: 17 },
];

const runs = loadExisting();
const done = new Set(runs.map((r) => `${r.bank}:${r.seed}`));
writeReport(buildChannelBReport(runs, examples));

for (const job of jobs) {
  const key = `${job.bank}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job.bank, job.seed, examples[job.bank]));
  done.add(key);
  writeReport(buildChannelBReport(runs, examples));
}

const final = buildChannelBReport(runs, examples);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
