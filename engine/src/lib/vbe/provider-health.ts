import { createHash } from "node:crypto";
import { parseBuyerProposal } from "./buyer-capability.ts";
import { buyerTemporalPrompt, loadBuyerTemporalCases } from "./buyer-temporal-replay.ts";
import type { ProviderObservation } from "./observed-chat.ts";
import type { Proposal } from "./types.ts";

export const PROVIDER_HEALTH_PROTOCOL_VERSION = "1.1" as const;
export const PROVIDER_HEALTH_THRESHOLDS = {
  expectedCalls: 14,
  minimumUniqueRawResponses: 4,
  minimumRawEntropyBits: 1.25,
  positiveBuyRate: 0.75,
  negativeBuyRate: 0.25,
  exactControlRate: 1,
} as const;

export type ProviderHealthAnchorKind = "external-control" | "dominant-positive" | "dominant-negative" | "historical-sentinel";
export type ProviderHealthPhase = "pre" | "post";

export type ProviderHealthPlan = {
  protocolVersion: "1.1";
  studyId: string;
  servingEraId: string;
  eraBaselineMode: "establish" | "compare";
  eraBaselinePath: string;
  requestedModel: string;
  allowedReturnedModels: string[];
  expectedCatalogModels: string[];
  requireFingerprint: boolean;
  historicalSentinelInterpretation: "DESCRIPTIVE CROSS-ERA DRIFT ONLY — EXCLUDED FROM HEALTH GATES";
  outputPath: string;
};

export type ProviderHealthEraBaseline = {
  protocolVersion: "1.1";
  servingEraId: string;
  establishedFromStudyId: string;
  establishedAt: string;
  requestedModel: string;
  catalogModels: string[];
  returnedModels: string[];
  fingerprints: string[];
  promptHashes: string[];
  historicalSentinelInterpretation: ProviderHealthPlan["historicalSentinelInterpretation"];
};

export type ProviderHealthEraBaselineCheck = {
  mode: ProviderHealthPlan["eraBaselineMode"];
  status: "FIRST RUN — PENDING HEALTHY POST" | "BASELINE MATCHED" | "BASELINE MISMATCH";
  passed: boolean;
  comparisons: {
    servingEra: boolean;
    requestedModel: boolean;
    catalogModels: boolean;
    returnedModels: boolean;
    fingerprints: boolean;
    promptHashes: boolean;
  };
};

export type ProviderHealthAnchor = {
  id: string;
  kind: ProviderHealthAnchorKind;
  prompt: string;
  expectedProposal?: Proposal;
};

export type ProviderHealthRecord = {
  phase: ProviderHealthPhase;
  position: number;
  anchorId: string;
  kind: ProviderHealthAnchorKind;
  promptHash: string;
  requestBodySha256: string;
  rawResponse: string;
  rawResponseSha256: string;
  proposal: Proposal;
  provider: ProviderObservation;
};

export type ProviderHealthBracket = {
  phase: ProviderHealthPhase;
  calls: number;
  catalogModels: string[];
  records: ProviderHealthRecord[];
  metrics: {
    uniqueRawResponses: number;
    rawEntropyBits: number;
    externalControlsExact: number;
    externalControlsN: number;
    positiveBuys: number;
    positiveN: number;
    positiveBuyRate: number;
    negativeBuys: number;
    negativeN: number;
    negativeBuyRate: number;
    historicalSentinels: Array<{ anchorId: string; buy: boolean; rawResponseSha256: string }>;
    returnedModels: string[];
    fingerprints: string[];
  };
  gates: {
    complete: boolean;
    catalogExact: boolean;
    promptsExact: boolean;
    rawHashesValid: boolean;
    instrumentationComplete: boolean;
    returnedModelsAllowed: boolean;
    fingerprintPresentIfRequired: boolean;
    singleFingerprint: boolean;
    externalControlsExact: boolean;
    positiveRate: boolean;
    negativeRate: boolean;
    responseDiversity: boolean;
  };
  healthy: boolean;
};

