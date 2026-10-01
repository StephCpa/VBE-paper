import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { runEndgameProbeAsync, type ProbeTrial } from "./endgame.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  GIFT_ANNOUNCE,
  buildSpeechReport,
  tallySpeech,
  type SpeechReport,
  type SpeechRun,
} from "./speech.ts";
import type { AgentState, Proposal } from "./types.ts";

function load(): SpeechReport | null {
  const path = "src/data/speech.json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SpeechReport;
  } catch {
    return null;
  }
}

function write(report: SpeechReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/speech.json", json);
  writeFileSync("public/data/speech.json", json);
}

async function runOne(seed: number): Promise<SpeechRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ) => {
    void T;
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  gift-talk seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", GIFT_ANNOUNCE),
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
  const t = tallySpeech(result);
  const run: SpeechRun = {
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    sales: t.sales,
    gifts: t.gifts,
    result,
  };
  console.log(
    `done seed=${seed} gifts ${run.gifts.accepts}/${run.gifts.offers} sales ${run.sales.accepts}/${run.sales.offers} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const existing = load();
const runs = existing?.runs ?? [];
const trials: ProbeTrial[] = [...(existing?.probe?.trials ?? [])];
const doneRuns = new Set(runs.map((r) => r.seed));
const doneProbe = new Set(trials.map((t) => t.seed));
write(buildSpeechReport(runs, trials));

for (const seed of [17, 29, 41]) {
  if (doneRuns.has(seed)) {
    console.log(`skip run ${seed}`);
    continue;
  }
  runs.push(await runOne(seed));
  doneRuns.add(seed);
  write(buildSpeechReport(runs, trials));
}

for (const run of runs) {
  if (doneProbe.has(run.seed)) {
    console.log(`skip probe ${run.seed}`);
    continue;
  }
  const trial = await runEndgameProbeAsync({
    result: run.result,
    seed: run.seed,
    condition: "label",
    decide: async (me, partner, t) => {
      const r = await grokChat({
        prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", GIFT_ANNOUNCE),
        system: RULES,
        maxTokens: 64,
        temperature: 0,
        json: true,
      });
      if (!r.ok) return idleProposal();
      return parseProposal(r.text);
    },
    params: DEFAULT_PARAMS,
  });
  trials.push(trial);
  doneProbe.add(run.seed);
  write(buildSpeechReport(runs, trials));
  console.log(
    `probe seed=${run.seed} sell ${trial.llm.sells}/${trial.llm.opportunities} gift ${trial.llm.gifts} alt-gift ${trial.altruist.gifts}`,
  );
}

const final = buildSpeechReport(runs, trials);
write(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
