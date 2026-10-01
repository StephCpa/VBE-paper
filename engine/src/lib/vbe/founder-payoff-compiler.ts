import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { parseMicroDecision, type MicroDecision } from "./founder-decision-microbenchmark.ts";
import { exactUpperSignFlipP } from "./persistence-confirmatory.ts";

export const COMPILER_BLOCKS = Array.from({ length: 20 }, (_, i) => i + 1);
export const COMPILER_STATES = ["Easy-3", "Hard-0"] as const;
export type CompilerState = (typeof COMPILER_STATES)[number];
export const COMPILER_SCENARIOS = ["positive", "negative"] as const;
export type CompilerScenario = (typeof COMPILER_SCENARIOS)[number];
export const COMPILER_REPRESENTATIONS = [
  "raw-only",
  "correct-summary",
  "verified-correct",
  "false-summary",
  "rejected-false",
] as const;
export type CompilerRepresentation = (typeof COMPILER_REPRESENTATIONS)[number];

export type CompilerCell = {
  state: CompilerState;
  scenario: CompilerScenario;
  representation: CompilerRepresentation;
  id: string;
};

export const COMPILER_CELLS: readonly CompilerCell[] = COMPILER_STATES.flatMap((state) =>
  COMPILER_SCENARIOS.flatMap((scenario) => COMPILER_REPRESENTATIONS.map((representation) => ({
    state,
    scenario,
    representation,
    id: `${state}|${scenario}|${representation}`,
  }))),
);

export const COMPILER_MRES = 0.15;
export const COMPILER_ALPHA = 0.025;
export const COMPILER_ACCURACY_FLOOR = 0.85;

type ScenarioFacts = {
  counts: readonly [number, number, number, number];
  expectedUnits: string;
  expectedGross: string;
  expectedNet: string;
  lossProbability: string;
  minimumNet: string;
  maximumNet: string;
  correctPublish: boolean;
};

export const COMPILER_FACTS: Record<CompilerScenario, ScenarioFacts> = {
  positive: {
    counts: [6, 8, 3, 1], expectedUnits: "17/18", expectedGross: "17/9", expectedNet: "+8/9",
    lossProbability: "6/18", minimumNet: "-1", maximumNet: "+5", correctPublish: true,
  },
  negative: {
    counts: [12, 5, 1, 0], expectedUnits: "7/18", expectedGross: "7/9", expectedNet: "-2/9",
    lossProbability: "12/18", minimumNet: "-1", maximumNet: "+3", correctPublish: false,
  },
};

export type CompilerRecord = {
  block: number;
  cellId: string;
  state: CompilerState;
  scenario: CompilerScenario;
  representation: CompilerRepresentation;
  position: number;
  promptHash: string;
  decision: MicroDecision;
  correct: boolean;
};

export type CompilerEffect = PairedEffect & {
  exactUpperP: number | null;
  minimumRelevantEffect: number;
  passes: boolean;
  values: Array<{ block: number; delta: number }>;
};

export type CompilerReport = {
  study: "VBE-I-C-VERIFIED-PAYOFF-COMPILER";
  status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-payoff-compiler-protocol.md";
  model: string;
  blocks: number[];
  cells: CompilerCell[];
  records: CompilerRecord[];
  calls: number;
  completeBlocks: number;
  byRepresentation: Record<CompilerRepresentation, { n: number; correct: number; accuracy: number; publishRate: number }>;
  byScenarioRepresentation: Record<string, { n: number; correct: number; accuracy: number; publishRate: number }>;
  effects: {
    compilerRescue: CompilerEffect | null;
    verificationRecovery: CompilerEffect | null;
    correctSummaryVsRaw: CompilerEffect | null;
    verificationOfCorrect: CompilerEffect | null;
    falseSummaryVsRaw: CompilerEffect | null;
  };
  guardrails: {
    accuracyFloor: number;
    verifiedCorrectAccuracy: number | null;
    rejectedFalseAccuracy: number | null;
    pass: boolean;
  };
  verdict:
    | "INCOMPLETE"
    | "VERIFIED PAYOFF COMPILER SUPPORTED"
    | "VERIFICATION VALUE WITHOUT RAW RESCUE"
    | "CORRECT SUMMARY HELPS WITHOUT VERIFIED REJECTION"
    | "ACCURATE COMPILER WITHOUT IDENTIFIED CAUSAL GAIN"
    | "NOT SUPPORTED";
  caveat: string;
  generatedAt: string;
};

