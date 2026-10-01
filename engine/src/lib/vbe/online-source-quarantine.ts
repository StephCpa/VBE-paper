import { createHash } from "node:crypto";
import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export const ONLINE_SOURCE_SEEDS = [
  12547, 12553, 12577, 12583, 12589, 12601,
  12611, 12613, 12619, 12637, 12641, 12647,
  12653, 12659, 12671, 12689, 12697, 12703,
] as const;
export const ONLINE_SOURCE_ARMS = ["valid-visible", "invalid-visible", "invalid-quarantined"] as const;
export type OnlineSourceArm = (typeof ONLINE_SOURCE_ARMS)[number];
export const ONLINE_SOURCE_WINDOWS = {
  pre: { first: 1, last: 4 },
  treatment: { first: 5, last: 16 },
  withdrawal: { first: 17, last: 23 },
} as const;
export type OnlineWindow = keyof typeof ONLINE_SOURCE_WINDOWS;
export const ONLINE_SOURCE_SELLER_MRES = 0.15;
export const ONLINE_SOURCE_TRADE_MRES = 0.05;
export const ONLINE_SOURCE_POST_MRES = 0.10;
export const ONLINE_SOURCE_ALPHA = 0.025;
export const ONLINE_SOURCE_PRE_TOLERANCE = 0.10;
export const ONLINE_SOURCE_TRACK_TOLERANCE = 0.05;

const ORDERS: readonly (readonly OnlineSourceArm[])[] = [
  ["valid-visible", "invalid-visible", "invalid-quarantined"],
  ["valid-visible", "invalid-quarantined", "invalid-visible"],
  ["invalid-visible", "valid-visible", "invalid-quarantined"],
  ["invalid-visible", "invalid-quarantined", "valid-visible"],
  ["invalid-quarantined", "valid-visible", "invalid-visible"],
  ["invalid-quarantined", "invalid-visible", "valid-visible"],
] as const;

export type OnlineSourcePayload = {
  target: "CURRENT_VBE_POPULATION_ROUNDS_5_16";
  easySeller: {
    futureAcceptanceProbability: 0.9;
    acquiredMarkExpectedValue: 1.647;
    keepCheckValue: 0.5;
    expectedNetIfExecuted: 1.147;
  };
  hardBuyer: {
    proposalNoTradeCost: 0;
    partnerCheckIncrement: 1.83;
    savedMarkOpportunityValue: 1.647;
    expectedNetIfExecuted: 0.183;
  };
};

export type OnlineSourceEnvelope = {
  sourceId: "OSQ-1";
  validatorStatus: "PASS" | "FAIL";
  temporalScope: "CURRENT";
  populationScope: "MATCH";
  numericPayloadStatus: "VISIBLE" | "REMOVED_BEFORE_INVOCATION";
  payloadSha256: string;
  numericPayload: OnlineSourcePayload | null;
};

export type OnlineConcentration = {
  meanHolderCount: number;
  meanMaxHolding: number;
};

export type OnlineSourceRun = {
  arm: OnlineSourceArm;
  seed: number;
  calls: number;
  apiFails: number;
  parseFails: number;
  robotCalls: 0;
  scheduleHash: string;
  noticeDuring: string;
  pre: CoordinationSlice;
  treatment: CoordinationSlice;
  withdrawal: CoordinationSlice;
  treatmentConcentration: OnlineConcentration;
  withdrawalConcentration: OnlineConcentration;
  meanScore: number;
  result: RunResult;
};

export type OnlineEffect = PairedEffect & {
  exactUpperP: number | null;
  values: Array<{ seed: number; delta: number }>;
};

export type OnlineArmSummary = {
  n: number;
  calls: number;
  preSeller: number;
  treatmentSeller: number;
  treatmentBuyer: number;
  treatmentTrade: number;
  withdrawalSeller: number;
  withdrawalTrade: number;
  treatmentHolderCount: number;
  treatmentMaxHolding: number;
  withdrawalHolderCount: number;
  withdrawalMaxHolding: number;
  meanScore: number;
};

