import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import {
  ORIGINATION_PARAMS,
  ORIGINATION_SEEDS,
  armFee,
  buildOriginReport,
  codeBroadcast,
  formatLedger,
  parseBroadcast,
  speakerPrompt,
  tallyOrigin,
  type Broadcast,
  type OriginArm,
  type OriginReport,
  type OriginRun,
} from "./origination.ts";
import type { AgentState } from "./types.ts";

function load(): OriginRun[] {
  const path = "src/data/origination.json";
  if (!existsSync(path)) return [];
  try {
    const d = JSON.parse(readFileSync(path, "utf8")) as OriginReport;
    return Array.isArray(d.runs) ? d.runs : [];
  } catch {
    return [];
  }
}

function write(report: OriginReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/origination.json", json);
  writeFileSync("public/data/origination.json", json);
}

class CreditsError extends Error {}

function assertCredits(error?: string) {
  if (error && /403|spending-limit|run out of credits/i.test(error)) {
    throw new CreditsError(error);
  }
}

async function runOne(arm: OriginArm, seed: number): Promise<OriginRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const broadcasts: Broadcast[] = [];
  const params = ORIGINATION_PARAMS;

  const beforeMeetings = async (agents: AgentState[], t: number) => {
    const speaker = agents[(t - 1) % params.n]!;
    calls += 1;
    const r = await grokChat({
      prompt: speakerPrompt(speaker, t, params.T, formatLedger(broadcasts), arm),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    let pay = false;
    let text = "";
    if (!r.ok) {
      apiFails += 1;
      console.warn(`  speaker fail t=${t} #${speaker.id}: ${r.error}`);
      assertCredits(r.error);
    } else {
      const parsed = parseBroadcast(r.text);
      pay = parsed.pay;
      text = parsed.broadcast;
    }
    if (pay) speaker.score -= armFee(arm);
    const entry: Broadcast = {
      t,
      authorId: speaker.id,
      paid: pay,
      text,
      code: pay ? codeBroadcast(text) : "NONE",
      authorChits: speaker.chits,
      authorType: speaker.type,
    };
    broadcasts.push(entry);
    if (pay) {
      console.log(`  ${arm} seed=${seed} t=${t} #${speaker.id} POST [${entry.code}] ${text.slice(0, 80)}`);
    }
  };

  const decide = async (me: AgentState, partner: AgentState, t: number) => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  origin ${arm} seed=${seed} round ${t}/${params.T} calls=${calls}`);
    }
    const fee = armFee(arm);
    const notice = `${arm === "free" ? "FREE" : arm === "open" ? "OPEN" : "NEUTRAL"} CHANNEL is live (fee ${fee}).\n${formatLedger(broadcasts)}`;
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, params, "label", notice, "", false, true),
      system: RULES,
      maxTokens: 96,
      temperature: 0,
      json: true,
    });
    if (!r.ok) {
      apiFails += 1;
      console.warn(`  api fail t=${t} #${me.id}: ${r.error}`);
      assertCredits(r.error);
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

  const result = await runPopulationAsync(seed, decide, params, true, undefined, beforeMeetings);
  const run: OriginRun = {
    arm,
    seed,
    calls,
    parseFails,
    apiFails,
    ...tallyOrigin(result, broadcasts),
  };
  console.log(
    `done origin ${arm} seed=${seed} paid ${run.paid} sales ${run.sales.accepts}/${run.sales.offers} founding ${run.firstFounding?.code ?? "none"} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const jobs: { arm: OriginArm; seed: number }[] = [
  ...ORIGINATION_SEEDS.map((seed) => ({ arm: "open" as const, seed })),
  ...ORIGINATION_SEEDS.map((seed) => ({ arm: "neutral" as const, seed })),
  ...ORIGINATION_SEEDS.map((seed) => ({ arm: "free" as const, seed })),
];

const runs = load();
const done = new Set(runs.map((r) => `${r.arm}:${r.seed}`));
write(buildOriginReport(runs));
console.log(`resume ${runs.length}`);

for (const job of jobs) {
  const key = `${job.arm}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  try {
    runs.push(await runOne(job.arm, job.seed));
    done.add(key);
    write(buildOriginReport(runs));
  } catch (e) {
    if (e instanceof CreditsError) {
      console.error("ABORT: API credits exhausted. Not writing a poisoned run.");
      write(buildOriginReport(runs));
      process.exit(1);
    }
    throw e;
  }
}

const final = buildOriginReport(runs);
write(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
