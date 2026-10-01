import { mkdirSync, writeFileSync } from "node:fs";
import { LLM_CONFIG, grokChat, hasChatApiKey, mapPool } from "./llm.ts";
import {
  SHADOW_CALIBRATION_TRUTH,
  parseShadowProbe,
  shadowCalibrationPrompt,
  type ShadowCalibrationWorld,
} from "./epistemic-shadow.ts";

const DATA_PATH = "src/data/epistemic-shadow-gates-v2.json";
const PUBLIC_PATH = "public/data/epistemic-shadow-gates-v2.json";
const REPLICATES = 4;
const WORLDS = Object.keys(SHADOW_CALIBRATION_TRUTH) as ShadowCalibrationWorld[];

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

const jobs = WORLDS.flatMap((world) =>
  Array.from({ length: REPLICATES }, (_, replicate) => ({ world, replicate })),
);

const trials = await mapPool(jobs, 4, async ({ world, replicate }) => {
  const response = await grokChat({
    prompt: shadowCalibrationPrompt(world, replicate),
    system: "Follow the certified calibration facts. Return only the requested JSON object.",
    maxTokens: 48,
    temperature: 0,
    json: true,
  });
  if (!response.ok) throw new Error(`shadow calibration ${world}:${replicate}: ${response.error}`);
  const parsed = parseShadowProbe(response.text);
  const truth = SHADOW_CALIBRATION_TRUTH[world];
  return {
    world,
    replicate,
    parsed,
    truth,
    exact:
      parsed.wouldSell === truth.wouldSell &&
      parsed.firstCount === truth.firstCount &&
      parsed.secondCount === truth.secondCount,
  };
});

const byWorld = Object.fromEntries(
  WORLDS.map((world) => {
    const selected = trials.filter((trial) => trial.world === world);
    return [world, {
      exact: selected.filter((trial) => trial.exact).length,
      n: selected.length,
    }];
  }),
);
const exact = trials.filter((trial) => trial.exact).length;
const pass = exact === trials.length;
const report = {
  study: "E-SHADOW-GATES-V2-SEMANTIC-FIELDS",
  provider: LLM_CONFIG.provider,
  model: LLM_CONFIG.model,
  thinking: LLM_CONFIG.thinking,
  temperature: 0,
  worlds: WORLDS,
  replicatesPerWorld: REPLICATES,
  exact,
  n: trials.length,
  pass,
  byWorld,
  trials,
  verdict: pass ? "PASS — graded and dissociated count fields are usable" : "FAIL — do not run shadow Study E",
  generatedAt: new Date().toISOString(),
};

mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(report, null, 2);
writeFileSync(DATA_PATH, json);
writeFileSync(PUBLIC_PATH, json);
console.log(JSON.stringify({
  model: report.model,
  exact: `${report.exact}/${report.n}`,
  byWorld: report.byWorld,
  verdict: report.verdict,
}, null, 2));
