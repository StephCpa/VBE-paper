import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, type PromptCondition } from "./prompts.ts";
import { STRATEGIES, idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  MINORITY_K,
  buildMinorityReport,
  robotMixBaselines,
  slicesFor,
  type MinorityKind,
  type MinorityReport,
  type MinorityRun,
} from "./minority.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadExisting(): MinorityRun[] {
  const path = "src/data/minority.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as MinorityReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: MinorityReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/minority.json", json);
  writeFileSync("public/data/minority.json", json);
}

async function runOne(opts: {
  kind: MinorityKind;
  condition: PromptCondition;
  seed: number;
  robotStrategy: "barter" | "kw";
}): Promise<MinorityRun> {
  const robotIds = Array.from({ length: MINORITY_K }, (_, i) => i);
  const robots = new Set(robotIds);
  const robotFn = STRATEGIES[opts.robotStrategy];
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return robotFn(me, partner, t, T);
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(
        `  ${opts.kind} ${opts.condition} seed=${opts.seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`,
      );
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, opts.condition),
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

  const result = await runPopulationAsync(opts.seed, decide, DEFAULT_PARAMS, true);
  const slices = slicesFor(result, robotIds);
  const run: MinorityRun = {
    kind: opts.kind,
    condition: opts.condition,
    seed: opts.seed,
    k: MINORITY_K,
    robotIds,
    robotStrategy: opts.robotStrategy,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    ...slices,
    result,
  };
  console.log(
    `done ${opts.kind} seed=${opts.seed} llmSeller ${run.llmSeller.accepts}/${run.llmSeller.offers} llmLlm ${run.llmLlm.accepts}/${run.llmLlm.offers} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const jobs: {
  kind: MinorityKind;
  condition: PromptCondition;
  seed: number;
  robotStrategy: "barter" | "kw";
}[] = [
  { kind: "attack", condition: "story", seed: 17, robotStrategy: "barter" },
  { kind: "attack", condition: "story", seed: 29, robotStrategy: "barter" },
  { kind: "seed", condition: "label", seed: 17, robotStrategy: "kw" },
  { kind: "seed", condition: "label", seed: 29, robotStrategy: "kw" },
];

const robotMix = robotMixBaselines();
const runs = loadExisting();
const done = new Set(runs.map((r) => `${r.kind}:${r.seed}`));
writeReport(buildMinorityReport(runs, robotMix));
console.log(`resume ${runs.length}`);

for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job));
  done.add(key);
  writeReport(buildMinorityReport(runs, robotMix));
}

const final = buildMinorityReport(runs, robotMix);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
