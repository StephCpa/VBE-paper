import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, type PromptCondition } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { ANNOUNCE } from "./unconfound.ts";
import { isStory } from "./mixed.ts";
import {
  buildBeliefReport,
  tallyBelief,
  type BeliefKind,
  type BeliefReport,
  type BeliefRun,
} from "./beliefs.ts";
import type { AgentState } from "./types.ts";

function load(): BeliefRun[] {
  const path = "src/data/beliefs.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as BeliefReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function write(report: BeliefReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/beliefs.json", json);
  writeFileSync("public/data/beliefs.json", json);
}

async function runOne(kind: BeliefKind, seed: number): Promise<BeliefRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const notice = kind === "announce" ? ANNOUNCE : "";
  const decide = async (me: AgentState, partner: AgentState, t: number) => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  belief ${kind} seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const condition: PromptCondition =
      kind === "mixed" ? (isStory(me.id) ? "story" : "label") : "label";
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, condition, notice, "", false, true),
      system: RULES,
      maxTokens: 96,
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
  const t = tallyBelief(kind, result);
  const run: BeliefRun = {
    kind,
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    ...t,
    result,
  };
  console.log(
    `done ${kind} seed=${seed} sales ${run.sales.accepts}/${run.sales.offers} pAccept=${run.all.pAccept.toFixed(2)} pSecond=${run.all.pSecond.toFixed(2)} n=${run.all.n}`,
  );
  return run;
}

const jobs: { kind: BeliefKind; seed: number }[] = [
  { kind: "label", seed: 17 },
  { kind: "label", seed: 29 },
  { kind: "label", seed: 41 },
  { kind: "announce", seed: 17 },
  { kind: "announce", seed: 29 },
  { kind: "announce", seed: 41 },
  { kind: "mixed", seed: 17 },
  { kind: "mixed", seed: 29 },
  { kind: "mixed", seed: 41 },
];

const runs = load();
const done = new Set(runs.map((r) => `${r.kind}:${r.seed}`));
write(buildBeliefReport(runs));
console.log(`resume ${runs.length}`);

for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job.kind, job.seed));
  done.add(key);
  write(buildBeliefReport(runs));
}

const final = buildBeliefReport(runs);
write(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
