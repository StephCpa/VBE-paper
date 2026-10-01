import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BUYER_CAPABILITY_CASES,
  buyerCapabilityPrompt,
  type BuyerCapabilityRecord,
  type BuyerCapabilityReport,
} from "./buyer-capability.ts";
import {
  buyerWrapperPrompt,
  loadBuyerWrapperCases,
  type BuyerWrapperRecord,
  type BuyerWrapperReport,
} from "./buyer-wrapper-disassembly.ts";
import type { ProviderObservation } from "./observed-chat.ts";
import { RULES } from "./prompts.ts";
import type { Proposal } from "./types.ts";

export const BUYER_TEMPORAL_ARMS = ["historical-wrapper-narrow", "historical-high-guaranteed-control"] as const;
export type BuyerTemporalArm = (typeof BUYER_TEMPORAL_ARMS)[number];
export const BUYER_TEMPORAL_CONTROL_BLOCKS = [1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24] as const;
export const BUYER_TEMPORAL_FLOORS = { highRate: 0.75, lowRate: 0.25 } as const;
export const BUYER_TEMPORAL_WRAPPER_RESULT_PATH = "src/data/buyer-wrapper-disassembly.json";
export const BUYER_TEMPORAL_CAPABILITY_RESULT_PATH = "src/data/buyer-capability.json";
export const BUYER_TEMPORAL_EV_CONSTANT = { giveCheck: true, giveChits: 0, requireChit: true } as const;

export type BuyerTemporalCase = {
  block: number;
  wrapperBlock: number;
  wrapperSeed: number;
  controlBlock: number;
  controlAgentId: number;
  controlScore: number;
  controlHistory: string;
};

export type BuyerTemporalRecord = {
  block: number;
  arm: BuyerTemporalArm;
  position: number;
  sourceStudy: "E-BUY-WRAP-D" | "E-BUY";
  sourceBlock: number;
  historicalPromptHash: string;
  promptHash: string;
  requestBodySha256: string;
  priorBuy: true;
  rawResponse: string;
  rawResponseSha256: string;
  proposal: Proposal;
  buy: boolean;
  provider: ProviderObservation;
};

type Rate = { n: number; buy: number; buyRate: number };
export type BuyerTemporalVerdict =
  | "INCOMPLETE"
  | "INVALID"
  | "NEW-CONTEXT FRAGILITY SUPPORTED"
  | "BROAD CURRENT-WINDOW OUTPUT COLLAPSE"
  | "PROMPT-FAMILY-SPECIFIC TEMPORAL DRIFT"
  | "IDENTICAL-INPUT TEMPORAL DRIFT"
  | "MIXED POSITIVE-CONTROL FAILURE"
  | "TEMPORAL REPLICATION INCONCLUSIVE";

export type BuyerTemporalReport = {
  study: "VBE-E-BUY-TEMP-R-BUYER-TEMPORAL-REPLAY";
  status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-buyer-temporal-replay-protocol.md";
  model: string;
  cases: BuyerTemporalCase[];
  arms: BuyerTemporalArm[];
  records: BuyerTemporalRecord[];
  calls: number;
  completeBlocks: number;
  byArm: Partial<Record<BuyerTemporalArm, Rate>>;
  responseShape: {
    uniqueProposalCount: number;
    uniqueRawResponseCount: number;
    proposalEntropyBits: number;
    rawResponseEntropyBits: number;
    allEqualEvConstant: boolean;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    wrapperHigh: boolean;
    wrapperLow: boolean;
    controlHigh: boolean;
    controlLow: boolean;
    broadConstantCollapse: boolean;
  };
  integrity: {
    expectedCalls: 24;
    retainedCalls: number;
    completeBlocks: number;
    sourceReportsComplete: boolean;
    selectedHistoricalSuccesses: boolean;
    promptBytesExact: boolean;
    promptHashesHistorical: boolean;
    requestBodiesMatched: boolean;
    rawHashesValid: boolean;
    schemasValid: boolean;
    instrumentationValid: boolean;
    positionBalanced: boolean;
    precedenceBalanced: boolean;
  };
  verdict: BuyerTemporalVerdict;
};

export function sha256BuyerTemporal(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buyerTemporalRequestBodySha256(prompt: string): string {
  return sha256BuyerTemporal(JSON.stringify({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: RULES },
      { role: "user", content: prompt },
    ],
    max_tokens: 64,
    temperature: 0,
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
  }));
}

function wrapperReport(): BuyerWrapperReport {
  return JSON.parse(readFileSync(BUYER_TEMPORAL_WRAPPER_RESULT_PATH, "utf8")) as BuyerWrapperReport;
}

function capabilityReport(): BuyerCapabilityReport {
  return JSON.parse(readFileSync(BUYER_TEMPORAL_CAPABILITY_RESULT_PATH, "utf8")) as BuyerCapabilityReport;
}

