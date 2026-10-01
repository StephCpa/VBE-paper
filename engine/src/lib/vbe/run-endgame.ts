import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, type PromptCondition } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runEndgameProbeAsync, type ProbeTrial } from "./endgame.ts";
import {
  buildReport,
  robotBaselinesFor,
  type Phase1Report,
} from "./phase1.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadReport(): Phase1Report {
  const path = "src/data/phase1.json";
  if (!existsSync(path)) throw new Error("phase1.json missing — run phase 1 first");
  return JSON.parse(readFileSync(path, "utf8")) as Phase1Report;
}

function writeReport(report: Phase1Report) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/phase1.json", json);
  writeFileSync("public/data/phase1.json", json);
}

const report0 = loadReport();
const trials: ProbeTrial[] = [...(report0.endgameProbe?.trials ?? [])];
const done = new Set(trials.map((t) => `${t.condition}:${t.seed}`));
const baselines = robotBaselinesFor(DEFAULT_PARAMS);

function decideFor(condition: PromptCondition, seed: number) {
  let calls = 0;
  return async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    void T;
    calls += 1;
    if (calls === 1) console.log(`  probe ${condition} seed=${seed} t=${t}`);
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, condition),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!r.ok) {
      console.warn(`  api fail ${condition}#${seed} ${r.error}`);
      return idleProposal();
    }
    return parseProposal(r.text);
  };
}

for (const run of report0.runs) {
  const key = `${run.condition}:${run.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const trial = await runEndgameProbeAsync({
    result: run.result,
    seed: run.seed,
    condition: run.condition,
    decide: decideFor(run.condition, run.seed),
    params: DEFAULT_PARAMS,
  });
  trials.push(trial);
  done.add(key);
  const next = buildReport(report0.runs, DEFAULT_PARAMS, baselines, trials);
  writeReport(next);
  console.log(
    `done ${key} llm sell ${trial.llm.sells}/${trial.llm.opportunities} gift ${trial.llm.gifts}  kw ${trial.kw.sells}/${trial.kw.opportunities} alt-gift ${trial.altruist.gifts}`,
  );
}

const final = buildReport(report0.runs, DEFAULT_PARAMS, baselines, trials);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
for (const [k, v] of Object.entries(final.byCondition)) {
  if (!v) continue;
  console.log(
    `${k} L2=${v.l2} interior ${v.heAcceptsInterior}/${v.heOffersInterior} probe sell ${v.probeSells}/${v.probeOffers} gift ${v.probeGifts}`,
  );
}
