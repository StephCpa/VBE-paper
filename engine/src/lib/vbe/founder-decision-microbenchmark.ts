import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";

export const MICRO_BLOCKS = Array.from({ length: 20 }, (_, i) => i + 1);
export const MICRO_ROLES = ["Easy", "Hard"] as const;
export type MicroRole = (typeof MICRO_ROLES)[number];
export const MICRO_SCORES = [0, 3] as const;
export type MicroScore = (typeof MICRO_SCORES)[number];
export const MICRO_MODES = [
  "certain-immediate",
  "lottery-immediate",
  "lottery-delayed",
  "trade-immediate",
  "trade-delayed",
] as const;
export type MicroMode = (typeof MICRO_MODES)[number];

export type MicroCell = { mode: MicroMode; role: MicroRole; score: MicroScore; id: string };
export const MICRO_CELLS: readonly MicroCell[] = MICRO_MODES.flatMap((mode) =>
  MICRO_ROLES.flatMap((role) => MICRO_SCORES.map((score) => ({
    mode,
    role,
    score,
    id: `${mode}|${role}|${score}`,
  }))),
);

export const MICRO_FACTOR_FLOOR = 0.15;
export const MICRO_ALPHA = 0.025;
export const MICRO_CELL_RATE_FLOOR = 0.75;
export const MICRO_CORE_RATE_FLOOR = 0.90;
export const MICRO_ARITHMETIC_FLOOR = 0.90;
export const MICRO_NUMERIC_TOLERANCE = 0.02;

export type MicroDecision = { publish: boolean; rationale: string };
export type MicroArithmetic = {
  expectedGross: number;
  expectedNet: number;
  minimumNet: number;
  dominantAction: "publish" | "silent";
  explanation?: string;
};

export type MicroRecord = {
  block: number;
  cellId: string;
  mode: MicroMode;
  role: MicroRole;
  score: MicroScore;
  decisionPosition: number;
  arithmeticPosition: number;
  promptHash: string;
  decision?: MicroDecision;
  arithmetic?: MicroArithmetic;
  arithmeticCorrect?: boolean;
};

export type MicroFactor = "score" | "role" | "delay" | "semantics";
export type MicroFactorEffect = PairedEffect & {
  exactUpperP: number | null;
  effectFloor: number;
  triggers: boolean;
  values: Array<{ block: number; delta: number }>;
};

export type MicroReport = {
  study: "VBE-I-M-FOUNDER-DECISION-MICROBENCHMARK";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-founder-decision-microbenchmark-protocol.md";
  model: string;
  blocks: number[];
  cells: MicroCell[];
  records: MicroRecord[];
  completeDecisionBlocks: number;
  completeArithmeticBlocks: number;
  decisionCalls: number;
  arithmeticCalls: number;
  byCell: Record<string, { n: number; published: number; rate: number; arithmeticAccuracy: number | null }>;
  corePublicationRate: number | null;
  arithmeticAccuracy: number | null;
  factorEffects: Partial<Record<MicroFactor, MicroFactorEffect>>;
  guardrails: {
    everyCellRateFloor: number;
    coreRateFloor: number;
    arithmeticFloor: number;
    minimumCellRate: number | null;
    everyCellPass: boolean;
    corePass: boolean;
    arithmeticPass: boolean;
    pass: boolean;
  };
  triggeredFactors: MicroFactor[];
  verdict:
    | "INCOMPLETE"
    | "KNOWN-DISTRIBUTION DOMINANCE ROBUST"
    | "ARITHMETIC OR REPRESENTATION FAILURE"
    | "STATE/DELAY/SEMANTICS DECISION SENSITIVITY"
    | "UNEXPLAINED DOMINANCE FAILURE";
  caveat: string;
  generatedAt: string;
};

