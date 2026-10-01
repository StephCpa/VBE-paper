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
  EPISTEMIC_BELIEF_INSTRUCTION,
  EPISTEMIC_ROBOT_IDS,
  EPISTEMIC_WINDOW,
  buildEpistemicReport,
  epistemicNotice,
  structuralScheduleHash,
  tallyEpistemicRun,
  validateEpistemicResponse,
  type EpistemicKind,
  type EpistemicReport,
  type EpistemicRun,
} from "./epistemic.ts";
import type { AgentState, Proposal } from "./types.ts";

const DATA_PATH = "src/data/epistemic.json";
const PUBLIC_PATH = "public/data/epistemic.json";
const PILOT_SEEDS = [17, 29, 41, 53, 67, 71, 83, 97, 101, 103, 107, 109];

function loadExisting(): EpistemicRun[] {
  if (!existsSync(DATA_PATH)) return [];
  try {
    const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as EpistemicReport;
    return Array.isArray(report.runs) ? report.runs : [];
  } catch {
    return [];
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
  const robots = new Set<number>(EPISTEMIC_ROBOT_IDS);
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
      console.log(
        `  epistemic ${kind} seed=${seed} round ${t}/${DEFAULT_PARAMS.T} calls=${calls}`,
      );
    }
    const response = await grokChat({
      prompt: meetingPrompt(
        me,
        partner,
        t,
        DEFAULT_PARAMS,
        "label",
        epistemicNotice(kind),
        "",
        false,
        true,
        EPISTEMIC_BELIEF_INSTRUCTION,
      ),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(
        `epistemic ${kind} seed=${seed} t=${t} agent=${me.id}: ${response.error}`,
      );
    }
    const invalid = validateEpistemicResponse(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `epistemic ${kind} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(seed, decide, DEFAULT_PARAMS, true);
  const tallies = tallyEpistemicRun(result, EPISTEMIC_ROBOT_IDS);
  return {
    kind,
    seed,
    calls,
    parseFails,
    apiFails,
    robotIds: [...EPISTEMIC_ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: {
      first: EPISTEMIC_WINDOW.firstRound,
      last: EPISTEMIC_WINDOW.lastRound,
    },
    meanScore: result.meanScore,
    totalMeanScore: result.meanScore + tallies.beliefScoring.meanBonus,
    ...tallies,
    result,
  };
}

if (process.argv.includes("--dry-run")) {
  const sample = (
    id: number,
    type: AgentState["type"],
    chits: number,
  ): AgentState => ({
    id,
    type,
    checks: 1,
    chits,
    score: 0,
    solved: type === "E",
    receivedFrom: null,
    memory: [],
  });
  const me = sample(1, "E", 0);
  const partner = sample(2, "H", 1);
  for (const kind of ["private", "public"] as EpistemicKind[]) {
    console.log(`\n===== ${kind.toUpperCase()} =====\n`);
    console.log(
      meetingPrompt(
        me,
        partner,
        EPISTEMIC_WINDOW.firstRound,
        DEFAULT_PARAMS,
        "label",
        epistemicNotice(kind),
        "",
        false,
        true,
        EPISTEMIC_BELIEF_INSTRUCTION,
      ),
    );
  }
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(
    `${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}; no epistemic run was started or written`,
  );
}

if (process.argv.includes("--smoke")) {
  const me: AgentState = {
    id: 1,
    type: "E",
    checks: 1,
    chits: 0,
    score: 0,
    solved: true,
    receivedFrom: null,
    memory: [],
  };
  const partner: AgentState = {
    ...me,
    id: 2,
    type: "H",
    chits: 1,
    solved: false,
  };
  const response = await grokChat({
    prompt: meetingPrompt(
      me,
      partner,
      EPISTEMIC_WINDOW.firstRound,
      DEFAULT_PARAMS,
      "label",
      epistemicNotice("public"),
      "",
      false,
      true,
      EPISTEMIC_BELIEF_INSTRUCTION,
    ),
    system: RULES,
    maxTokens: 96,
    temperature: 0,
    json: true,
  });
  if (!response.ok) throw new Error(`smoke failed: ${response.error}`);
  const invalid = validateEpistemicResponse(response.text);
  if (invalid) throw new Error(`smoke returned invalid JSON: ${invalid}`);
  console.log(
    `smoke ok provider=${LLM_CONFIG.provider} model=${LLM_CONFIG.model} proposal=${JSON.stringify(parseProposal(response.text))}`,
  );
  process.exit(0);
}

const runs = loadExisting();
const done = new Set(runs.map((r) => `${r.kind}:${r.seed}`));
const jobs = PILOT_SEEDS.flatMap((seed, index) => {
  const order: EpistemicKind[] =
    index % 2 === 0 ? ["private", "public"] : ["public", "private"];
  return order.map((kind) => ({ kind, seed }));
});

console.log(`resume ${runs.length}; primary rounds ${EPISTEMIC_WINDOW.firstRound}–${EPISTEMIC_WINDOW.lastRound}`);
for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.kind, job.seed);
  runs.push(run);
  done.add(key);
  writeReport(buildEpistemicReport(runs));
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(2)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(2)} llmTrade=${run.llmLlm.tradePerHe.toFixed(2)} b1=${run.belief.pAccept.toFixed(2)} b2=${run.belief.pSecond.toFixed(2)} schedule=${run.scheduleHash}`,
  );
}

const final = buildEpistemicReport(runs);
writeReport(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
