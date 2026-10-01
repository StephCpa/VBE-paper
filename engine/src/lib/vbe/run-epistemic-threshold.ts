import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import {
  LLM_CONFIG,
  grokChat,
  hasChatApiKey,
  parseProposal,
} from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import {
  buildEpistemicReport,
  epistemicBeliefInstructionForK,
  epistemicFactForK,
  epistemicNoticesForK,
  epistemicRobotIds,
  structuralScheduleHash,
  tallyEpistemicRun,
  validateEpistemicResponse,
  type EpistemicKind,
  type EpistemicReport,
  type EpistemicRun,
} from "./epistemic.ts";
import type { AgentState, Proposal } from "./types.ts";

const K = 2;
const ROBOT_IDS = epistemicRobotIds(K);
const FACT = epistemicFactForK(K);
const NOTICES = epistemicNoticesForK(K);
const BELIEF_INSTRUCTION = epistemicBeliefInstructionForK(K);
// Keep the k=1 window for the dose comparison. Rounds 5–14 are the region
// where k=2 alone clears the marginal threshold; rounds 15–21 are below it.
const PRIMARY_ROUNDS = { first: 5, last: 21 };
const DATA_PATH = "src/data/epistemic-k2.json";
const PUBLIC_PATH = "public/data/epistemic-k2.json";
const PILOT_SEEDS = [17, 29, 41, 53, 67, 71, 83, 97, 101, 103, 107, 109];

const reportConfig = {
  k: K,
  robotIds: ROBOT_IDS,
  fact: FACT,
  notices: NOTICES,
  primaryRounds: PRIMARY_ROUNDS,
};

function loadExisting(): EpistemicRun[] {
  if (!existsSync(DATA_PATH)) return [];
  try {
    const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as EpistemicReport;
    if (report.k !== K || report.model !== LLM_CONFIG.model) {
      throw new Error(`existing report is k=${report.k}, model=${report.model}`);
    }
    return Array.isArray(report.runs) ? report.runs : [];
  } catch (error) {
    throw new Error(`cannot resume ${DATA_PATH}: ${error}`);
  }
}

function writeReport(report: EpistemicReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

async function runOne(kind: EpistemicKind, seed: number): Promise<EpistemicRun> {
  const robots = new Set(ROBOT_IDS);
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  threshold ${kind} seed=${seed} round ${t}/${T} calls=${calls}`);
    }
    const response = await grokChat({
      prompt: meetingPrompt(
        me,
        partner,
        t,
        DEFAULT_PARAMS,
        "label",
        NOTICES[kind],
        "",
        false,
        true,
        BELIEF_INSTRUCTION,
      ),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`threshold ${kind} seed=${seed} t=${t} agent=${me.id}: ${response.error}`);
    }
    const invalid = validateEpistemicResponse(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `threshold ${kind} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  const tallies = tallyEpistemicRun(
    result,
    ROBOT_IDS,
    PRIMARY_ROUNDS.first,
    PRIMARY_ROUNDS.last,
  );
  return {
    kind,
    seed,
    calls,
    parseFails,
    apiFails,
    robotIds: [...ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: PRIMARY_ROUNDS,
    meanScore: result.meanScore,
    totalMeanScore: result.meanScore + tallies.beliefScoring.meanBonus,
    ...tallies,
    result,
  };
}

if (process.argv.includes("--dry-run")) {
  const me: AgentState = {
    id: 2,
    type: "E",
    checks: 1,
    chits: 0,
    score: 0,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  const partner: AgentState = { ...me, id: 3, type: "H", chits: 1, solved: false };
  for (const kind of ["private", "public"] as EpistemicKind[]) {
    console.log(`\n===== K2 ${kind.toUpperCase()} =====\n`);
    console.log(
      meetingPrompt(
        me,
        partner,
        PRIMARY_ROUNDS.first,
        DEFAULT_PARAMS,
        "label",
        NOTICES[kind],
        "",
        false,
        true,
        BELIEF_INSTRUCTION,
      ),
    );
  }
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const runs = loadExisting();
const done = new Set(runs.map((run) => `${run.kind}:${run.seed}`));
const jobs = PILOT_SEEDS.flatMap((seed, index) => {
  const order: EpistemicKind[] =
    index % 2 === 0 ? ["private", "public"] : ["public", "private"];
  return order.map((kind) => ({ kind, seed }));
});

console.log(`resume ${runs.length}; k=${K}; primary rounds ${PRIMARY_ROUNDS.first}–${PRIMARY_ROUNDS.last}`);
for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.kind, job.seed);
  runs.push(run);
  done.add(key);
  writeReport(buildEpistemicReport(runs, reportConfig));
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(2)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(2)} trade=${run.llmLlm.tradePerHe.toFixed(2)} b1=${run.belief.pAccept.toFixed(2)} b2=${run.belief.pSecond.toFixed(2)} schedule=${run.scheduleHash}`,
  );
}

const final = buildEpistemicReport(runs, reportConfig);
writeReport(final);
console.log("verdict", final.verdict);

