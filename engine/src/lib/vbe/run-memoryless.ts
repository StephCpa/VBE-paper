import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { grokChat, parseProposal } from "./llm.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import { idleProposal } from "./robots.ts";
import { runPopulationAsync } from "./env.ts";
import { ANNOUNCE } from "./unconfound.ts";
import { giftSlice, saleSlice } from "./minority.ts";
import { invasionCell } from "./invasion.ts";
import {
  MEMORYLESS,
  buildMemorylessReport,
  robotMemoryless,
  type MemorylessReport,
  type MemorylessRun,
} from "./memoryless.ts";
import type { AgentState } from "./types.ts";

function load(): MemorylessReport | null {
  const path = "src/data/memoryless.json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as MemorylessReport;
  } catch {
    return null;
  }
}

function write(report: MemorylessReport) {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const json = JSON.stringify(report, null, 2);
  writeFileSync("src/data/memoryless.json", json);
  writeFileSync("public/data/memoryless.json", json);
}

async function runOne(kind: "label" | "announce", seed: number): Promise<MemorylessRun> {
  let calls = 0;
  let parseFails = 0;
  let apiFails = 0;
  const notice = kind === "announce" ? ANNOUNCE : "";
  const decide = async (me: AgentState, partner: AgentState, t: number) => {
    calls += 1;
    if (calls === 1 || t !== (decide as { _t?: number })._t) {
      (decide as { _t?: number })._t = t;
      console.log(`  k0 ${kind} seed=${seed} round ${t}/${MEMORYLESS.T} calls=${calls}`);
    }
    const r = await grokChat({
      prompt: meetingPrompt(me, partner, t, MEMORYLESS, "label", notice),
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
  const result = await runPopulationAsync(seed, decide, MEMORYLESS, true);
  const run: MemorylessRun = {
    kind,
    seed,
    calls,
    parseFails,
    apiFails,
    meanScore: result.meanScore,
    sales: saleSlice(result, MEMORYLESS.T),
    gifts: giftSlice(result, MEMORYLESS.T),
    result,
  };
  console.log(
    `done k0 ${kind} seed=${seed} sales ${run.sales.accepts}/${run.sales.offers} gifts ${run.gifts.accepts}/${run.gifts.offers} mean=${run.meanScore.toFixed(2)}`,
  );
  return run;
}

const existing = load();
console.log("robots K=0 …");
const robot = existing?.robot?.kw ? existing.robot : robotMemoryless(80);
console.log("invasion K=0 …");
const invasion =
  existing?.invasion?.nRuns === 80
    ? existing.invasion
    : invasionCell("altruist", "never", 80, MEMORYLESS);

const runs = existing?.runs ?? [];
const done = new Set(runs.map((r) => `${r.kind}:${r.seed}`));
write(buildMemorylessReport(runs, robot, invasion));
console.log(
  "robots",
  Object.fromEntries(Object.entries(robot).map(([k, v]) => [k, v.mean.toFixed(2)])),
);

const jobs: { kind: "label" | "announce"; seed: number }[] = [
  { kind: "label", seed: 17 },
  { kind: "label", seed: 29 },
  { kind: "label", seed: 41 },
  { kind: "announce", seed: 17 },
  { kind: "announce", seed: 29 },
  { kind: "announce", seed: 41 },
];

for (const job of jobs) {
  const key = `${job.kind}:${job.seed}`;
  if (done.has(key)) {
    console.log(`skip ${key}`);
    continue;
  }
  runs.push(await runOne(job.kind, job.seed));
  done.add(key);
  write(buildMemorylessReport(runs, robot, invasion));
}

const final = buildMemorylessReport(runs, robot, invasion);
write(final);
console.log("verdict", final.verdict);
console.log("caveat", final.caveat);