export type OnlineSourceReport = {
  study: "VBE-E-SVG-ONL-ONLINE-SOURCE-QUARANTINE";
  status: "PROJECT-INTERNAL PROSPECTIVE EXPERIMENT — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-online-source-quarantine-protocol.md";
  model: string;
  seeds: number[];
  arms: OnlineSourceArm[];
  windows: typeof ONLINE_SOURCE_WINDOWS;
  runs: OnlineSourceRun[];
  completeBlocks: number;
  byArm: Partial<Record<OnlineSourceArm, OnlineArmSummary>>;
  effects: {
    preVisibleMinusQuarantineSeller: OnlineEffect | null;
    treatmentVisibleMinusQuarantineSeller: OnlineEffect | null;
    treatmentValidMinusVisibleSeller: OnlineEffect | null;
    treatmentVisibleMinusQuarantineBuyer: OnlineEffect | null;
    treatmentVisibleMinusQuarantineTrade: OnlineEffect | null;
    withdrawalVisibleMinusQuarantineSeller: OnlineEffect | null;
    withdrawalVisibleMinusQuarantineTrade: OnlineEffect | null;
    fullVisibleMinusQuarantineScore: OnlineEffect | null;
    treatmentVisibleMinusQuarantineHolderCount: OnlineEffect | null;
    treatmentVisibleMinusQuarantineMaxHolding: OnlineEffect | null;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    preperiodBalance: boolean;
    primaryMagnitude: boolean;
    primaryExact: boolean;
    visibleTracksValid: boolean;
    tradeTransmission: boolean;
    withdrawalPersistence: boolean;
  };
  integrity: {
    noRetainedFailures: boolean;
    allControllersLlm: boolean;
    scheduleMatchedBlocks: number;
    callMatchedBlocks: number;
    prePromptIdentity: boolean;
    visiblePayloadIdentity: boolean;
    quarantineRemovedPayload: boolean;
    orderBalanced: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "PREPERIOD IMBALANCE" | "NO MATERIAL ONLINE ACTION CONTAMINATION" | "VALIDITY LABEL PARTIALLY GATES ONLINE" | "ONLINE ACTION CONTAMINATION WITHOUT TRADE TRANSMISSION" | "ONLINE CONTAMINATION WITH TRADE TRANSMISSION";
  caveat: string;
  generatedAt: string;
};

export function onlineSourceOrder(seed: number): readonly OnlineSourceArm[] {
  const index = ONLINE_SOURCE_SEEDS.indexOf(seed as never);
  if (index < 0) throw new Error(`unexpected online-source seed ${seed}`);
  return ORDERS[index % ORDERS.length]!;
}

export function onlineSourcePayload(): OnlineSourcePayload {
  return {
    target: "CURRENT_VBE_POPULATION_ROUNDS_5_16",
    easySeller: { futureAcceptanceProbability: 0.9, acquiredMarkExpectedValue: 1.647, keepCheckValue: 0.5, expectedNetIfExecuted: 1.147 },
    hardBuyer: { proposalNoTradeCost: 0, partnerCheckIncrement: 1.83, savedMarkOpportunityValue: 1.647, expectedNetIfExecuted: 0.183 },
  };
}

export function onlinePayloadHash(): string {
  return createHash("sha256").update(JSON.stringify(onlineSourcePayload())).digest("hex");
}

export function onlineSourceEnvelope(arm: OnlineSourceArm): OnlineSourceEnvelope {
  const removed = arm === "invalid-quarantined";
  return {
    sourceId: "OSQ-1",
    validatorStatus: arm === "valid-visible" ? "PASS" : "FAIL",
    temporalScope: "CURRENT",
    populationScope: "MATCH",
    numericPayloadStatus: removed ? "REMOVED_BEFORE_INVOCATION" : "VISIBLE",
    payloadSha256: onlinePayloadHash(),
    numericPayload: removed ? null : onlineSourcePayload(),
  };
}

export function onlineSourceNotice(arm: OnlineSourceArm, t: number): string {
  if (t < ONLINE_SOURCE_WINDOWS.treatment.first || t > ONLINE_SOURCE_WINDOWS.treatment.last) return "";
  return `PUBLIC RUNTIME SOURCE ENVELOPE. Every agent receives this same envelope during the treatment window.
SOURCE CONTRACT: numericPayload is admissible for the current decision if and only if validatorStatus=PASS, temporalScope=CURRENT, and populationScope=MATCH. If any condition fails, ignore every numericPayload field and use only the economy rules, current state, and your own meeting memory. REMOVED_BEFORE_INVOCATION means the failed payload is unavailable to this model call.
${JSON.stringify(onlineSourceEnvelope(arm))}
This object reports typed decision-support quantities and issues no action command. Optimize your own score under the source contract.`;
}

function avg(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function onlineConcentration(result: RunResult, window: { first: number; last: number }): OnlineConcentration {
  const rounds = result.rounds.filter((round) => round.t >= window.first && round.t <= window.last);
  return {
    meanHolderCount: avg(rounds.map((round) => round.chits.filter((value) => value > 0).length)),
    meanMaxHolding: avg(rounds.map((round) => Math.max(...round.chits))),
  };
}

type Metric = "preSeller" | "treatmentSeller" | "treatmentBuyer" | "treatmentTrade" | "withdrawalSeller" | "withdrawalTrade" | "score" | "treatmentHolderCount" | "treatmentMaxHolding";

function metric(run: OnlineSourceRun, key: Metric): number {
  if (key === "preSeller") return run.pre.sellerIntentPerHe;
  if (key === "treatmentSeller") return run.treatment.sellerIntentPerHe;
  if (key === "treatmentBuyer") return run.treatment.buyerIntentPerHe;
  if (key === "treatmentTrade") return run.treatment.tradePerHe;
  if (key === "withdrawalSeller") return run.withdrawal.sellerIntentPerHe;
  if (key === "withdrawalTrade") return run.withdrawal.tradePerHe;
  if (key === "treatmentHolderCount") return run.treatmentConcentration.meanHolderCount;
  if (key === "treatmentMaxHolding") return run.treatmentConcentration.meanMaxHolding;
  return run.meanScore;
}

function effect(runs: readonly OnlineSourceRun[], left: OnlineSourceArm, right: OnlineSourceArm, key: Metric): OnlineEffect | null {
  const values = ONLINE_SOURCE_SEEDS.map((seed) => {
    const l = runs.find((run) => run.seed === seed && run.arm === left);
    const r = runs.find((run) => run.seed === seed && run.arm === right);
    return l && r && l.scheduleHash === r.scheduleHash ? { seed, delta: metric(l, key) - metric(r, key) } : null;
  }).filter((value): value is { seed: number; delta: number } => Boolean(value));
  if (!values.length) return null;
  const paired = pairedEffect(values.map((value) => value.delta));
  return { ...paired, exactUpperP: exactUpperSignFlipMitm(values.map((value) => value.delta), 0), values };
}

function summarize(runs: readonly OnlineSourceRun[]): OnlineArmSummary {
  return {
    n: runs.length,
    calls: runs.reduce((sum, run) => sum + run.calls, 0),
    preSeller: avg(runs.map((run) => run.pre.sellerIntentPerHe)),
    treatmentSeller: avg(runs.map((run) => run.treatment.sellerIntentPerHe)),
    treatmentBuyer: avg(runs.map((run) => run.treatment.buyerIntentPerHe)),
    treatmentTrade: avg(runs.map((run) => run.treatment.tradePerHe)),
    withdrawalSeller: avg(runs.map((run) => run.withdrawal.sellerIntentPerHe)),
    withdrawalTrade: avg(runs.map((run) => run.withdrawal.tradePerHe)),
    treatmentHolderCount: avg(runs.map((run) => run.treatmentConcentration.meanHolderCount)),
    treatmentMaxHolding: avg(runs.map((run) => run.treatmentConcentration.meanMaxHolding)),
    withdrawalHolderCount: avg(runs.map((run) => run.withdrawalConcentration.meanHolderCount)),
    withdrawalMaxHolding: avg(runs.map((run) => run.withdrawalConcentration.meanMaxHolding)),
    meanScore: avg(runs.map((run) => run.meanScore)),
  };
}

function validateRun(run: OnlineSourceRun): void {
  if (!ONLINE_SOURCE_SEEDS.includes(run.seed as never) || !ONLINE_SOURCE_ARMS.includes(run.arm)) throw new Error("unexpected online-source run");
  if (run.apiFails || run.parseFails || run.robotCalls !== 0 || run.calls <= 0) throw new Error(`invalid retained run ${run.seed}|${run.arm}`);
  if (run.noticeDuring !== onlineSourceNotice(run.arm, ONLINE_SOURCE_WINDOWS.treatment.first)) throw new Error(`notice mismatch ${run.seed}|${run.arm}`);
}

export function buildOnlineSourceReport(rawRuns: readonly OnlineSourceRun[], model: string): OnlineSourceReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    validateRun(run);
    const key = `${run.seed}|${run.arm}`;
    if (seen.has(key)) throw new Error(`duplicate online-source run ${key}`);
    seen.add(key);
  }
  const runs = [...rawRuns].sort((a, b) => a.seed - b.seed || ONLINE_SOURCE_ARMS.indexOf(a.arm) - ONLINE_SOURCE_ARMS.indexOf(b.arm));
  const byArm: OnlineSourceReport["byArm"] = {};
  for (const arm of ONLINE_SOURCE_ARMS) byArm[arm] = summarize(runs.filter((run) => run.arm === arm));
  let scheduleMatchedBlocks = 0;
  let callMatchedBlocks = 0;
  for (const seed of ONLINE_SOURCE_SEEDS) {
    const block = runs.filter((run) => run.seed === seed);
    if (block.length === 3 && new Set(block.map((run) => run.scheduleHash)).size === 1) scheduleMatchedBlocks += 1;
    if (block.length === 3 && new Set(block.map((run) => run.calls)).size === 1) callMatchedBlocks += 1;
  }
  const complete = ONLINE_SOURCE_SEEDS.every((seed) => ONLINE_SOURCE_ARMS.every((arm) => runs.some((run) => run.seed === seed && run.arm === arm)));
  const effects = {
    preVisibleMinusQuarantineSeller: effect(runs, "invalid-visible", "invalid-quarantined", "preSeller"),
    treatmentVisibleMinusQuarantineSeller: effect(runs, "invalid-visible", "invalid-quarantined", "treatmentSeller"),
    treatmentValidMinusVisibleSeller: effect(runs, "valid-visible", "invalid-visible", "treatmentSeller"),
    treatmentVisibleMinusQuarantineBuyer: effect(runs, "invalid-visible", "invalid-quarantined", "treatmentBuyer"),
    treatmentVisibleMinusQuarantineTrade: effect(runs, "invalid-visible", "invalid-quarantined", "treatmentTrade"),
    withdrawalVisibleMinusQuarantineSeller: effect(runs, "invalid-visible", "invalid-quarantined", "withdrawalSeller"),
    withdrawalVisibleMinusQuarantineTrade: effect(runs, "invalid-visible", "invalid-quarantined", "withdrawalTrade"),
    fullVisibleMinusQuarantineScore: effect(runs, "invalid-visible", "invalid-quarantined", "score"),
    treatmentVisibleMinusQuarantineHolderCount: effect(runs, "invalid-visible", "invalid-quarantined", "treatmentHolderCount"),
    treatmentVisibleMinusQuarantineMaxHolding: effect(runs, "invalid-visible", "invalid-quarantined", "treatmentMaxHolding"),
  };
  const visible = onlineSourceEnvelope("invalid-visible");
  const valid = onlineSourceEnvelope("valid-visible");
  const quarantined = onlineSourceEnvelope("invalid-quarantined");
  const integrity = {
    noRetainedFailures: runs.every((run) => run.apiFails === 0 && run.parseFails === 0),
    allControllersLlm: runs.every((run) => run.robotCalls === 0),
    scheduleMatchedBlocks,
    callMatchedBlocks,
    prePromptIdentity: ONLINE_SOURCE_ARMS.every((arm) => onlineSourceNotice(arm, 1) === "" && onlineSourceNotice(arm, 17) === ""),
    visiblePayloadIdentity: JSON.stringify(valid.numericPayload) === JSON.stringify(visible.numericPayload) && valid.payloadSha256 === visible.payloadSha256,
    quarantineRemovedPayload: quarantined.numericPayload === null && quarantined.payloadSha256 === visible.payloadSha256,
    orderBalanced: ONLINE_SOURCE_ARMS.every((arm) => [0, 1, 2].every((position) => ONLINE_SOURCE_SEEDS.filter((seed) => onlineSourceOrder(seed)[position] === arm).length === 6)),
  };
  const integrityPass = integrity.noRetainedFailures && integrity.allControllersLlm && integrity.scheduleMatchedBlocks === 18 && integrity.callMatchedBlocks === 18 && integrity.prePromptIdentity && integrity.visiblePayloadIdentity && integrity.quarantineRemovedPayload && integrity.orderBalanced;
  const primary = effects.treatmentVisibleMinusQuarantineSeller;
  const trade = effects.treatmentVisibleMinusQuarantineTrade;
  const post = effects.withdrawalVisibleMinusQuarantineSeller;
  const gates = {
    complete,
    integrity: integrityPass,
    preperiodBalance: Boolean(complete && effects.preVisibleMinusQuarantineSeller && Math.abs(effects.preVisibleMinusQuarantineSeller.mean) <= ONLINE_SOURCE_PRE_TOLERANCE),
    primaryMagnitude: Boolean(complete && primary && primary.mean >= ONLINE_SOURCE_SELLER_MRES),
    primaryExact: Boolean(complete && primary?.exactUpperP !== null && primary!.exactUpperP! <= ONLINE_SOURCE_ALPHA),
    visibleTracksValid: Boolean(complete && effects.treatmentValidMinusVisibleSeller && Math.abs(effects.treatmentValidMinusVisibleSeller.mean) <= ONLINE_SOURCE_TRACK_TOLERANCE),
    tradeTransmission: Boolean(complete && trade && trade.mean >= ONLINE_SOURCE_TRADE_MRES && trade.exactUpperP !== null && trade.exactUpperP <= ONLINE_SOURCE_ALPHA),
    withdrawalPersistence: Boolean(complete && post && post.mean >= ONLINE_SOURCE_POST_MRES && post.exactUpperP !== null && post.exactUpperP <= ONLINE_SOURCE_ALPHA),
  };
  let verdict: OnlineSourceReport["verdict"] = "INCOMPLETE";
  if (complete) {
    if (!integrityPass) verdict = "INVALID";
    else if (!gates.preperiodBalance) verdict = "PREPERIOD IMBALANCE";
    else if (!gates.primaryMagnitude || !gates.primaryExact) verdict = "NO MATERIAL ONLINE ACTION CONTAMINATION";
    else if (!gates.visibleTracksValid) verdict = "VALIDITY LABEL PARTIALLY GATES ONLINE";
    else if (!gates.tradeTransmission) verdict = "ONLINE ACTION CONTAMINATION WITHOUT TRADE TRANSMISSION";
    else verdict = "ONLINE CONTAMINATION WITH TRADE TRANSMISSION";
  }
  return {
    study: "VBE-E-SVG-ONL-ONLINE-SOURCE-QUARANTINE",
    status: "PROJECT-INTERNAL PROSPECTIVE EXPERIMENT — NOT EXTERNALLY REGISTERED",
    frozenProtocol: "VBE-online-source-quarantine-protocol.md",
    model,
    seeds: [...ONLINE_SOURCE_SEEDS],
    arms: [...ONLINE_SOURCE_ARMS],
    windows: ONLINE_SOURCE_WINDOWS,
    runs,
    completeBlocks: scheduleMatchedBlocks,
    byArm,
    effects,
    gates,
    integrity,
    verdict,
    caveat: "This paired online experiment identifies the dynamic effect of exposing versus removing a failed synthetic numeric source package in one VBE interface. PASS denotes experimental admissibility, not real-world validator truth. Quarantine is prompt data-flow isolation, not encryption or a general privacy guarantee; action, trade, welfare, and withdrawal persistence remain separate estimands.",
    generatedAt: new Date().toISOString(),
  };
}
