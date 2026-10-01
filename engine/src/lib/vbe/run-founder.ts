import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPopulationAsyncPaired } from "./env.ts";
import { coordinationSlice, structuralScheduleHash } from "./epistemic.ts";
import {
  CANONICAL_POLICY,
  FOUNDER_FEE,
  FOUNDER_SEEDS,
  buildFounderReport,
  founderPrompt,
  isCanonicalMoney,
  parseFounderDecision,
  type FounderArm,
  type FounderReport,
  type FounderRun,
  type FoundingEvent,
} from "./founder.ts";
import {
  LLM_CONFIG,
  grokChat,
  hasChatApiKey,
  parseProposal,
} from "./llm.ts";
import { ORIGINATION_PARAMS } from "./origination.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";

const DATA_PATH = "src/data/founder.json";
const PUBLIC_PATH = "public/data/founder.json";

function load(): FounderRun[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as FounderReport;
  if (report.model !== LLM_CONFIG.model) {
    throw new Error(`existing founder data uses ${report.model}, current model is ${LLM_CONFIG.model}`);
  }
  return report.runs;
}

function write(report: FounderReport): void {
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

async function runOne(arm: FounderArm, seed: number): Promise<FounderRun> {
  const params = ORIGINATION_PARAMS;
  let calls = 0;
  let apiFails = 0;
  let parseFails = 0;
  let founding: FoundingEvent | null =
    arm === "external"
      ? {
          t: 1,
          authorId: -1,
          arm,
          scoreBefore: 0,
          grossCost: 0,
          refund: 0,
          netCost: 0,
          decision: {
            speak: true,
            proposal: {
              kind: "money",
              token: "mark",
              units_per_check: 1,
              transaction_fee: 0,
              beneficiary: "none",
            },
            rationale: "experimenter-installed positive control",
          },
        }
      : null;

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    if (founding || arm === "external") return;
    const speaker = agents[(t - 1) % params.n]!;
    calls += 1;
    const response = await grokChat({
      prompt: founderPrompt(arm, speaker, t, params.T),
      system: "Follow the experimental rules. Return only the requested JSON object.",
      maxTokens: 128,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`founder ${arm} seed=${seed} t=${t}: ${response.error}`);
    }
    let decision;
    try {
      decision = parseFounderDecision(response.text);
    } catch (error) {
      parseFails += 1;
      throw new Error(`founder ${arm} seed=${seed} t=${t}: ${error}`);
    }
    if (!isCanonicalMoney(decision)) return;
    const scoreBefore = speaker.score;
    speaker.score -= FOUNDER_FEE;
    const refund = arm === "refund" ? FOUNDER_FEE : 0;
    speaker.score += refund;
    founding = {
      t,
      authorId: speaker.id,
      arm,
      scoreBefore,
      grossCost: FOUNDER_FEE,
      refund,
      netCost: FOUNDER_FEE - refund,
      decision,
    };
    console.log(`  founder ${arm} seed=${seed} t=${t} author=#${speaker.id}`);
  };

  const decide = async (
    me: AgentState,
    partner: AgentState,
    t: number,
  ): Promise<Proposal> => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  founder ${arm} seed=${seed} round ${t}/${params.T} calls=${calls}`);
    }
    const notice = founding
      ? `VERIFIED PUBLIC LEDGER. Every agent sees the same entry and knows every agent sees it.\n${CANONICAL_POLICY}`
      : "VERIFIED PUBLIC LEDGER: no institution proposal has been published.";
    const response = await grokChat({
      prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true),
      system: RULES,
      maxTokens: 64,
      temperature: 0,
      json: true,
    });
    if (!response.ok) {
      apiFails += 1;
      throw new Error(`founder action ${arm} seed=${seed} t=${t}: ${response.error}`);
    }
    const invalid = validateAction(response.text);
    if (invalid) {
      parseFails += 1;
      throw new Error(`founder action ${arm} seed=${seed} t=${t}: ${invalid}`);
    }
    return parseProposal(response.text);
  };

  const result = await runPopulationAsyncPaired(
    seed,
    decide,
    params,
    true,
    undefined,
    beforeMeetings,
  );
  const last = params.T - 1;
  return {
    arm,
    seed,
    calls,
    apiFails,
    parseFails,
    scheduleHash: structuralScheduleHash(result),
    founding,
    seller: coordinationSlice(result, () => true, 1, last),
    buyer: coordinationSlice(result, () => true, 1, last),
    trade: coordinationSlice(result, () => true, 1, last),
    meanScore: result.meanScore,
    result,
  };
}

if (!hasChatApiKey()) throw new Error(`${LLM_CONFIG.apiKeyEnv} missing`);

const runs = load();
const done = new Set(runs.map((run) => `${run.arm}:${run.seed}`));
const jobs = FOUNDER_SEEDS.flatMap((seed, index) => {
  const pair: FounderArm[] = index % 2 === 0 ? ["costly", "refund"] : ["refund", "costly"];
  return [...pair, "external" as const].map((arm) => ({ arm, seed }));
});

console.log(`resume ${runs.length} founder runs`);
for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  const run = await runOne(job.arm, job.seed);
  runs.push(run);
  done.add(key);
  write(buildFounderReport(runs));
  console.log(
    `done ${key} founded=${Boolean(run.founding)} seller=${run.seller.sellerIntentPerHe.toFixed(2)} buyer=${run.buyer.buyerIntentPerHe.toFixed(2)} trade=${run.trade.tradePerHe.toFixed(2)} schedule=${run.scheduleHash}`,
  );
}

const final = buildFounderReport(runs);
write(final);
console.log("verdict", final.verdict);