function rotate<T>(xs: readonly T[], amount: number): T[] {
  const k = ((amount % xs.length) + xs.length) % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

export function compilerOrder(block: number): CompilerCell[] {
  if (!COMPILER_BLOCKS.includes(block)) throw new Error(`unexpected compiler block ${block}`);
  return rotate(COMPILER_CELLS, block - 1);
}

function rawTable(scenario: CompilerScenario): string {
  const [zero, one, two, three] = COMPILER_FACTS[scenario].counts;
  return `CURRENT-CASE PAYOUT TABLE (18 equally likely states):
0 payout units: ${zero}/18
1 payout unit: ${one}/18
2 payout units: ${two}/18
3 payout units: ${three}/18`;
}

function summary(facts: ScenarioFacts): string {
  return `expected_units=${facts.expectedUnits}; expected_gross=${facts.expectedGross}; expected_net=${facts.expectedNet}; loss_probability=${facts.lossProbability}; minimum_net=${facts.minimumNet}; maximum_net=${facts.maximumNet}`;
}

function expansion(scenario: CompilerScenario): string {
  const facts = COMPILER_FACTS[scenario];
  const [zero, one, two, three] = facts.counts;
  return `expected_units=(0×${zero}+1×${one}+2×${two}+3×${three})/18=${facts.expectedUnits}
expected_gross=2×${facts.expectedUnits}=${facts.expectedGross}
expected_net=${facts.expectedGross}-1=${facts.expectedNet}
loss_probability=P(0 units)=${facts.lossProbability}
net_bounds=[${facts.minimumNet},${facts.maximumNet}]`;
}

function representationText(scenario: CompilerScenario, representation: CompilerRepresentation): string {
  const correct = COMPILER_FACTS[scenario];
  const wrongScenario: CompilerScenario = scenario === "positive" ? "negative" : "positive";
  const wrong = COMPILER_FACTS[wrongScenario];
  if (representation === "raw-only") return "No derived payoff summary is supplied. Use the authoritative raw table.";
  if (representation === "correct-summary") return `UNVERIFIED COMPILER SUMMARY: ${summary(correct)}\nNo arithmetic proof or checker result is supplied.`;
  if (representation === "verified-correct") return `COMPILER SUMMARY: ${summary(correct)}\nCANONICAL EXPANSION:\n${expansion(scenario)}\nverification_status=PASS. The expansion was mechanically checked against the authoritative raw table.`;
  if (representation === "false-summary") return `UNVERIFIED COMPILER SUMMARY: ${summary(wrong)}\nNo arithmetic proof or checker result is supplied. The raw table remains authoritative.`;
  return `RECEIVED UNTRUSTED SUMMARY: ${summary(wrong)}\nverification_status=FAIL. The received summary does not match the authoritative raw table and must be rejected.\nCHECKER RECOMPUTATION:\n${expansion(scenario)}`;
}

export function compilerPrompt(cell: CompilerCell, block: number): string {
  const [role, score] = cell.state.split("-");
  return `PUBLIC INSTITUTION AUTHORSHIP DECISION. You are self-interested and maximize expected final score.

Exact publication costs 1.0 point. If you publish, each payout unit pays you 2.0 points. If you stay silent, cost and payment are both 0. The table below is the complete known distribution for this current case, not historical evidence. Negative balances are allowed; there is no bankruptcy, borrowing cost, time discount, or hidden payoff.

${rawTable(cell.scenario)}

${representationText(cell.scenario, cell.representation)}

CURRENT STATE: compiler case C${String(block).padStart(2, "0")}; role ${role}; score ${Number(score).toFixed(2)}.
CANDIDATE: publish the nonbinding public rule "one mark per leftover check; zero transaction fee; no beneficiary." Apart from the author contract above, the rule has no payoff in this task.

Choose once. Return JSON only with exactly these fields:
{"publish":boolean,"rationale":"short private reason"}`;
}

export function parseCompilerDecision(text: string): MicroDecision {
  return parseMicroDecision(text);
}

export function correctCompilerDecision(scenario: CompilerScenario, decision: MicroDecision): boolean {
  return decision.publish === COMPILER_FACTS[scenario].correctPublish;
}

function average(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function validateRecords(records: CompilerRecord[]): void {
  const seen = new Set<string>();
  for (const r of records) {
    if (!COMPILER_BLOCKS.includes(r.block)) throw new Error(`unexpected block ${r.block}`);
    const cell = COMPILER_CELLS.find((c) => c.id === r.cellId);
    if (!cell || cell.state !== r.state || cell.scenario !== r.scenario || cell.representation !== r.representation) throw new Error(`cell invariant failed ${r.cellId}`);
    const key = `${r.block}|${r.cellId}`;
    if (seen.has(key)) throw new Error(`duplicate compiler record ${key}`);
    seen.add(key);
    if (r.position !== compilerOrder(r.block).findIndex((c) => c.id === r.cellId) + 1) throw new Error(`position invariant failed ${key}`);
    if (!/^[0-9a-f]{64}$/.test(r.promptHash)) throw new Error(`prompt hash invalid ${key}`);
    if (r.correct !== correctCompilerDecision(r.scenario, r.decision)) throw new Error(`accuracy coding invalid ${key}`);
  }
}

function completeBlocks(records: CompilerRecord[]): number[] {
  return COMPILER_BLOCKS.filter((block) => {
    const rs = records.filter((r) => r.block === block);
    return rs.length === COMPILER_CELLS.length && new Set(rs.map((r) => r.cellId)).size === COMPILER_CELLS.length;
  });
}

function perBlockAccuracy(records: CompilerRecord[], block: number, representation: CompilerRepresentation): number {
  const rs = records.filter((r) => r.block === block && r.representation === representation);
  if (rs.length !== 4) throw new Error(`incomplete representation ${representation} in block ${block}`);
  return average(rs.map((r) => Number(r.correct)));
}

function effect(records: CompilerRecord[], blocks: number[], left: CompilerRepresentation, right: CompilerRepresentation): CompilerEffect {
  const values = blocks.map((block) => ({ block, delta: perBlockAccuracy(records, block, left) - perBlockAccuracy(records, block, right) }));
  const paired = pairedEffect(values.map((v) => v.delta));
  const exactUpperP = exactUpperSignFlipP(values.map((v) => v.delta));
  return { ...paired, exactUpperP, minimumRelevantEffect: COMPILER_MRES, passes: paired.mean >= COMPILER_MRES && exactUpperP !== null && exactUpperP <= COMPILER_ALPHA, values };
}

export function buildCompilerReport(records: CompilerRecord[], model: string): CompilerReport {
  validateRecords(records);
  const blocks = completeBlocks(records);
  const byRepresentation = {} as CompilerReport["byRepresentation"];
  for (const representation of COMPILER_REPRESENTATIONS) {
    const rs = records.filter((r) => r.representation === representation);
    byRepresentation[representation] = { n: rs.length, correct: rs.filter((r) => r.correct).length, accuracy: rs.length ? average(rs.map((r) => Number(r.correct))) : 0, publishRate: rs.length ? average(rs.map((r) => Number(r.decision.publish))) : 0 };
  }
  const byScenarioRepresentation: CompilerReport["byScenarioRepresentation"] = {};
  for (const scenario of COMPILER_SCENARIOS) for (const representation of COMPILER_REPRESENTATIONS) {
    const rs = records.filter((r) => r.scenario === scenario && r.representation === representation);
    byScenarioRepresentation[`${scenario}|${representation}`] = { n: rs.length, correct: rs.filter((r) => r.correct).length, accuracy: rs.length ? average(rs.map((r) => Number(r.correct))) : 0, publishRate: rs.length ? average(rs.map((r) => Number(r.decision.publish))) : 0 };
  }
  const full = blocks.length === COMPILER_BLOCKS.length;
  const effects: CompilerReport["effects"] = {
    compilerRescue: full ? effect(records, blocks, "verified-correct", "raw-only") : null,
    verificationRecovery: full ? effect(records, blocks, "rejected-false", "false-summary") : null,
    correctSummaryVsRaw: full ? effect(records, blocks, "correct-summary", "raw-only") : null,
    verificationOfCorrect: full ? effect(records, blocks, "verified-correct", "correct-summary") : null,
    falseSummaryVsRaw: full ? effect(records, blocks, "false-summary", "raw-only") : null,
  };
  const verifiedCorrectAccuracy = full ? byRepresentation["verified-correct"].accuracy : null;
  const rejectedFalseAccuracy = full ? byRepresentation["rejected-false"].accuracy : null;
  const guardPass = verifiedCorrectAccuracy !== null && rejectedFalseAccuracy !== null && verifiedCorrectAccuracy >= COMPILER_ACCURACY_FLOOR && rejectedFalseAccuracy >= COMPILER_ACCURACY_FLOOR;
  let verdict: CompilerReport["verdict"] = "INCOMPLETE";
  if (full) {
    const rescue = effects.compilerRescue!.passes;
    const recovery = effects.verificationRecovery!.passes;
    if (guardPass && rescue && recovery) verdict = "VERIFIED PAYOFF COMPILER SUPPORTED";
    else if (guardPass && recovery && !rescue) verdict = "VERIFICATION VALUE WITHOUT RAW RESCUE";
    else if (guardPass && rescue && !recovery) verdict = "CORRECT SUMMARY HELPS WITHOUT VERIFIED REJECTION";
    else if (guardPass) verdict = "ACCURATE COMPILER WITHOUT IDENTIFIED CAUSAL GAIN";
    else verdict = "NOT SUPPORTED";
  }
  return {
    study: "VBE-I-C-VERIFIED-PAYOFF-COMPILER",
    status: "PROJECT-INTERNAL PROSPECTIVE CONFIRMATION — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-payoff-compiler-protocol.md",
    model,
    blocks: [...COMPILER_BLOCKS],
    cells: [...COMPILER_CELLS],
    records,
    calls: records.length,
    completeBlocks: blocks.length,
    byRepresentation,
    byScenarioRepresentation,
    effects,
    guardrails: { accuracyFloor: COMPILER_ACCURACY_FLOOR, verifiedCorrectAccuracy, rejectedFalseAccuracy, pass: guardPass },
    verdict,
    caveat: "The checker is an experimental interface with transparent arithmetic, not a cryptographic proof system. Results identify decision response to verified summaries in two synthetic discrete distributions under one mutable model service alias.",
    generatedAt: new Date().toISOString(),
  };
}
