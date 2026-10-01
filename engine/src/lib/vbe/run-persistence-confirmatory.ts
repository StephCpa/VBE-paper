import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import { LLM_CONFIG, grokChat, hasChatApiKey, parseProposal } from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  INSTALL_LAST_ROUND,
  POST_FIRST_ROUND,
  POST_LAST_ROUND,
  TURNOVER_FIRST_ROUND,
  TURNOVER_LAST_ROUND,
  persistenceNotice,
  replacementOrder,
  type PersistenceRun,
} from "./persistence.ts";
import {
  PERSISTENCE_CONFIRMATORY_ARMS,
  PERSISTENCE_CONFIRMATORY_SEEDS,
  buildPersistenceConfirmatoryReport,
  type PersistenceConfirmatoryArm,
  type PersistenceConfirmatoryReport,
} from "./persistence-confirmatory.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

const PARAMS = { ...DEFAULT_PARAMS, K: 3 };
const DATA_PATH = "src/data/persistence-confirmatory.json";
const PUBLIC_PATH = "public/data/persistence-confirmatory.json";

function load(): PersistenceRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as PersistenceConfirmatoryReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing confirmatory data uses ${report.model}, current model is ${LLM_CONFIG.model}`);
  }
  if (JSON.stringify(report.seeds) !== JSON.stringify(PERSISTENCE_CONFIRMATORY_SEEDS)) {
    throw new Error("existing confirmatory data uses a different frozen seed list");
  }
  return report.runs;
}

function write(report: PersistenceConfirmatoryReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, json);
  writeFileSync(PUBLIC_PATH, json);
}

function validateAction(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON";
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof obj.giveCheck !== "boolean") return "giveCheck must be boolean";
    if (obj.giveChits !== 0 && obj.giveChits !== 1) return "giveChits must be 0 or 1";
    if (typeof obj.requireChit !== "boolean") return "requireChit must be boolean";
    return null;
  } catch {
    return "invalid JSON";
  }
}

async function runOne(arm: PersistenceConfirmatoryArm, seed: number): Promise<PersistenceRun> {
  const order = replacementOrder(seed, PARAMS.n);
  const replaced = new Set<number>();
  let calls = 0;
  let apiFails = 0;
  let parseFails = 0;

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (t >= TURNOVER_FIRST_ROUND && t <= TURNOVER_LAST_ROUND) {
      const id = order[t - TURNOVER_FIRST_ROUND]!;
      replaced.add(id);
      agents[id]!.memory = [];
    }
  };

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
  ): Promise<Proposal> => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  confirmatory ${arm} seed=${seed} round ${t}/${PARAMS.T} calls=${calls}`);
    }
    const response = await grokChat({
      prompt: meetingPrompt(
        me,
        partner,
        t,
        PARAMS,
        "label",
        persistenceNotice(arm, t, me.id, replaced),
        "",
        false,
        true,
      ),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`confirmatory action ${arm} seed=${seed} t=${t}: ${response.error}`);
    }
    const invalid = validateAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`confirmatory action ${arm} seed=${seed} t=${t}: ${invalid}`);
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(
    seed,
    decide,
    PARAMS,
    true,
    undefined,
    beforeMeetings,
  );
  return {
    arm,
    seed,
    calls,
    apiFails,
    parseFails,
    scheduleHash: structuralScheduleHash(result),
    replacementOrder: order,
    windows: {
      install: coordinationSlice(result, () => true, 1, INSTALL_LAST_ROUND),
      turnover: coordinationSlice(
        result,
        () => true,
        TURNOVER_FIRST_ROUND,
        TURNOVER_LAST_ROUND,
      ),
      postReplacement: coordinationSlice(
        result,
        () => true,
        POST_FIRST_ROUND,
        POST_LAST_ROUND,
      ),
    },
    meanScore: result.meanScore,
    result,
  };
}

if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const runs = load();
const done = new Set(runs.map((run) => `${run.arm}:${run.seed}`));
const jobs = PERSISTENCE_CONFIRMATORY_SEEDS.flatMap((seed, index) => {
  const arms = index % 2 === 0
    ? PERSISTENCE_CONFIRMATORY_ARMS
    : [...PERSISTENCE_CONFIRMATORY_ARMS].reverse();
  return arms.map((arm) => ({ arm, seed }));
});

console.log(`resume ${runs.length} confirmatory runs`);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.arm, job.seed);
  runs.push(run);
  done.add(key);
  const report = buildPersistenceConfirmatoryReport(runs, LLM_CONFIG.model);
  write(report);
  console.log(
    `done ${key} post seller=${run.windows.postReplacement.sellerIntentPerHe.toFixed(3)} buyer=${run.windows.postReplacement.buyerIntentPerHe.toFixed(3)} trade=${run.windows.postReplacement.tradePerHe.toFixed(3)} schedule=${run.scheduleHash}`,
  );
}

const final = buildPersistenceConfirmatoryReport(runs, LLM_CONFIG.model);
write(final);
console.log(`verdict ${final.verdict}`);
