import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BUYER_CAPABILITY_CASES, buyerCapabilityPrompt, type BuyerCapabilityReport } from "./buyer-capability.ts";
import { buyerWrapperPrompt, loadBuyerWrapperCases, type BuyerWrapperReport } from "./buyer-wrapper-disassembly.ts";
import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { structuralScheduleHash } from "./epistemic.ts";
import { giftSlice, saleSlice, type SaleSlice } from "./minority.ts";
import type { ProviderObservation } from "./observed-chat.ts";
import { GIFT_ANNOUNCE } from "./speech.ts";
import { ANNOUNCE } from "./unconfound.ts";
import type { Proposal, RunResult } from "./types.ts";

export const CROWDING_STUDY = "VBE-W-CO-WELFARE-CROWDING-OUT" as const;
export const CROWDING_SEEDS = [13001,13003,13007,13009,13033,13037,13043,13049,13063,13093,13099,13103,13109,13121,13127,13147,13151,13159] as const;
export const CROWDING_ARMS = ["money-talk", "gift-talk"] as const;
export type CrowdingArm = (typeof CROWDING_ARMS)[number];
export const CROWDING_SCORE_MRES = 0.5;
export const CROWDING_BEHAVIOR_MRES = 0.25;
export const CROWDING_ALPHA = 0.025;
export const CROWDING_TARGET_CALLS = 2728;
export const CROWDING_BRIDGE_BLOCKS = [1, 4, 7, 10] as const;
export const CROWDING_BRIDGE_ARMS = ["historical-narrow-positive", "historical-public-hard-negative", "historical-high-guaranteed-positive"] as const;
export type CrowdingBridgeArm = (typeof CROWDING_BRIDGE_ARMS)[number];

const WRAPPER_PATH = "src/data/buyer-wrapper-disassembly.json";
const CAPABILITY_PATH = "src/data/buyer-capability.json";

export type CrowdingRun = {
  seed: number;
  arm: CrowdingArm;
  position: number;
  calls: number;
  apiFails: 0;
  parseFails: 0;
  scheduleHash: string;
  notice: string;
  meanScore: number;
  gifts: SaleSlice;
  sales: SaleSlice;
  result: RunResult;
};

export type CrowdingBridgeCase = {
  block: number;
  arm: CrowdingBridgeArm;
  sourceStudy: "E-BUY-WRAP-D" | "E-BUY";
  sourceBlock: number;
  prompt: string;
  historicalPromptHash: string;
  historicalBuy: boolean;
};

export type CrowdingBridgeRecord = {
  block: number;
  arm: CrowdingBridgeArm;
  position: number;
  sourceStudy: CrowdingBridgeCase["sourceStudy"];
  sourceBlock: number;
  promptHash: string;
  historicalPromptHash: string;
  historicalBuy: boolean;
  rawResponse: string;
  rawResponseSha256: string;
  proposal: Proposal;
  buy: boolean;
  provider: ProviderObservation;
};

export type DirectionalEffect = PairedEffect & {
  exactUpperP: number | null;
  mres: number;
  passes: boolean;
  values: Array<{ seed: number; delta: number }>;
};

