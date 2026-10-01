import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, epistemicNoticesForK, structuralScheduleHash, type EpistemicKind } from "./epistemic.ts";
import {
  SHADOW_CHECKPOINTS,
  SHADOW_LLM_IDS,
  SHADOW_ROBOT_IDS,
  parseShadowProbe,
  shadowProbePrompt,
  summarizeShadowProbes,
  type ShadowProbeRecord,
} from "./epistemic-shadow.ts";
import {
  SHADOW_PILOT_SEEDS,
  SHADOW_PRIMARY_ROUNDS,
  buildShadowStudyReport,
  type ShadowGateEvidence,
  type ShadowStudyReport,
  type ShadowStudyRun,
} from "./epistemic-shadow-study.ts";
import { LLM_CONFIG, grokChat, hasChatApiKey, mapPool, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal, RunResult } from "./types.ts";

const DATA_PATH = "src/data/epistemic-shadow-pilot.json";
const PUBLIC_PATH = "public/data/epistemic-shadow-pilot.json";
const GATE_PATH = "src/data/epistemic-shadow-gates-v2.json";
const NOTICES = epistemicNoticesForK(2);

function validateAction(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON object";
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
    if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
    if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
    if ("pAccept" in obj || "pSecond" in obj) return "unexpected belief field in action response";
    return null;
  } catch {
    return "invalid JSON";
  }
}

function countActionBeliefFields(result: RunResult): number {
  let count = 0;
  for (const round of result.rounds) {
    for (const meeting of round.meetings) {
      for (const proposal of [meeting.pi, meeting.pj]) {
        if (proposal.pAccept !== undefined) count += 1;
        if (proposal.pSecond !== undefined) count += 1;
      }
    }
  }
  return count;
}

function loadGate(): ShadowGateEvidence {
  if (!existsSync(GATE_PATH)) throw new Error(`missing shadow instrument gate ${GATE_PATH}`);
  const raw = JSON.parse(readFileSync(GATE_PATH, "utf8")) as ShadowGateEvidence;
  if (raw.model !== LLM_CONFIG.model) {
    throw new Error(`shadow gate model=${raw.model}, current model=${LLM_CONFIG.model}`);
  }
  if (!raw.pass || raw.exact !== raw.n) {
    throw new Error(`shadow instrument gate failed: ${raw.exact}/${raw.n}`);
  }
  return {
    study: raw.study,
    model: raw.model,
    exact: raw.exact,
    n: raw.n,
    pass: raw.pass,
    verdict: raw.verdict,
  };
}

function loadRuns(): ShadowStudyRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as ShadowStudyReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing shadow pilot uses ${report.model}, current model=${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(SHADOW_PILOT_SEEDS)) {
    throw new Error("existing shadow pilot uses a different seed declaration");
  }
  return report.runs;
}

