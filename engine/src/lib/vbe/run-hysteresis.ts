import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, shockNotice, type PromptCondition } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  MARK_SHOCK,
  buildHysteresisReport,
  hysteresisLabel,
  hysteresisWindows,
  robotHysteresis,
  type HysteresisReport,
  type HysteresisRun,
} from "./hysteresis.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadExisting(): HysteresisRun[] {
  const path = "src/data/hysteresis.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as HysteresisReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: HysteresisReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/hysteresis.json", json);
  writeFileSync("public/data/hysteresis.json", json);
}

async function runOne(condition: PromptCondition, seed: number): Promise<HysteresisRun> {
  const shock = MARK_SHOCK;
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
      console.log(`  ${condition} seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(
        me,
        partner,
        t,
        DEFAULT_PARAMS,
        condition,
        shockNotice(t, shock.start, shock.end),
      ),
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

  const result = await runPopulationAsync(
    seed,
    decide,
    DEFAULT_PARAMS,
    true,
    shock,
  );
  const w = hysteresisWindows(result);
  const run: HysteresisRun = {
    condition,
    seed,
    calls,
    parseFails,
    apiFails,
    pre: w.pre,
    shock: w.shock,
    post: w.post,
    meanScore: result.meanScore,
    label: hysteresisLabel(w.pre, w.post),
    result,
  };
  console.log(
    `done ${condition} seed=${seed} ${run.label} pre ${run.pre.accepts}/${run.pre.offers} shock ${run.shock.accepts}/${run.shock.offers} post ${run.post.accepts}/${run.post.offers} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const jobs: { condition: PromptCondition; seed: number }[] = [
  { condition: "story", seed: 17 },
  { condition: "story", seed: 29 },
  { condition: "story", seed: 41 },
  { condition: "label", seed: 17 },
];

const robot = robotHysteresis();
const runs = loadExisting();
const done = new Set(runs.map((r) => `${r.condition}:${r.seed}`));
writeReport(buildHysteresisReport(runs, robot));
console.log(`resume ${runs.length}; KW ${robot.kw.label}`);

for (const job of jobs) {
  const key = `${job.condition}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job.condition, job.seed));
  done.add(key);
  writeReport(buildHysteresisReport(runs, robot));
}

const final = buildHysteresisReport(runs, robot);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