function rotate<T>(xs: readonly T[], amount: number): T[] {
  const n = xs.length;
  const k = ((amount % n) + n) % n;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

export function decisionOrder(block: number): MicroCell[] {
  if (!MICRO_BLOCKS.includes(block)) throw new Error(`unexpected block ${block}`);
  return rotate(MICRO_CELLS, block - 1);
}

export function arithmeticOrder(block: number): MicroCell[] {
  if (!MICRO_BLOCKS.includes(block)) throw new Error(`unexpected block ${block}`);
  return rotate([...MICRO_CELLS].reverse(), block - 1);
}

function economics(mode: MicroMode): string {
  if (mode === "certain-immediate") {
    return "Exact publication costs 1.0 point and immediately pays a certain 2.0 points. Publication therefore changes your final score by +1.0 relative to silence.";
  }
  const semantic = mode.startsWith("lottery")
    ? "If you publish, the experiment system draws abstract payout units from this complete known distribution: 1 unit with probability 13/18, 2 units with probability 4/18, and 3 units with probability 1/18."
    : "If you publish, the number of actual qualifying future mark-for-check trades follows this complete known distribution: 1 trade with probability 13/18, 2 trades with probability 4/18, and 3 trades with probability 1/18. Current role does not limit your right to the payment; counterparties pay no fee.";
  const timing = mode.endsWith("immediate")
    ? "The system settles the payment immediately after this decision."
    : "The system settles the payment at the end of round 24. There is no time discount, default risk, liquidity penalty, or intervening use for these points.";
  return `Exact publication costs 1.0 point. ${semantic} Each unit or trade pays you 2.0 points. ${timing} Silence costs and pays 0. The distribution is guaranteed for this case, has no unlisted outcome, and publication is the only requirement for payment.`;
}

function microCaseText(cell: MicroCell, block: number): string {
  return `PUBLIC INSTITUTION AUTHORSHIP MICROBENCHMARK. You are self-interested and maximize only your own final score.

${economics(cell.mode)}
Negative balances are allowed. There is no bankruptcy, borrowing constraint, opportunity cost, or hidden consequence.

CURRENT STATE: case B${String(block).padStart(2, "0")}; role ${cell.role}; current score ${cell.score.toFixed(2)}.

CANDIDATE: publish the exact public rule "one mark per leftover check; zero transaction fee; no beneficiary." The rule is nonbinding and has no payoff other than the author contract above.`;
}

export function microDecisionPrompt(cell: MicroCell, block: number): string {
  return `${microCaseText(cell, block)}

Choose once. Return JSON only with exactly these fields:
{"publish":boolean,"rationale":"short private reason"}`;
}

export function microArithmeticPrompt(cell: MicroCell, block: number): string {
  return `${microCaseText(cell, block)}

CALCULATION PROBE ONLY. No decision from this response will be executed. Ignoring preferences, report the contract's expected gross payment from publication, expected net payoff of publication relative to silence after the 1.0 cost, minimum possible net payoff, and the payoff-dominant action.

Return JSON only with exactly these fields:
{"expectedGross":number,"expectedNet":number,"minimumNet":number,"dominantAction":"publish|silent"}`;
}

function extractObject(text: string): Record<string, unknown> {
  const candidates: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const value = JSON.parse(candidates[i]!) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch { /* try the preceding balanced object */ }
  }
  throw new Error("missing valid JSON object");
}

function exactKeys(obj: Record<string, unknown>, keys: string[]): void {
  if (JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error("response fields do not match frozen contract");
  }
}

export function parseMicroDecision(text: string): MicroDecision {
  const obj = extractObject(text);
  exactKeys(obj, ["publish", "rationale"]);
  if (typeof obj.publish !== "boolean" || typeof obj.rationale !== "string") throw new Error("invalid decision types");
  return { publish: obj.publish, rationale: obj.rationale };
}

export function parseMicroArithmetic(text: string): MicroArithmetic {
  const obj = extractObject(text);
  const keys = Object.keys(obj).sort();
  const v1 = ["dominantAction", "expectedGross", "expectedNet", "explanation", "minimumNet"];
  const v2 = ["dominantAction", "expectedGross", "expectedNet", "minimumNet"];
  if (JSON.stringify(keys) !== JSON.stringify(v1) && JSON.stringify(keys) !== JSON.stringify(v2)) throw new Error("response fields do not match frozen arithmetic contract");
  for (const key of ["expectedGross", "expectedNet", "minimumNet"] as const) {
    if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) throw new Error(`invalid ${key}`);
  }
  if (obj.dominantAction !== "publish" && obj.dominantAction !== "silent") throw new Error("invalid dominantAction");
  if (obj.explanation !== undefined && typeof obj.explanation !== "string") throw new Error("invalid explanation");
  return obj as MicroArithmetic;
}

export function arithmeticTruth(mode: MicroMode): Pick<MicroArithmetic, "expectedGross" | "expectedNet" | "minimumNet" | "dominantAction"> {
  return mode === "certain-immediate"
    ? { expectedGross: 2, expectedNet: 1, minimumNet: 1, dominantAction: "publish" }
    : { expectedGross: 8 / 3, expectedNet: 5 / 3, minimumNet: 1, dominantAction: "publish" };
}