export type ProviderHealthComparison = {
  preHealthy: boolean;
  postHealthy: boolean;
  promptHashesMatched: boolean;
  returnedModelsMatched: boolean;
  fingerprintsMatched: boolean;
  bracketValid: boolean;
  verdict: "BRACKET HEALTHY" | "PRE-FLIGHT FAILED" | "POST-FLIGHT FAILED" | "BRACKET IDENTITY CHANGED";
};

export function sha256ProviderHealth(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function controlPrompt(label: string, question: string, correct: Proposal, incorrect: Proposal): string {
  return `PROVIDER HEALTH CONTROL ${label}. This is not an economic decision. ${question}\nIf the statement is true, reply exactly ${JSON.stringify(correct)}. If false, reply exactly ${JSON.stringify(incorrect)}.`;
}

function dominancePrompt(label: string, buyGain: number, keepGain: number): string {
  return `PROVIDER HEALTH DOMINANCE ${label}. This case overrides the ordinary mark continuation described above. The game ends immediately after this choice. Transferring one mark now with giveChits=1 yields exactly ${buyGain.toFixed(2)} points to you; keeping it with giveChits=0 yields exactly ${keepGain.toFixed(2)} points. No other field affects payoff. Set giveCheck=false and requireChit=false. Maximize your own score and reply with the three-field JSON only.`;
}

export function providerHealthAnchors(): ProviderHealthAnchor[] {
  const a: Proposal = { giveCheck: false, giveChits: 1, requireChit: false };
  const b: Proposal = { giveCheck: true, giveChits: 0, requireChit: false };
  const c: Proposal = { giveCheck: true, giveChits: 0, requireChit: true };
  const d: Proposal = { giveCheck: false, giveChits: 0, requireChit: false };
  const cases = loadBuyerTemporalCases();
  return [
    { id: "control-arithmetic", kind: "external-control", prompt: controlPrompt("A", "The statement is: 2 + 2 = 4.", a, d), expectedProposal: a },
    { id: "control-order", kind: "external-control", prompt: controlPrompt("B", "The statement is: 9 is less than 4.", d, b), expectedProposal: b },
    { id: "control-count", kind: "external-control", prompt: controlPrompt("C", "The statement is: the string abc has exactly three characters.", c, d), expectedProposal: c },
    { id: "control-parity", kind: "external-control", prompt: controlPrompt("D", "The statement is: 7 is even.", a, d), expectedProposal: d },
    ...[2, 3, 5, 8].map((gain, index) => ({
      id: `dominant-positive-${index + 1}`,
      kind: "dominant-positive" as const,
      prompt: dominancePrompt(`POS-${index + 1}`, gain, 0),
    })),
    ...[1, 2, 3, 5].map((keep, index) => ({
      id: `dominant-negative-${index + 1}`,
      kind: "dominant-negative" as const,
      prompt: dominancePrompt(`NEG-${index + 1}`, 0, keep),
    })),
    { id: "historical-wrapper-narrow", kind: "historical-sentinel", prompt: buyerTemporalPrompt("historical-wrapper-narrow", cases[0]!) },
    { id: "historical-high-guaranteed", kind: "historical-sentinel", prompt: buyerTemporalPrompt("historical-high-guaranteed-control", cases[0]!) },
  ];
}

function entropyBits(values: string[]): number {
  if (!values.length) return 0;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return -[...counts.values()].reduce((sum, count) => {
    const p = count / values.length;
    return sum + p * Math.log2(p);
  }, 0);
}

function sameProposal(a: Proposal, b: Proposal): boolean {
  return a.giveCheck === b.giveCheck && a.giveChits === b.giveChits && a.requireChit === b.requireChit;
}

export function buildProviderHealthBracket(
  phase: ProviderHealthPhase,
  records: ProviderHealthRecord[],
  catalogModels: string[],
  plan: ProviderHealthPlan,
): ProviderHealthBracket {
  const anchors = providerHealthAnchors();
  const byId = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const expectedPromptHashes = new Map(anchors.map((anchor) => [anchor.id, sha256ProviderHealth(anchor.prompt)]));
  const controls = records.filter((record) => record.kind === "external-control");
  const positive = records.filter((record) => record.kind === "dominant-positive");
  const negative = records.filter((record) => record.kind === "dominant-negative");
  const returnedModels = [...new Set(records.map((record) => record.provider.returnedModel).filter((value): value is string => Boolean(value)))].sort();
  const fingerprints = [...new Set(records.map((record) => record.provider.systemFingerprint).filter((value): value is string => Boolean(value)))].sort();
  const positiveBuys = positive.filter((record) => record.proposal.giveChits === 1).length;
  const negativeBuys = negative.filter((record) => record.proposal.giveChits === 1).length;
  const externalControlsExact = controls.filter((record) => {
    const expected = byId.get(record.anchorId)?.expectedProposal;
    return expected !== undefined && sameProposal(record.proposal, expected);
  }).length;
  const uniqueRawResponses = new Set(records.map((record) => record.rawResponse)).size;
  const metrics = {
    uniqueRawResponses,
    rawEntropyBits: entropyBits(records.map((record) => record.rawResponse)),
    externalControlsExact,
    externalControlsN: controls.length,
    positiveBuys,
    positiveN: positive.length,
    positiveBuyRate: positive.length ? positiveBuys / positive.length : 0,
    negativeBuys,
    negativeN: negative.length,
    negativeBuyRate: negative.length ? negativeBuys / negative.length : 1,
    historicalSentinels: records.filter((record) => record.kind === "historical-sentinel").map((record) => ({
      anchorId: record.anchorId,
      buy: record.proposal.giveChits === 1,
      rawResponseSha256: record.rawResponseSha256,
    })),
    returnedModels,
    fingerprints,
  };
  const gates = {
    complete: records.length === PROVIDER_HEALTH_THRESHOLDS.expectedCalls
      && new Set(records.map((record) => record.anchorId)).size === PROVIDER_HEALTH_THRESHOLDS.expectedCalls,
    catalogExact: JSON.stringify([...catalogModels].sort()) === JSON.stringify([...plan.expectedCatalogModels].sort()),
    promptsExact: records.every((record) => record.promptHash === expectedPromptHashes.get(record.anchorId)),
    rawHashesValid: records.every((record) => record.rawResponseSha256 === sha256ProviderHealth(record.rawResponse)),
    instrumentationComplete: records.every((record) => Boolean(record.provider.responseId) && Boolean(record.provider.returnedModel)),
    returnedModelsAllowed: returnedModels.length > 0 && returnedModels.every((model) => plan.allowedReturnedModels.includes(model)),
    fingerprintPresentIfRequired: !plan.requireFingerprint || records.every((record) => Boolean(record.provider.systemFingerprint)),
    singleFingerprint: plan.requireFingerprint ? fingerprints.length === 1 : fingerprints.length <= 1,
    externalControlsExact: controls.length === 4 && externalControlsExact / controls.length >= PROVIDER_HEALTH_THRESHOLDS.exactControlRate,
    positiveRate: positive.length === 4 && metrics.positiveBuyRate >= PROVIDER_HEALTH_THRESHOLDS.positiveBuyRate,
    negativeRate: negative.length === 4 && metrics.negativeBuyRate <= PROVIDER_HEALTH_THRESHOLDS.negativeBuyRate,
    responseDiversity: uniqueRawResponses >= PROVIDER_HEALTH_THRESHOLDS.minimumUniqueRawResponses
      && metrics.rawEntropyBits >= PROVIDER_HEALTH_THRESHOLDS.minimumRawEntropyBits,
  };
  return { phase, calls: records.length, catalogModels: [...catalogModels].sort(), records, metrics, gates, healthy: Object.values(gates).every(Boolean) };
}

export function compareProviderHealthBrackets(pre: ProviderHealthBracket, post: ProviderHealthBracket): ProviderHealthComparison {
  const promptHashesMatched = JSON.stringify(pre.records.map((record) => record.promptHash)) === JSON.stringify(post.records.map((record) => record.promptHash));
  const returnedModelsMatched = JSON.stringify(pre.metrics.returnedModels) === JSON.stringify(post.metrics.returnedModels);
  const fingerprintsMatched = JSON.stringify(pre.metrics.fingerprints) === JSON.stringify(post.metrics.fingerprints);
  const bracketValid = pre.healthy && post.healthy && promptHashesMatched && returnedModelsMatched && fingerprintsMatched;
  const verdict = !pre.healthy
    ? "PRE-FLIGHT FAILED"
    : !post.healthy
      ? "POST-FLIGHT FAILED"
      : !returnedModelsMatched || !fingerprintsMatched || !promptHashesMatched
        ? "BRACKET IDENTITY CHANGED"
        : "BRACKET HEALTHY";
  return { preHealthy: pre.healthy, postHealthy: post.healthy, promptHashesMatched, returnedModelsMatched, fingerprintsMatched, bracketValid, verdict };
}

export function createProviderHealthEraBaseline(
  plan: ProviderHealthPlan,
  bracket: ProviderHealthBracket,
  establishedAt: string,
): ProviderHealthEraBaseline {
  if (!bracket.healthy) throw new Error("cannot establish an era baseline from an unhealthy bracket");
  return {
    protocolVersion: PROVIDER_HEALTH_PROTOCOL_VERSION,
    servingEraId: plan.servingEraId,
    establishedFromStudyId: plan.studyId,
    establishedAt,
    requestedModel: plan.requestedModel,
    catalogModels: [...bracket.catalogModels],
    returnedModels: [...bracket.metrics.returnedModels],
    fingerprints: [...bracket.metrics.fingerprints],
    promptHashes: bracket.records.map((record) => record.promptHash),
    historicalSentinelInterpretation: plan.historicalSentinelInterpretation,
  };
}

export function checkProviderHealthEraBaseline(
  plan: ProviderHealthPlan,
  bracket: ProviderHealthBracket,
  baseline?: ProviderHealthEraBaseline,
): ProviderHealthEraBaselineCheck {
  if (plan.eraBaselineMode === "establish") {
    const absent = baseline === undefined;
    return {
      mode: "establish",
      status: absent ? "FIRST RUN — PENDING HEALTHY POST" : "BASELINE MISMATCH",
      passed: absent,
      comparisons: {
        servingEra: absent,
        requestedModel: absent,
        catalogModels: absent,
        returnedModels: absent,
        fingerprints: absent,
        promptHashes: absent,
      },
    };
  }
  const comparisons = {
    servingEra: baseline?.servingEraId === plan.servingEraId,
    requestedModel: baseline?.requestedModel === plan.requestedModel,
    catalogModels: JSON.stringify(baseline?.catalogModels) === JSON.stringify(bracket.catalogModels),
    returnedModels: JSON.stringify(baseline?.returnedModels) === JSON.stringify(bracket.metrics.returnedModels),
    fingerprints: JSON.stringify(baseline?.fingerprints) === JSON.stringify(bracket.metrics.fingerprints),
    promptHashes: JSON.stringify(baseline?.promptHashes) === JSON.stringify(bracket.records.map((record) => record.promptHash)),
  };
  const passed = baseline !== undefined && Object.values(comparisons).every(Boolean);
  return { mode: "compare", status: passed ? "BASELINE MATCHED" : "BASELINE MISMATCH", passed, comparisons };
}

export function parseProviderHealthProposal(raw: string): Proposal {
  return parseBuyerProposal(raw);
}