export function loadBuyerTemporalCases(): BuyerTemporalCase[] {
  const wrappers = loadBuyerWrapperCases();
  return wrappers.map((item, index) => {
    const control = BUYER_CAPABILITY_CASES[BUYER_TEMPORAL_CONTROL_BLOCKS[index]! - 1]!;
    return {
      block: index + 1,
      wrapperBlock: item.block,
      wrapperSeed: item.seed,
      controlBlock: control.block,
      controlAgentId: control.agentId,
      controlScore: control.score,
      controlHistory: control.history,
    };
  });
}

export function buyerTemporalOrder(block: number): readonly BuyerTemporalArm[] {
  if (!Number.isInteger(block) || block < 1 || block > 12) throw new Error(`invalid buyer-temporal block ${block}`);
  return block % 2 === 1 ? BUYER_TEMPORAL_ARMS : [BUYER_TEMPORAL_ARMS[1], BUYER_TEMPORAL_ARMS[0]];
}

export function buyerTemporalPrompt(arm: BuyerTemporalArm, item: BuyerTemporalCase): string {
  if (arm === "historical-wrapper-narrow") {
    return buyerWrapperPrompt("exact-narrow-anchor", loadBuyerWrapperCases()[item.wrapperBlock - 1]!);
  }
  return buyerCapabilityPrompt("high-guaranteed", BUYER_CAPABILITY_CASES[item.controlBlock - 1]!);
}

export function buyerTemporalHistoricalRecord(arm: BuyerTemporalArm, item: BuyerTemporalCase): BuyerWrapperRecord | BuyerCapabilityRecord {
  if (arm === "historical-wrapper-narrow") {
    const record = wrapperReport().records.find((row) => row.block === item.wrapperBlock && row.arm === "exact-narrow-anchor");
    if (!record) throw new Error(`missing historical wrapper record ${item.wrapperBlock}`);
    return record;
  }
  const record = capabilityReport().records.find((row) => row.block === item.controlBlock && row.arm === "high-guaranteed");
  if (!record) throw new Error(`missing historical capability record ${item.controlBlock}`);
  return record;
}

function validProposal(proposal: Proposal): boolean {
  return JSON.stringify(Object.keys(proposal).sort()) === JSON.stringify(["giveCheck", "giveChits", "requireChit"].sort())
    && typeof proposal.giveCheck === "boolean"
    && (proposal.giveChits === 0 || proposal.giveChits === 1)
    && typeof proposal.requireChit === "boolean";
}

function rate(records: readonly BuyerTemporalRecord[], arm: BuyerTemporalArm): Rate {
  const rows = records.filter((record) => record.arm === arm);
  const buy = rows.filter((record) => record.buy).length;
  return { n: rows.length, buy, buyRate: rows.length ? buy / rows.length : 0 };
}

