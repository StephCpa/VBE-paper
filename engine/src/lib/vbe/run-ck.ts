import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  LABEL_IDS,
  STORY_IDS,
  groupMean,
  isStory,
  mixedCuts,
  type MixedReport,
  type MixedRun,
} from "./mixed.ts";
import { ROSTER, buildCkReport, type CkReport } from "./ck.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadExisting(): MixedRun[] {
  const path = "src/data/ck.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as CkReport | MixedReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: CkReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/ck.json", json);
  writeFileSync("public/data/ck.json", json);
}

async function runOne(seed: number): Promise<MixedRun> {
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
      console.log(`  ck seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const condition = isStory(me.id) ? "story" : "label";
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, condition, ROSTER),
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
  const run: MixedRun = {
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    storyMean: groupMean(result.scores, STORY_IDS),
    labelMean: groupMean(result.scores, LABEL_IDS),
    cuts: mixedCuts(result),
    result,
  };
  console.log(
    `done seed=${seed} SS ${run.cuts.ss.accepts}/${run.cuts.ss.offers} SL ${run.cuts.sl.accepts}/${run.cuts.sl.offers} LS ${run.cuts.ls.accepts}/${run.cuts.ls.offers} LL ${run.cuts.ll.accepts}/${run.cuts.ll.offers} scores ${run.storyMean.toFixed(1)}/${run.labelMean.toFixed(1)}`,
  );
  return run;
}

const seeds = [17, 29, 41];
const runs = loadExisting();
const done = new Set(runs.map((r) => r.seed));
writeReport(buildCkReport(runs));
console.log(`resume ${runs.length}`);

for (const seed of seeds) {
  if (done.has(seed)) {
    console.log(`skip ${seed}`);
    continue;
  }
  runs.push(await runOne(seed));
  done.add(seed);
  writeReport(buildCkReport(runs));
}

const final = buildCkReport(runs);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
