import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES, type PromptCondition } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { LABEL_IDS, STORY_IDS, groupMean, isStory, mixedCuts } from "./mixed.ts";
import {
  ANNOUNCE,
  IDS_ONLY,
  buildUnconfoundReport,
  slicesForAnnounce,
  type UnconfoundKind,
  type UnconfoundReport,
  type UnconfoundRun,
} from "./unconfound.ts";
import type { AgentState, Proposal } from "./types.ts";

function loadExisting(): UnconfoundRun[] {
  const path = "src/data/unconfound.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as UnconfoundReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function writeReport(report: UnconfoundReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/unconfound.json", json);
  writeFileSync("public/data/unconfound.json", json);
}

async function runOne(kind: UnconfoundKind, seed: number): Promise<UnconfoundRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const notice = kind === "announce" ? ANNOUNCE : IDS_ONLY;
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
      console.log(`  ${kind} seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`);
    }
    const condition: PromptCondition =
      kind === "announce" ? "label" : isStory(me.id) ? "story" : "label";
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, DEFAULT_PARAMS, condition, notice),
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
  const all = slicesForAnnounce(result);
  const cuts = kind === "idsonly" ? mixedCuts(result) : null;
  const run: UnconfoundRun = {
    kind,
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    storyMean: kind === "idsonly" ? groupMean(result.scores, STORY_IDS) : result.meanScore,
    labelMean: kind === "idsonly" ? groupMean(result.scores, LABEL_IDS) : result.meanScore,
    all,
    cuts,
    result,
  };
  const extra = cuts
    ? ` SS ${cuts.ss.accepts}/${cuts.ss.offers} cross ${cuts.cross.accepts}/${cuts.cross.offers}`
    : "";
  console.log(
    `done ${kind} seed=${seed} all ${all.accepts}/${all.offers}${extra} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const jobs: { kind: UnconfoundKind; seed: number }[] = [
  { kind: "announce", seed: 17 },
  { kind: "announce", seed: 29 },
  { kind: "announce", seed: 41 },
  { kind: "idsonly", seed: 17 },
  { kind: "idsonly", seed: 29 },
  { kind: "idsonly", seed: 41 },
];

const runs = loadExisting();
const done = new Set(runs.map((r) => `${r.kind}:${r.seed}`));
writeReport(buildUnconfoundReport(runs));
console.log(`resume ${runs.length}`);

for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job.kind, job.seed));
  done.add(key);
  writeReport(buildUnconfoundReport(runs));
}

const final = buildUnconfoundReport(runs);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