export function isArithmeticCorrect(mode: MicroMode, value: MicroArithmetic): boolean {
  const truth = arithmeticTruth(mode);
  return Math.abs(value.expectedGross - truth.expectedGross) <= MICRO_NUMERIC_TOLERANCE &&
    Math.abs(value.expectedNet - truth.expectedNet) <= MICRO_NUMERIC_TOLERANCE &&
    Math.abs(value.minimumNet - truth.minimumNet) <= MICRO_NUMERIC_TOLERANCE &&
    value.dominantAction === truth.dominantAction;
}

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function cellKey(record: Pick<MicroRecord, "mode" | "role" | "score">): string {
  return `${record.mode}|${record.role}|${record.score}`;
}

function complete(records: MicroRecord[], field: "decision" | "arithmetic"): number[] {
  return MICRO_BLOCKS.filter((block) => {
    const rs = records.filter((r) => r.block === block && r[field]);
    return rs.length === MICRO_CELLS.length && new Set(rs.map((r) => r.cellId)).size === MICRO_CELLS.length;
  });
}

function validateRecords(records: MicroRecord[]): void {
  const seen = new Set<string>();
  for (const r of records) {
    if (!MICRO_BLOCKS.includes(r.block)) throw new Error(`unexpected block ${r.block}`);
    const cell = MICRO_CELLS.find((c) => c.id === r.cellId);
    if (!cell || cell.mode !== r.mode || cell.role !== r.role || cell.score !== r.score) throw new Error(`cell invariant failed ${r.cellId}`);
    const key = `${r.block}|${r.cellId}`;
    if (seen.has(key)) throw new Error(`duplicate record ${key}`);
    seen.add(key);
    const expectedDecisionPosition = decisionOrder(r.block).findIndex((c) => c.id === r.cellId) + 1;
    const expectedArithmeticPosition = arithmeticOrder(r.block).findIndex((c) => c.id === r.cellId) + 1;
    if (r.decisionPosition !== expectedDecisionPosition || r.arithmeticPosition !== expectedArithmeticPosition) throw new Error(`position invariant failed ${key}`);
    if (!/^[0-9a-f]{64}$/.test(r.promptHash)) throw new Error(`prompt hash invalid ${key}`);
    if (r.arithmetic && r.arithmeticCorrect !== isArithmeticCorrect(r.mode, r.arithmetic)) throw new Error(`arithmetic coding invalid ${key}`);
    if (!r.arithmetic && r.arithmeticCorrect !== undefined) throw new Error(`orphan arithmetic coding ${key}`);
  }
}

function blockFactor(records: MicroRecord[], block: number, factor: MicroFactor): number {
  const rs = records.filter((r) => r.block === block && r.decision).map((r) => ({ ...r, y: Number(r.decision!.publish) }));
  if (rs.length !== MICRO_CELLS.length) throw new Error(`incomplete decision block ${block}`);
  if (factor === "score") return average(rs.filter((r) => r.score === 3).map((r) => r.y)) - average(rs.filter((r) => r.score === 0).map((r) => r.y));
  if (factor === "role") return average(rs.filter((r) => r.role === "Easy").map((r) => r.y)) - average(rs.filter((r) => r.role === "Hard").map((r) => r.y));
  const core = rs.filter((r) => r.mode !== "certain-immediate");
  if (factor === "delay") return average(core.filter((r) => r.mode.endsWith("immediate")).map((r) => r.y)) - average(core.filter((r) => r.mode.endsWith("delayed")).map((r) => r.y));
  return average(core.filter((r) => r.mode.startsWith("lottery")).map((r) => r.y)) - average(core.filter((r) => r.mode.startsWith("trade")).map((r) => r.y));
}

function factorEffect(records: MicroRecord[], blocks: number[], factor: MicroFactor): MicroFactorEffect {
  const values = blocks.map((block) => ({ block, delta: blockFactor(records, block, factor) }));
  const effect = pairedEffect(values.map((v) => v.delta));
  const exactUpperP = exactUpperSignFlipP(values.map((v) => v.delta), 0);
  return { ...effect, exactUpperP, effectFloor: MICRO_FACTOR_FLOOR, triggers: effect.mean >= MICRO_FACTOR_FLOOR && exactUpperP !== null && exactUpperP <= MICRO_ALPHA, values };
}

