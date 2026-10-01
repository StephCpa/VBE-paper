import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildProviderHealthBracket,
  checkProviderHealthEraBaseline,
  compareProviderHealthBrackets,
  createProviderHealthEraBaseline,
  type ProviderHealthBracket,
  type ProviderHealthEraBaseline,
  type ProviderHealthEraBaselineCheck,
  type ProviderHealthPlan,
} from "./provider-health.ts";
import { fetchProviderModelCatalog, runProviderHealthRecords } from "./provider-health-execution.ts";
import { LLM_CONFIG } from "./llm.ts";

type StoredHealth = {
  plan: ProviderHealthPlan;
  pre: ProviderHealthBracket;
  eraBaselineCheck: ProviderHealthEraBaselineCheck;
  post?: ProviderHealthBracket;
  comparison?: ReturnType<typeof compareProviderHealthBrackets>;
  eraBaselineEstablished?: ProviderHealthEraBaseline;
  updatedAt: string;
};

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadPlan(path: string): ProviderHealthPlan {
  const plan = JSON.parse(readFileSync(path, "utf8")) as ProviderHealthPlan;
  if (plan.protocolVersion !== "1.1") throw new Error("provider-health plan protocolVersion must be 1.1");
  if (!plan.studyId || !plan.outputPath.startsWith("src/data/provider-health-") || !plan.outputPath.endsWith(".json")) throw new Error("invalid provider-health plan identity/outputPath");
  if (!plan.servingEraId || !["establish", "compare"].includes(plan.eraBaselineMode)) throw new Error("invalid serving-era baseline declaration");
  if (!plan.eraBaselinePath.startsWith("src/data/provider-era-baseline-") || !plan.eraBaselinePath.endsWith(".json")) throw new Error("invalid eraBaselinePath");
  if (plan.eraBaselinePath === plan.outputPath) throw new Error("era baseline and bracket output paths must differ");
  if (plan.requestedModel !== LLM_CONFIG.model) throw new Error(`requested model mismatch ${plan.requestedModel} != ${LLM_CONFIG.model}`);
  if (!plan.allowedReturnedModels.length || !plan.expectedCatalogModels.length) throw new Error("plan must freeze allowed returned models and expected catalog models");
  if (!plan.expectedCatalogModels.includes(plan.requestedModel)) throw new Error("requested model must appear in the frozen account catalog");
  if (plan.historicalSentinelInterpretation !== "DESCRIPTIVE CROSS-ERA DRIFT ONLY — EXCLUDED FROM HEALTH GATES") throw new Error("historical sentinel interpretation must be frozen as descriptive-only");
  return plan;
}

function loadEraBaseline(plan: ProviderHealthPlan): ProviderHealthEraBaseline | undefined {
  if (!existsSync(plan.eraBaselinePath)) return undefined;
  return JSON.parse(readFileSync(plan.eraBaselinePath, "utf8")) as ProviderHealthEraBaseline;
}

const phase = arg("--phase");
const planPath = arg("--plan");
if ((phase !== "pre" && phase !== "post") || !planPath) throw new Error("usage: run-provider-health.ts --plan <path> --phase pre|post");
const plan = loadPlan(planPath);
const existingEraBaseline = loadEraBaseline(plan);
if (phase === "pre" && plan.eraBaselineMode === "establish" && existingEraBaseline) throw new Error(`refusing to replace existing era baseline ${plan.eraBaselinePath}`);
if (phase === "pre" && plan.eraBaselineMode === "compare" && !existingEraBaseline) throw new Error(`missing era baseline ${plan.eraBaselinePath}`);
const catalog = await fetchProviderModelCatalog();

if (phase === "pre") {
  if (existsSync(plan.outputPath)) throw new Error(`refusing to overwrite existing bracket ${plan.outputPath}`);
  const pre = buildProviderHealthBracket("pre", await runProviderHealthRecords("pre"), catalog, plan);
  const eraBaselineCheck = checkProviderHealthEraBaseline(plan, pre, existingEraBaseline);
  const stored: StoredHealth = { plan, pre, eraBaselineCheck, updatedAt: new Date().toISOString() };
  mkdirSync(dirname(plan.outputPath), { recursive: true });
  writeFileSync(plan.outputPath, JSON.stringify(stored, null, 2));
  console.log(JSON.stringify({ phase, healthy: pre.healthy && eraBaselineCheck.passed, metrics: pre.metrics, gates: pre.gates, eraBaselineCheck }, null, 2));
  if (!pre.healthy || !eraBaselineCheck.passed) process.exitCode = 2;
} else {
  if (!existsSync(plan.outputPath)) throw new Error(`missing pre bracket ${plan.outputPath}`);
  const stored = JSON.parse(readFileSync(plan.outputPath, "utf8")) as StoredHealth;
  if (stored.post) throw new Error(`refusing to overwrite existing post bracket ${plan.outputPath}`);
  if (JSON.stringify(stored.plan) !== JSON.stringify(plan)) throw new Error("plan changed between brackets");
  if (!stored.pre.healthy || !stored.eraBaselineCheck.passed) throw new Error("pre-flight or era-baseline check failed; target calls were not authorized");
  const post = buildProviderHealthBracket("post", await runProviderHealthRecords("post"), catalog, plan);
  const comparison = compareProviderHealthBrackets(stored.pre, post);
  let eraBaselineEstablished: ProviderHealthEraBaseline | undefined;
  if (plan.eraBaselineMode === "establish" && comparison.bracketValid) {
    if (existsSync(plan.eraBaselinePath)) throw new Error(`refusing to replace existing era baseline ${plan.eraBaselinePath}`);
    eraBaselineEstablished = createProviderHealthEraBaseline(plan, post, new Date().toISOString());
    mkdirSync(dirname(plan.eraBaselinePath), { recursive: true });
    writeFileSync(plan.eraBaselinePath, JSON.stringify(eraBaselineEstablished, null, 2));
  }
  const next: StoredHealth = { ...stored, post, comparison, eraBaselineEstablished, updatedAt: new Date().toISOString() };
  writeFileSync(plan.outputPath, JSON.stringify(next, null, 2));
  console.log(JSON.stringify({ phase, healthy: post.healthy, metrics: post.metrics, gates: post.gates, comparison, eraBaselineEstablished }, null, 2));
  if (!comparison.bracketValid) process.exitCode = 2;
}