export type CrowdingReport = {
  study: typeof CROWDING_STUDY;
  status: "PROJECT-INTERNAL PROSPECTIVE REPLICATION — NOT EXTERNALLY REGISTERED";
  frozenProtocol: "VBE-welfare-crowding-out-protocol.md";
  model: string;
  seeds: number[];
  arms: CrowdingArm[];
  runs: CrowdingRun[];
  bridgeRecords: CrowdingBridgeRecord[];
  completeBlocks: number;
  byArm: Partial<Record<CrowdingArm, { n: number; calls: number; meanScore: number; gifts: SaleSlice; sales: SaleSlice }>>;
  effects: {
    giftMinusMoneyScore: DirectionalEffect | null;
    giftMinusMoneyGiftRate: DirectionalEffect | null;
    moneyMinusGiftSaleRate: DirectionalEffect | null;
  };
  bridge: {
    complete: boolean;
    exactPromptBytes: boolean;
    rawHashesValid: boolean;
    instrumentationComplete: boolean;
    agreement: Partial<Record<CrowdingBridgeArm, { n: number; agreements: number; rate: number }>>;
    transitions: { priorBuyCurrentBuy: number; priorBuyCurrentNoBuy: number; priorNoBuyCurrentBuy: number; priorNoBuyCurrentNoBuy: number };
    interpretation: "DESCRIPTIVE CROSS-ERA CALIBRATION ONLY — EXCLUDED FROM VERDICT";
  };
  providerBracket: { status: "POST-FLIGHT PENDING"|"BRACKET HEALTHY"|"BRACKET INVALID"; valid: boolean|null };
  integrity: {
    noRetainedFailures: boolean;
    scheduleMatchedBlocks: number;
    callMatchedBlocks: number;
    noticesExact: boolean;
    schemasValid: boolean;
    orderBalanced: boolean;
    freshSeedCount: number;
    targetCalls: number;
  };
  gates: {
    complete: boolean;
    integrity: boolean;
    providerBracketValid: boolean|null;
    welfareMagnitude: boolean;
    welfareExact: boolean;
    giftSubstitution: boolean;
    saleSubstitution: boolean;
  };
  verdict: "INCOMPLETE" | "INVALID" | "AWAITING POST-FLIGHT" | "NO WELFARE PACKAGE EFFECT" | "WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION" | "WELFARE CROWDING-OUT PACKAGE REPLICATED";
  caveat: string;
  generatedAt: string;
};

export function sha256Crowding(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function crowdingNotice(arm: CrowdingArm): string { return arm === "money-talk" ? ANNOUNCE : GIFT_ANNOUNCE; }
export function crowdingOrder(seed: number): readonly CrowdingArm[] {
  const index = CROWDING_SEEDS.indexOf(seed as never);
  if (index < 0) throw new Error(`unexpected crowding seed ${seed}`);
  return index % 2 === 0 ? CROWDING_ARMS : [CROWDING_ARMS[1], CROWDING_ARMS[0]];
}
export function strictCrowdingAction(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "missing JSON";
  try {
    const value = JSON.parse(match[0]) as Record<string, unknown>;
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(["giveCheck", "giveChits", "requireChit"].sort())) return "fields";
    if (typeof value.giveCheck !== "boolean" || typeof value.requireChit !== "boolean" || (value.giveChits !== 0 && value.giveChits !== 1)) return "types";
    return null;
  } catch { return "invalid JSON"; }
}

function wrapperReport(): BuyerWrapperReport { return JSON.parse(readFileSync(WRAPPER_PATH, "utf8")) as BuyerWrapperReport; }
function capabilityReport(): BuyerCapabilityReport { return JSON.parse(readFileSync(CAPABILITY_PATH, "utf8")) as BuyerCapabilityReport; }

export function crowdingBridgeCases(): CrowdingBridgeCase[] {
  const wrappers = loadBuyerWrapperCases();
  const wrapper = wrapperReport();
  const capability = capabilityReport();
  const out: CrowdingBridgeCase[] = [];
  for (const block of CROWDING_BRIDGE_BLOCKS) {
    const item = wrappers[block - 1]!;
    for (const arm of ["historical-narrow-positive", "historical-public-hard-negative"] as const) {
      const sourceArm = arm === "historical-narrow-positive" ? "exact-narrow-anchor" : "exact-public-hard-anchor";
      const source = wrapper.records.find((record) => record.block === block && record.arm === sourceArm);
      if (!source) throw new Error(`missing wrapper bridge source ${block}|${sourceArm}`);
      out.push({ block, arm, sourceStudy: "E-BUY-WRAP-D", sourceBlock: block, prompt: buyerWrapperPrompt(sourceArm, item), historicalPromptHash: source.promptHash, historicalBuy: source.buy });
    }
    const source = capability.records.find((record) => record.block === block && record.arm === "high-guaranteed");
    if (!source) throw new Error(`missing capability bridge source ${block}`);
    out.push({ block, arm: "historical-high-guaranteed-positive", sourceStudy: "E-BUY", sourceBlock: block, prompt: buyerCapabilityPrompt("high-guaranteed", BUYER_CAPABILITY_CASES[block - 1]!), historicalPromptHash: source.promptHash, historicalBuy: source.buy });
  }
  return out;
}