export function buildMicroReport(records: MicroRecord[], model: string): MicroReport {
  validateRecords(records);
  const decisionBlocks = complete(records, "decision");
  const arithmeticBlocks = complete(records, "arithmetic");
  const byCell: MicroReport["byCell"] = {};
  for (const cell of MICRO_CELLS) {
    const rs = records.filter((r) => cellKey(r) === cell.id);
    const decisions = rs.flatMap((r) => r.decision ? [r.decision] : []);
    const arithmetic = rs.filter((r) => r.arithmeticCorrect !== undefined);
    byCell[cell.id] = {
      n: decisions.length,
      published: decisions.filter((d) => d.publish).length,
      rate: decisions.length ? average(decisions.map((d) => Number(d.publish))) : 0,
      arithmeticAccuracy: arithmetic.length ? average(arithmetic.map((r) => Number(r.arithmeticCorrect))) : null,
    };
  }
  const allDecisions = records.filter((r) => r.decision);
  const core = allDecisions.filter((r) => r.mode !== "certain-immediate");
  const corePublicationRate = core.length ? average(core.map((r) => Number(r.decision!.publish))) : null;
  const allArithmetic = records.filter((r) => r.arithmeticCorrect !== undefined);
  const arithmeticAccuracy = allArithmetic.length ? average(allArithmetic.map((r) => Number(r.arithmeticCorrect))) : null;
  const factorEffects: MicroReport["factorEffects"] = {};
  if (decisionBlocks.length === MICRO_BLOCKS.length) {
    for (const factor of ["score", "role", "delay", "semantics"] as const) factorEffects[factor] = factorEffect(records, decisionBlocks, factor);
  }
  const rates = Object.values(byCell).map((x) => x.rate);
  const minimumCellRate = rates.length ? Math.min(...rates) : null;
  const completeAll = decisionBlocks.length === MICRO_BLOCKS.length && arithmeticBlocks.length === MICRO_BLOCKS.length;
  const everyCellPass = completeAll && minimumCellRate !== null && minimumCellRate >= MICRO_CELL_RATE_FLOOR;
  const corePass = completeAll && corePublicationRate !== null && corePublicationRate >= MICRO_CORE_RATE_FLOOR;
  const arithmeticPass = completeAll && arithmeticAccuracy !== null && arithmeticAccuracy >= MICRO_ARITHMETIC_FLOOR;
  const pass = everyCellPass && corePass && arithmeticPass;
  const triggeredFactors = (Object.keys(factorEffects) as MicroFactor[]).filter((f) => factorEffects[f]!.triggers);
  let verdict: MicroReport["verdict"] = "INCOMPLETE";
  if (completeAll) {
    if (pass) verdict = "KNOWN-DISTRIBUTION DOMINANCE ROBUST";
    else if (!arithmeticPass) verdict = "ARITHMETIC OR REPRESENTATION FAILURE";
    else if (triggeredFactors.length) verdict = "STATE/DELAY/SEMANTICS DECISION SENSITIVITY";
    else verdict = "UNEXPLAINED DOMINANCE FAILURE";
  }
  return {
    study: "VBE-I-M-FOUNDER-DECISION-MICROBENCHMARK",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-founder-decision-microbenchmark-protocol.md",
    model,
    blocks: [...MICRO_BLOCKS],
    cells: [...MICRO_CELLS],
    records,
    completeDecisionBlocks: decisionBlocks.length,
    completeArithmeticBlocks: arithmeticBlocks.length,
    decisionCalls: allDecisions.length,
    arithmeticCalls: allArithmetic.length,
    byCell,
    corePublicationRate,
    arithmeticAccuracy,
    factorEffects,
    guardrails: {
      everyCellRateFloor: MICRO_CELL_RATE_FLOOR,
      coreRateFloor: MICRO_CORE_RATE_FLOOR,
      arithmeticFloor: MICRO_ARITHMETIC_FLOOR,
      minimumCellRate,
      everyCellPass,
      corePass,
      arithmeticPass,
      pass,
    },
    triggeredFactors,
    verdict,
    caveat: "The benchmark replaces I-T's unknown current-run trade distribution with a complete known distribution whose worst outcome is profitable. It diagnoses decision-interface sensitivity, not real adoption-risk estimation, participant-paid fees, or cross-model generality.",
    generatedAt: new Date().toISOString(),
  };
}
