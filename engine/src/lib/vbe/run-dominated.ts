import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  TAXED_MONEY,
  buildDominatedReport,
  tallyDominated,
  type DominatedReport,
  type DominatedRun,
} from "./dominated.ts";
import type { AgentState } from "./types.ts";

function load(): DominatedReport | null {
  const path = "src/data/dominated.json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as DominatedReport;
  } catch {
    return null;
  }
}

function write(report: DominatedReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/dominated.json", json);
  writeFileSync("public/data/dominated.json", json);
}

async function runOne(seed: number): Promise<DominatedRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const decide = async (me: AgentState, partner: AgentState, t: number) => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  tax seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, "label", TAXED_MONEY, "", true),
      system: RULES,
      maxTokens: 80,
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
  const t = tallyDominated(result);
  const run: DominatedRun = {
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    ...t,
    result,
  };
  console.log(
    `done seed=${seed} sales ${run.sales.accepts}/${run.sales.offers} tax ${run.forfeitInterior.forfeits}/${run.forfeitInterior.slots} end-tax ${run.forfeitEnd.forfeits}/${run.forfeitEnd.slots} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const existing = load();
const runs = existing?.runs ?? [];
const done = new Set(runs.map((r) => r.seed));
write(buildDominatedReport(runs));

for (const seed of [17, 29, 41]) {
  if (done.has(seed)) {
    console.log(`skip ${seed}`);
    continue;
  }
  runs.push(await runOne(seed));
  done.add(seed);
  write(buildDominatedReport(runs));
}

const final = buildDominatedReport(runs);
write(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
