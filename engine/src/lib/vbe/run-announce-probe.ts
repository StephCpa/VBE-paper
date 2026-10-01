import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runEndgameProbeAsync, type ProbeTrial } from "./endgame.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  ANNOUNCE,
  buildUnconfoundReport,
  type UnconfoundReport,
} from "./unconfound.ts";
import type { AgentState, Proposal } from "./types.ts";

function load(): UnconfoundReport {
  const path = "src/data/unconfound.json";
  if (!existsSync(path)) throw new Error("unconfound.json missing");
  return JSON.parse(readFileSync(path, "utf8")) as UnconfoundReport;
}

function write(report: UnconfoundReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/unconfound.json", json);
  writeFileSync("public/data/unconfound.json", json);
}

const report0 = load();
const trials: ProbeTrial[] = [...(report0.announceProbe?.trials ?? [])];
const done = new Set(trials.map((t) => t.seed));

function decideFor(seed: number) {
  let calls = 0;
  return async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    void T;
    calls += 1;
    if (calls === 1) console.log(`  announce-probe seed=${seed} t=${t}`);
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", ANNOUNCE),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!r.ok) {
      console.warn(`  api fail announce#${seed} ${r.error}`);
      return idleProposal();
    }
    return parseProposal(r.text);
  };
}

for (const run of report0.runs.filter((r) => r.kind === "announce")) {
  if (done.has(run.seed)) {
    console.log(`skip ${run.seed}`);
    continue;
  }
  const trial = await runEndgameProbeAsync({
    result: run.result,
    seed: run.seed,
    condition: "label",
    decide: decideFor(run.seed),
    params: DEFAULT_PARAMS,
  });
  trials.push(trial);
  done.add(run.seed);
  const next = buildUnconfoundReport(report0.runs, trials);
  write(next);
  console.log(
    `done seed=${run.seed} llm sell ${trial.llm.sells}/${trial.llm.opportunities} gift ${trial.llm.gifts}  kw ${trial.kw.sells}/${trial.kw.opportunities} alt-gift ${trial.altruist.gifts}`,
  );
}

const final = buildUnconfoundReport(report0.runs, trials);
write(final);
console.log("verdict", final.verdict);
console.log("probe", final.announceProbe?.llm);
