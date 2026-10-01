import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, mapPool, parseYesNo } from "./llm.ts";
import {
  LAYER4_FEE,
  agentsForLastRound,
  buildLayer4Report,
  layer4Prompt,
  type Layer4Question,
  type Layer4Report,
  type Layer4Trial,
} from "./layer4.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { Phase1Report } from "./phase1.ts";

function loadPhase1(): Phase1Report {
  const path = "src/data/phase1.json";
  if (!existsSync(path)) throw new Error("phase1.json missing");
  return JSON.parse(readFileSync(path, "utf8")) as Phase1Report;
}

function loadExisting(): Layer4Trial[] {
  const path = "src/data/layer4.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as Layer4Report;
    return Array.isArray(d.trials) ? d.trials : [];
  } catch {
    return [];
  }
}

function writeReport(report: Layer4Report) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/layer4.json", json);
  writeFileSync("public/data/layer4.json", json);
}

const phase1 = loadPhase1();
const trials: Layer4Trial[] = loadExisting();
const done = new Set(
  trials.map((t) => `${t.condition}:${t.seed}:${t.agentId}:${t.question}`),
);
writeReport(buildLayer4Report(trials));

const questions: Layer4Question[] = ["defense", "commemorative"];
const jobs: { condition: Layer4Trial["condition"]; seed: number; agentId: number; question: Layer4Question }[] = [];

for (const run of phase1.runs) {
  const agents = agentsForLastRound(run.result, run.seed, DEFAULT_PARAMS);
  for (const me of agents) {
    for (const question of questions) {
      const key = `${run.condition}:${run.seed}:${me.id}:${question}`;
      if (done.has(key)) continue;
      jobs.push({
        condition: run.condition,
        seed: run.seed,
        agentId: me.id,
        question,
      });
    }
  }
}

console.log(`layer4 jobs ${jobs.length} resume ${trials.length}`);

await mapPool(jobs, 4, async (job) => {
  const run = phase1.runs.find(
    (r) => r.condition === job.condition && r.seed === job.seed,
  )!;
  const agents = agentsForLastRound(run.result, run.seed, DEFAULT_PARAMS);
  const me = agents.find((a) => a.id === job.agentId)!;
  const prompt = layer4Prompt(
    me,
    DEFAULT_PARAMS.T,
    DEFAULT_PARAMS,
    job.condition,
    job.question,
    LAYER4_FEE,
  );
  const r = await grokChat({
    prompt,
    system: "Answer YES or NO only. Maximize your own score.",
    maxTokens: 8,
    temperature: 0,
  });
  const answer = r.ok ? parseYesNo(r.text) : "NA";
  if (!r.ok) console.warn(`api fail ${job.condition}#${job.seed} a${job.agentId}`, r.error);
  const trial: Layer4Trial = {
    condition: job.condition,
    seed: job.seed,
    agentId: me.id,
    type: me.type,
    marks: me.chits,
    question: job.question,
    answer,
  };
  trials.push(trial);
  done.add(`${trial.condition}:${trial.seed}:${trial.agentId}:${trial.question}`);
  writeReport(buildLayer4Report(trials));
  console.log(
    `${trial.condition} s${trial.seed} #${trial.agentId} ${trial.type} m${trial.marks} ${trial.question} → ${trial.answer}`,
  );
});

const final = buildLayer4Report(trials);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