function writeReport(report: ShadowStudyReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

async function runOne(kind: EpistemicKind, seed: number): Promise<ShadowStudyRun> {
  const robots = new Set<number>(SHADOW_ROBOT_IDS);
  const shadowRecords: ShadowProbeRecord[] = [];
  let actionCalls = 0;
  let probeCalls = 0;
  let apiFails = 0;
  let parseFails = 0;

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (!SHADOW_CHECKPOINTS.includes(t as (typeof SHADOW_CHECKPOINTS)[number])) return;
    console.log(`  shadow ${kind} seed=${seed} checkpoint=${t} probes=${probeCalls}`);
    const records = await mapPool([...SHADOW_LLM_IDS], SHADOW_LLM_IDS.length, async (id) => {
      probeCalls += 1;
      const response = await grokChat({
        prompt: shadowProbePrompt(agents[id]!, t, kind),
        system:
          "This is a non-acting private forecast survey. Do not propose or execute an action. Return only the requested JSON object.",
        maxTokens: 48,
        temperature: 0,
        json: true,
      });
      if (!response.ok) {
        apiFails += 1;
        throw new Error(`shadow probe ${kind} seed=${seed} t=${t} agent=${id}: ${response.error}`);
      }
      try {
        return { t, agentId: id, ...parseShadowProbe(response.text) };
      } catch (error) {
        parseFails += 1;
        throw new Error(
          `shadow probe ${kind} seed=${seed} t=${t} agent=${id}: ${error}; raw=${response.text.slice(0, 180)}`,
        );
      }
    });
    shadowRecords.push(...records);
  };

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
    T: number,
  ): Promise<Proposal> => {
    if (robots.has(me.id)) return kw(me, partner, t, T);
    actionCalls += 1;
    if (actionCalls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  action ${kind} seed=${seed} round=${t}/${T} calls=${actionCalls}`);
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
        false,
      ),
      system: RULES,
      maxTokens: 48,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`shadow action ${kind} seed=${seed} t=${t} agent=${me.id}: ${response.error}`);
    }
    const invalid = validateAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(
        `shadow action ${kind} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0, 180)}`,
      );
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(
    seed,
    decide,
    DEFAULT_PARAMS,
    true,
    undefined,
    beforeMeetings,
  );
  const llmSeller = coordinationSlice(
    result,
    (easyId) => !robots.has(easyId),
    SHADOW_PRIMARY_ROUNDS.first,
    SHADOW_PRIMARY_ROUNDS.last,
  );
  const llmBuyer = coordinationSlice(
    result,
    (_easyId, hardId) => !robots.has(hardId),
    SHADOW_PRIMARY_ROUNDS.first,
    SHADOW_PRIMARY_ROUNDS.last,
  );
  const llmLlm = coordinationSlice(
    result,
    (easyId, hardId) => !robots.has(easyId) && !robots.has(hardId),
    SHADOW_PRIMARY_ROUNDS.first,
    SHADOW_PRIMARY_ROUNDS.last,
  );
  const shadowByCheckpoint = Object.fromEntries(
    SHADOW_CHECKPOINTS.map((t) => [
      String(t),
      summarizeShadowProbes(shadowRecords.filter((record) => record.t === t)),
    ]),
  );
  return {
    kind,
    seed,
    actionCalls,
    probeCalls,
    parseFails,
    apiFails,
    actionBeliefFields: countActionBeliefFields(result),
    robotIds: [...SHADOW_ROBOT_IDS],
    scheduleHash: structuralScheduleHash(result),
    primaryRounds: { ...SHADOW_PRIMARY_ROUNDS },
    checkpoints: [...SHADOW_CHECKPOINTS],
    meanScore: result.meanScore,
    llmSeller,
    llmBuyer,
    llmLlm,
    shadowRecords,
    shadow: summarizeShadowProbes(shadowRecords),
    shadowByCheckpoint,
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
  console.log(meetingPrompt(me, partner, 5, DEFAULT_PARAMS, "label", NOTICES.public));
  console.log("\n===== NON-ACTING SHADOW =====\n");
  console.log(shadowProbePrompt(me, 5, "public"));
  process.exit(0);
}

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const gate = loadGate();
const runs = loadRuns();
const done = new Set(runs.map((run) => `${run.kind}:${run.seed}`));
const jobs = SHADOW_PILOT_SEEDS.flatMap((seed, index) => {
  const order: EpistemicKind[] =
    index % 2 === 0 ? ["private", "public"] : ["public", "private"];
  return order.map((kind) => ({ kind, seed }));
});

console.log(
  `resume ${runs.length}; gate=${gate.exact}/${gate.n}; seeds=${SHADOW_PILOT_SEEDS.join(",")}`,
);
for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.kind, job.seed);
  runs.push(run);
  done.add(key);
  writeReport(buildShadowStudyReport(runs, LLM_CONFIG.model, gate));
  console.log(
    `done ${key} seller=${run.llmSeller.sellerIntentPerHe.toFixed(3)} buyer=${run.llmBuyer.buyerIntentPerHe.toFixed(3)} trade=${run.llmLlm.tradePerHe.toFixed(3)} self=${run.shadow.selfSellRate.toFixed(3)} b1=${run.shadow.firstShare.toFixed(3)} b2=${run.shadow.secondShare.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildShadowStudyReport(runs, LLM_CONFIG.model, gate);
writeReport(final);
console.log(`verdict ${final.verdict}`);
for (const metric of ["buyerIntentRate", "tradeRate", "secondShare"] as const) {
  const effect = final.effects[metric];
  if (effect) {
    console.log(
      `${metric} public-private=${effect.mean.toFixed(3)} bootstrap95=[${effect.bootstrap95?.map((x) => x.toFixed(3)).join(", ")}] signFlipP=${effect.signFlipP}`,
    );
  }
}