function entropyBits(values: readonly string[]): number {
  if (!values.length) return 0;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / values.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function temporalVerdict(gates: BuyerTemporalReport["gates"]): BuyerTemporalVerdict {
  if (!gates.complete) return "INCOMPLETE";
  if (!gates.integrity) return "INVALID";
  if (gates.wrapperHigh && gates.controlHigh) return "NEW-CONTEXT FRAGILITY SUPPORTED";
  if (gates.wrapperLow && gates.controlLow && gates.broadConstantCollapse) return "BROAD CURRENT-WINDOW OUTPUT COLLAPSE";
  if (gates.wrapperLow && gates.controlHigh) return "PROMPT-FAMILY-SPECIFIC TEMPORAL DRIFT";
  if (gates.wrapperLow) return "IDENTICAL-INPUT TEMPORAL DRIFT";
  if (gates.wrapperHigh && gates.controlLow) return "MIXED POSITIVE-CONTROL FAILURE";
  return "TEMPORAL REPLICATION INCONCLUSIVE";
}

export function buildBuyerTemporalReport(rawRecords: readonly BuyerTemporalRecord[], model: string): BuyerTemporalReport {
  const cases = loadBuyerTemporalCases();
  const seen = new Set<string>();
  for (const record of rawRecords) {
    const item = cases[record.block - 1];
    if (!item || !BUYER_TEMPORAL_ARMS.includes(record.arm)) throw new Error(`unknown buyer-temporal record ${record.block}|${record.arm}`);
    const key = `${record.block}|${record.arm}`;
    if (seen.has(key)) throw new Error(`duplicate buyer-temporal record ${key}`);
    seen.add(key);
    if (record.position !== buyerTemporalOrder(record.block).indexOf(record.arm) + 1) throw new Error(`position mismatch ${key}`);
    if (!validProposal(record.proposal) || record.buy !== (record.proposal.giveChits === 1)) throw new Error(`proposal coding ${key}`);
    const expectedStudy = record.arm === "historical-wrapper-narrow" ? "E-BUY-WRAP-D" : "E-BUY";
    const expectedBlock = record.arm === "historical-wrapper-narrow" ? item.wrapperBlock : item.controlBlock;
    if (record.sourceStudy !== expectedStudy || record.sourceBlock !== expectedBlock || record.priorBuy !== true) throw new Error(`historical source coding ${key}`);
  }
  const records = [...rawRecords].sort((a, b) => a.block - b.block || a.position - b.position);
  const completeBlocks = cases.filter((item) => BUYER_TEMPORAL_ARMS.every((arm) => records.some((record) => record.block === item.block && record.arm === arm))).length;
  const byArm: BuyerTemporalReport["byArm"] = {};
  for (const arm of BUYER_TEMPORAL_ARMS) byArm[arm] = rate(records, arm);
  const proposalStrings = records.map((record) => JSON.stringify(record.proposal));
  const rawStrings = records.map((record) => record.rawResponse);
  const responseShape = {
    uniqueProposalCount: new Set(proposalStrings).size,
    uniqueRawResponseCount: new Set(rawStrings).size,
    proposalEntropyBits: entropyBits(proposalStrings),
    rawResponseEntropyBits: entropyBits(rawStrings),
    allEqualEvConstant: records.length === 24 && records.every((record) => JSON.stringify(record.proposal) === JSON.stringify(BUYER_TEMPORAL_EV_CONSTANT)),
  };
  const wrapperSource = wrapperReport();
  const capabilitySource = capabilityReport();
  const sourceReportsComplete = wrapperSource.calls === 72 && wrapperSource.completeBlocks === 12
    && capabilitySource.calls === 144 && capabilitySource.completeBlocks === 24;
  const selectedHistoricalSuccesses = cases.every((item) => BUYER_TEMPORAL_ARMS.every((arm) => buyerTemporalHistoricalRecord(arm, item).buy));
  const promptBytesExact = cases.every((item) => BUYER_TEMPORAL_ARMS.every((arm) => {
    const prompt = buyerTemporalPrompt(arm, item);
    const historical = buyerTemporalHistoricalRecord(arm, item);
    return sha256BuyerTemporal(prompt) === historical.promptHash;
  }));
  const promptHashesHistorical = records.every((record) => {
    const item = cases[record.block - 1]!;
    const historical = buyerTemporalHistoricalRecord(record.arm, item);
    return record.historicalPromptHash === historical.promptHash && record.promptHash === historical.promptHash;
  });
  const requestBodiesMatched = records.every((record) => {
    const item = cases[record.block - 1]!;
    return record.requestBodySha256 === buyerTemporalRequestBodySha256(buyerTemporalPrompt(record.arm, item));
  });
  const rawHashesValid = records.every((record) => record.rawResponseSha256 === sha256BuyerTemporal(record.rawResponse));
  const schemasValid = records.every((record) => validProposal(record.proposal));
  const instrumentationValid = records.every((record) => typeof record.rawResponse === "string"
    && record.requestBodySha256.length === 64
    && record.provider !== null
    && record.provider.attempt >= 1
    && record.provider.attempt <= 4
    && typeof record.provider.headers === "object"
    && record.provider.usage !== null);
  const positionBalanced = BUYER_TEMPORAL_ARMS.every((arm) => [0, 1].every((position) => cases.filter((item) => buyerTemporalOrder(item.block)[position] === arm).length === 6));
  const precedenceBalanced = cases.filter((item) => buyerTemporalOrder(item.block)[0] === "historical-wrapper-narrow").length === 6;
  const complete = records.length === 24 && completeBlocks === 12;
  const integrity = {
    expectedCalls: 24 as const,
    retainedCalls: records.length,
    completeBlocks,
    sourceReportsComplete,
    selectedHistoricalSuccesses,
    promptBytesExact,
    promptHashesHistorical,
    requestBodiesMatched,
    rawHashesValid,
    schemasValid,
    instrumentationValid,
    positionBalanced,
    precedenceBalanced,
  };
  const integrityPass = Object.entries(integrity).every(([key, value]) => ["expectedCalls", "retainedCalls", "completeBlocks"].includes(key) || value === true)
    && (!complete || (integrity.retainedCalls === 24 && integrity.completeBlocks === 12));
  const wrapperRate = byArm["historical-wrapper-narrow"]!.buyRate;
  const controlRate = byArm["historical-high-guaranteed-control"]!.buyRate;
  const gates = {
    complete,
    integrity: integrityPass,
    wrapperHigh: complete && wrapperRate >= BUYER_TEMPORAL_FLOORS.highRate,
    wrapperLow: complete && wrapperRate <= BUYER_TEMPORAL_FLOORS.lowRate,
    controlHigh: complete && controlRate >= BUYER_TEMPORAL_FLOORS.highRate,
    controlLow: complete && controlRate <= BUYER_TEMPORAL_FLOORS.lowRate,
    broadConstantCollapse: complete && responseShape.allEqualEvConstant,
  };
  return {
    study: "VBE-E-BUY-TEMP-R-BUYER-TEMPORAL-REPLAY",
    status: "PROJECT-INTERNAL PROSPECTIVE DIAGNOSTIC — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-buyer-temporal-replay-protocol.md",
    model,
    cases,
    arms: [...BUYER_TEMPORAL_ARMS],
    records,
    calls: records.length,
    completeBlocks,
    byArm,
    responseShape,
    gates,
    integrity,
    verdict: temporalVerdict(gates),
  };
}