export function crowdingBridgeOrder(block: number): readonly CrowdingBridgeArm[] {
  const index = CROWDING_BRIDGE_BLOCKS.indexOf(block as never);
  if (index < 0) throw new Error(`unexpected bridge block ${block}`);
  const rotations: readonly (readonly CrowdingBridgeArm[])[] = [CROWDING_BRIDGE_ARMS, [CROWDING_BRIDGE_ARMS[1], CROWDING_BRIDGE_ARMS[2], CROWDING_BRIDGE_ARMS[0]], [CROWDING_BRIDGE_ARMS[2], CROWDING_BRIDGE_ARMS[0], CROWDING_BRIDGE_ARMS[1]], CROWDING_BRIDGE_ARMS];
  return rotations[index]!;
}

function average(values: readonly number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function pool(values: readonly SaleSlice[]): SaleSlice { const offers=values.reduce((s,v)=>s+v.offers,0),accepts=values.reduce((s,v)=>s+v.accepts,0);return{offers,accepts,acc:offers?accepts/offers:0}; }
function validProposal(value: Proposal): boolean { return typeof value.giveCheck==="boolean"&&(value.giveChits===0||value.giveChits===1)&&typeof value.requireChit==="boolean"&&(value.forfeit===undefined||value.forfeit===0)&&value.pAccept===undefined&&value.pSecond===undefined; }
function metric(run: CrowdingRun, key: "score"|"gift"|"sale"): number { return key === "score" ? run.meanScore : key === "gift" ? run.gifts.acc : run.sales.acc; }
function directionalEffect(runs: CrowdingRun[], left: CrowdingArm, right: CrowdingArm, key: "score"|"gift"|"sale", mres: number): DirectionalEffect | null {
  const values:Array<{seed:number;delta:number}>=[];
  for(const seed of CROWDING_SEEDS){
    const a = runs.find((run) => run.seed === seed && run.arm === left);
    const b = runs.find((run) => run.seed === seed && run.arm === right);
    if(a&&b&&a.scheduleHash===b.scheduleHash)values.push({seed,delta:metric(a,key)-metric(b,key)});
  }
  if (!values.length) return null;
  const base = pairedEffect(values.map((value) => value.delta));
  const exactUpperP = exactUpperSignFlipMitm(values.map((value) => value.delta), 0);
  return { ...base, exactUpperP, mres, passes: values.length===CROWDING_SEEDS.length && base.mean>=mres && exactUpperP!==null && exactUpperP<=CROWDING_ALPHA, values };
}

export function crowdingVerdict(complete:boolean, integrity:boolean, providerBracketValid:boolean|null, welfare:boolean, substitution:boolean):CrowdingReport["verdict"] {
  if (!complete) return "INCOMPLETE";
  if (!integrity) return "INVALID";
  if(providerBracketValid===null)return "AWAITING POST-FLIGHT";
  if(!providerBracketValid)return "INVALID";
  if (!welfare) return "NO WELFARE PACKAGE EFFECT";
  return substitution ? "WELFARE CROWDING-OUT PACKAGE REPLICATED" : "WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION";
}

export function buildCrowdingReport(rawRuns: CrowdingRun[], rawBridge: CrowdingBridgeRecord[], model: string, providerBracketValid:boolean|null=null): CrowdingReport {
  const seen = new Set<string>();
  for (const run of rawRuns) {
    const key=`${run.seed}|${run.arm}`;if(seen.has(key))throw new Error(`duplicate run ${key}`);seen.add(key);
    if(!CROWDING_SEEDS.includes(run.seed as never)||!CROWDING_ARMS.includes(run.arm)||run.position!==crowdingOrder(run.seed).indexOf(run.arm)+1)throw new Error(`unexpected run ${key}`);
    if(run.notice!==crowdingNotice(run.arm)||run.apiFails!==0||run.parseFails!==0||run.calls<=0)throw new Error(`run invariant ${key}`);
  }
  const bridgeCases=crowdingBridgeCases();const bridgeSeen=new Set<string>();
  for(const record of rawBridge){const key=`${record.block}|${record.arm}`;if(bridgeSeen.has(key))throw new Error(`duplicate bridge ${key}`);bridgeSeen.add(key);const item=bridgeCases.find(value=>value.block===record.block&&value.arm===record.arm);if(!item||record.position!==crowdingBridgeOrder(record.block).indexOf(record.arm)+1||record.sourceStudy!==item.sourceStudy||record.sourceBlock!==item.sourceBlock||record.historicalBuy!==item.historicalBuy||record.promptHash!==sha256Crowding(item.prompt)||record.historicalPromptHash!==item.historicalPromptHash||strictCrowdingAction(record.rawResponse)!==null||!validProposal(record.proposal)||record.buy!==(record.proposal.giveChits===1))throw new Error(`bridge invariant ${key}`);}
  const runs=[...rawRuns].sort((a,b)=>a.seed-b.seed||a.position-b.position);const bridgeRecords=[...rawBridge].sort((a,b)=>CROWDING_BRIDGE_BLOCKS.indexOf(a.block as never)-CROWDING_BRIDGE_BLOCKS.indexOf(b.block as never)||a.position-b.position);
  const byArm:CrowdingReport["byArm"]={};for(const arm of CROWDING_ARMS){const rows=runs.filter(run=>run.arm===arm);if(rows.length)byArm[arm]={n:rows.length,calls:rows.reduce((s,r)=>s+r.calls,0),meanScore:average(rows.map(r=>r.meanScore)),gifts:pool(rows.map(r=>r.gifts)),sales:pool(rows.map(r=>r.sales))};}
  let scheduleMatchedBlocks=0,callMatchedBlocks=0;for(const seed of CROWDING_SEEDS){const rows=runs.filter(r=>r.seed===seed);if(rows.length===2&&new Set(rows.map(r=>r.scheduleHash)).size===1)scheduleMatchedBlocks++;if(rows.length===2&&new Set(rows.map(r=>r.calls)).size===1)callMatchedBlocks++;}
  const complete=CROWDING_SEEDS.every(seed=>CROWDING_ARMS.every(arm=>runs.some(run=>run.seed===seed&&run.arm===arm)));
  const effects={giftMinusMoneyScore:directionalEffect(runs,"gift-talk","money-talk","score",CROWDING_SCORE_MRES),giftMinusMoneyGiftRate:directionalEffect(runs,"gift-talk","money-talk","gift",CROWDING_BEHAVIOR_MRES),moneyMinusGiftSaleRate:directionalEffect(runs,"money-talk","gift-talk","sale",CROWDING_BEHAVIOR_MRES)};
  const integrity={noRetainedFailures:runs.every(r=>r.apiFails===0&&r.parseFails===0),scheduleMatchedBlocks,callMatchedBlocks,noticesExact:runs.every(r=>r.notice===crowdingNotice(r.arm)),schemasValid:runs.every(r=>r.result.rounds.flatMap(round=>round.meetings).every(meeting=>validProposal(meeting.pi)&&validProposal(meeting.pj))),orderBalanced:CROWDING_ARMS.every(arm=>[0,1].every(position=>CROWDING_SEEDS.filter(seed=>crowdingOrder(seed)[position]===arm).length===9)),freshSeedCount:new Set(CROWDING_SEEDS).size,targetCalls:runs.reduce((sum,run)=>sum+run.calls,0)};
  const integrityPass=integrity.noRetainedFailures&&integrity.scheduleMatchedBlocks===18&&integrity.callMatchedBlocks===18&&integrity.noticesExact&&integrity.schemasValid&&integrity.orderBalanced&&integrity.freshSeedCount===18&&integrity.targetCalls===CROWDING_TARGET_CALLS;
  const scoreEffect=effects.giftMinusMoneyScore;const gates={complete,integrity:integrityPass,providerBracketValid,welfareMagnitude:Boolean(scoreEffect&&scoreEffect.mean>=CROWDING_SCORE_MRES),welfareExact:Boolean(scoreEffect&&scoreEffect.exactUpperP!==null&&scoreEffect.exactUpperP<=CROWDING_ALPHA),giftSubstitution:Boolean(effects.giftMinusMoneyGiftRate?.passes),saleSubstitution:Boolean(effects.moneyMinusGiftSaleRate?.passes)};
  const agreement:CrowdingReport["bridge"]["agreement"]={};for(const arm of CROWDING_BRIDGE_ARMS){const rows=bridgeRecords.filter(r=>r.arm===arm),agreements=rows.filter(r=>r.buy===r.historicalBuy).length;agreement[arm]={n:rows.length,agreements,rate:rows.length?agreements/rows.length:0};}
  const transitions={priorBuyCurrentBuy:bridgeRecords.filter(r=>r.historicalBuy&&r.buy).length,priorBuyCurrentNoBuy:bridgeRecords.filter(r=>r.historicalBuy&&!r.buy).length,priorNoBuyCurrentBuy:bridgeRecords.filter(r=>!r.historicalBuy&&r.buy).length,priorNoBuyCurrentNoBuy:bridgeRecords.filter(r=>!r.historicalBuy&&!r.buy).length};
  const bridge={complete:bridgeRecords.length===12&&bridgeCases.every(item=>bridgeRecords.some(r=>r.block===item.block&&r.arm===item.arm)),exactPromptBytes:bridgeCases.every(item=>sha256Crowding(item.prompt)===item.historicalPromptHash),rawHashesValid:bridgeRecords.every(r=>r.rawResponseSha256===sha256Crowding(r.rawResponse)),instrumentationComplete:bridgeRecords.every(r=>Boolean(r.provider.responseId)&&Boolean(r.provider.returnedModel)),agreement,transitions,interpretation:"DESCRIPTIVE CROSS-ERA CALIBRATION ONLY — EXCLUDED FROM VERDICT" as const};
  const welfare=gates.welfareMagnitude&&gates.welfareExact;const substitution=gates.giftSubstitution&&gates.saleSubstitution;
  const providerBracket={status:providerBracketValid===null?"POST-FLIGHT PENDING":providerBracketValid?"BRACKET HEALTHY":"BRACKET INVALID",valid:providerBracketValid} as const;
  return{study:CROWDING_STUDY,status:"PROJECT-INTERNAL PROSPECTIVE REPLICATION — NOT EXTERNALLY REGISTERED",frozenProtocol:"VBE-welfare-crowding-out-protocol.md",model,seeds:[...CROWDING_SEEDS],arms:[...CROWDING_ARMS],runs,bridgeRecords,completeBlocks:scheduleMatchedBlocks,byArm,effects,bridge,providerBracket,integrity,gates,verdict:crowdingVerdict(complete,integrityPass,providerBracketValid,welfare,substitution),caveat:"The randomized unit is the seed-level population run under interference. The primary contrast identifies the dynamic total effect of the two historical public speech packages. Because money-talk and gift-talk differ in multiple sentences and there is no neutral arm, the result does not identify a natural mediation effect, a pure money-versus-no-policy suppression effect, or a unique psychological mechanism. Gift and sale rates are post-treatment opportunity ratios and are interpreted as mechanism-consistent substitution only. The 12 shared prompts are descriptive cross-era calibration and never enter the verdict. A substantive verdict is released only after a healthy, identity-consistent provider post-flight bracket.",generatedAt:new Date().toISOString()};
}

export function summarizeCrowdingRun(result: RunResult): Pick<CrowdingRun,"scheduleHash"|"meanScore"|"gifts"|"sales"> { return{scheduleHash:structuralScheduleHash(result),meanScore:result.meanScore,gifts:giftSlice(result,24),sales:saleSlice(result,24)}; }
