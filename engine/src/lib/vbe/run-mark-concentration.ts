import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  CONCENTRATED_ALLOCATIONS,
  DIFFUSE_ALLOCATION,
  MARK_CONCENTRATION_SEEDS,
  buildMarkConcentrationReport,
  type MarkConcentrationBlock,
  type MarkConcentrationReport,
} from "./mark-concentration.ts";
import { runMarkConcentrationArm } from "./mark-concentration-execution.ts";

const DATA_PATH = "src/data/mark-concentration.json";
const PUBLIC_PATH = "public/data/mark-concentration.json";

function loadBlocks(): MarkConcentrationBlock[] {
  if (!existsSync(DATA_PATH)) return [];
  const report = JSON.parse(readFileSync(DATA_PATH, "utf8")) as MarkConcentrationReport;
  if (JSON.stringify(report.seeds) !== JSON.stringify(MARK_CONCENTRATION_SEEDS)) {
    throw new Error("existing concentration result uses different seeds");
  }
  return report.blocks;
}

function writeReport(report: MarkConcentrationReport): void {
  mkdirSync("src/data", { recursive: true });
  mkdirSync("public/data", { recursive: true });
  const text = JSON.stringify(report, null, 2);
  writeFileSync(DATA_PATH, text);
  writeFileSync(PUBLIC_PATH, text);
}

const blocks = loadBlocks();
const done = new Set(blocks.map((block) => block.seed));
for (const seed of MARK_CONCENTRATION_SEEDS) {
  if (done.has(seed)) continue;
  const diffuse = await runMarkConcentrationArm(seed, DIFFUSE_ALLOCATION);
  const concentrated = [];
  for (const allocation of CONCENTRATED_ALLOCATIONS) {
    concentrated.push(await runMarkConcentrationArm(seed, allocation));
  }
  blocks.push({ seed, diffuse, concentrated });
  done.add(seed);
  if (blocks.length % 32 === 0 || blocks.length === MARK_CONCENTRATION_SEEDS.length) {
    const report = buildMarkConcentrationReport(blocks);
    writeReport(report);
    console.log(`completed ${blocks.length}/${MARK_CONCENTRATION_SEEDS.length}`);
  }
}

const report = buildMarkConcentrationReport(blocks);
writeReport(report);
console.log(`verdict ${report.verdict}`);
console.log(JSON.stringify(report.metrics.futureTrades));
console.log(JSON.stringify(report.metrics.meanScore));
