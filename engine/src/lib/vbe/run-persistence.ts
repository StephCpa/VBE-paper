import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import {
  LLM_CONFIG,
  grokChat,
  hasChatApiKey,
  parseProposal,
} from "./llm.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import {
  INSTALL_LAST_ROUND,
  PERSISTENCE_SEEDS,
  POST_FIRST_ROUND,
  POST_LAST_ROUND,
  TURNOVER_FIRST_ROUND,
  TURNOVER_LAST_ROUND,
  buildPersistenceReport,
  persistenceNotice,
  replacementOrder,
  type PersistenceArm,
  type PersistenceReport,
  type PersistenceRun,
} from "./persistence.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { kw } from "./robots.ts";
import type { AgentState, Proposal } from "./types.ts";

const PARAMS = { ...DEFAULT_PARAMS, K: 3 };
const DATA_PATH = "src/data/persistence.json";
const PUBLIC_PATH = "public/data/persistence.json";

function load(): PersistenceRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as PersistenceReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing persistence data uses ${report.model}, current model is ${LLM_CONFIG.model}`);
  }
  return report.runs;
}

function write(report: PersistenceReport): void {
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

async function runOne(arm: PersistenceArm, seed: number): Promise<PersistenceRun> {
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
    T: number,
  ): Promise<Proposal> => {
    if (arm === "contract") return kw(me, partner, t, T);
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  persistence ${arm} seed=${seed} round ${t}/${T} calls=${calls}`);
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
      throw new Error(`persistence ${arm} seed=${seed} t=${t}: ${response.error}`);
    }
    const invalid = validateAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`persistence ${arm} seed=${seed} t=${t}: ${invalid}`);
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
const arms: PersistenceArm[] = ["transient", "private-memory", "public-ledger", "contract"];
const jobs = PERSISTENCE_SEEDS.flatMap((seed, index) =>
  arms.map((_, offset) => ({ arm: arms[(index + offset) % arms.length]!, seed })),
);

console.log(`resume ${runs.length} persistence runs`);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.arm, job.seed);
  runs.push(run);
  done.add(key);
  write(buildPersistenceReport(runs));
  console.log(
    `done ${key} post seller=${run.windows.postReplacement.sellerIntentPerHe.toFixed(2)} buyer=${run.windows.postReplacement.buyerIntentPerHe.toFixed(2)} trade=${run.windows.postReplacement.tradePerHe.toFixed(2)} schedule=${run.scheduleHash}`,
  );
}

const final = buildPersistenceReport(runs);
write(final);
console.log("verdict", final.verdict);

