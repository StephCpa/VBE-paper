import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { structuralScheduleHash } from "./epistemic.ts";
import { GIFT_ANNOUNCE } from "./speech.ts";
import type { AgentType, Proposal, RunResult } from "./types.ts";

export const ROLE_CHANNEL_STUDY = "VBE-W-RG-ROLE-GENERALIZATION-CHANNEL" as const;
export const ROLE_CHANNEL_SEEDS = [13217,13219,13229,13241,13249,13259,13267,13291,13297,13309,13313,13327] as const;
export const ROLE_CHANNEL_ARMS = ["neutral-standard","gift-standard","gift-hh-blocked","gift-eh-gift-blocked"] as const;
export type RoleChannelArm = (typeof ROLE_CHANNEL_ARMS)[number];
export const ROLE_CHANNEL_SCORE_MRES = 0.5;
export const ROLE_CHANNEL_RATE_MRES = 0.5;
export const ROLE_CHANNEL_ALPHA = 0.025;
export const ROLE_CHANNEL_TARGET_CALLS = 3680;
export const NEUTRAL_ANNOUNCE = `PUBLIC. It is common knowledge: this message announces no exchange recommendation and changes no engine rule. You may choose any valid action. Maximize your own score.`;

const ORDERS: readonly (readonly RoleChannelArm[])[] = [
  ["neutral-standard","gift-standard","gift-hh-blocked","gift-eh-gift-blocked"],
  ["gift-eh-gift-blocked","gift-hh-blocked","gift-standard","neutral-standard"],
  ["neutral-standard","gift-standard","gift-eh-gift-blocked","gift-hh-blocked"],
  ["gift-hh-blocked","gift-eh-gift-blocked","gift-standard","neutral-standard"],
  ["neutral-standard","gift-hh-blocked","gift-standard","gift-eh-gift-blocked"],
  ["gift-eh-gift-blocked","gift-standard","gift-hh-blocked","neutral-standard"],
  ["gift-standard","neutral-standard","gift-hh-blocked","gift-eh-gift-blocked"],
  ["gift-eh-gift-blocked","gift-hh-blocked","neutral-standard","gift-standard"],
  ["gift-standard","neutral-standard","gift-eh-gift-blocked","gift-hh-blocked"],
  ["gift-hh-blocked","gift-eh-gift-blocked","neutral-standard","gift-standard"],
  ["gift-standard","gift-eh-gift-blocked","neutral-standard","gift-hh-blocked"],
  ["gift-hh-blocked","neutral-standard","gift-eh-gift-blocked","gift-standard"],
] as const;

export type RoleChannelTrace = {
  t:number; meId:number; partnerId:number; meType:AgentType; partnerType:AgentType;
  meChecks:number; meChits:number; partnerChecks:number; partnerChits:number;
  original:Proposal; executed:Proposal; eligible:boolean; blocked:boolean;
};
export type RoleMechanism = {
  meetings:number; hhMeetings:number; hhSwaps:number; hhSwapRate:number;
  ehGiftOpportunities:number; easyToHardGifts:number; easyToHardGiftRate:number;
  hardAssignments:number; hardSolved:number; hardSolveRate:number; allTransfers:number;
};
export type OriginalMechanism = { hhPairs:number; hhMutualGiveIntents:number; easyToHardGiftIntents:number; blockedProposals:number };
export type RoleChannelRun = {
  seed:number; arm:RoleChannelArm; position:number; calls:number; apiFails:0; parseFails:0; robotCalls:0;
  scheduleHash:string; notice:string; trace:RoleChannelTrace[]; transformFidelity:boolean;
  meanScore:number; mechanism:RoleMechanism; originalMechanism:OriginalMechanism; result:RunResult;
};
export type RoleChannelEffect = PairedEffect & { exactUpperP:number|null; mres:number; passes:boolean; values:Array<{seed:number;delta:number}> };
export type RoleChannelReport = {
  study:typeof ROLE_CHANNEL_STUDY;
  status:"PROJECT-INTERNAL PROSPECTIVE MECHANISM EXPERIMENT — NOT EXTERNALLY REGISTERED";
  frozenProtocol:"VBE-welfare-role-generalization-channel-protocol.md";
  model:string; seeds:number[]; arms:RoleChannelArm[]; runs:RoleChannelRun[]; completeBlocks:number;
  byArm:Partial<Record<RoleChannelArm,{n:number;calls:number;meanScore:number;mechanism:RoleMechanism;originalMechanism:OriginalMechanism}>>;
  effects:{
    giftMinusNeutralScore:RoleChannelEffect|null;
    giftMinusHhBlockedScore:RoleChannelEffect|null;
    ehBlockedMinusHhBlockedScore:RoleChannelEffect|null;
    giftMinusHhBlockedSwapRate:RoleChannelEffect|null;
    giftMinusEhBlockedGiftRate:RoleChannelEffect|null;
    giftMinusNeutralHhSwapRate:RoleChannelEffect|null;
    giftMinusNeutralHardSolveRate:RoleChannelEffect|null;
  };
  providerBracket:{status:"POST-FLIGHT PENDING"|"BRACKET HEALTHY"|"BRACKET INVALID";valid:boolean|null};
  integrity:{noRetainedFailures:boolean;allControllersLlm:boolean;scheduleMatchedBlocks:number;callMatchedBlocks:number;promptIdentity:boolean;transformFidelity:boolean;schemasValid:boolean;orderBalanced:boolean;pairwisePrecedenceBalanced:boolean;freshSeedCount:number;targetCalls:number};
  gates:{complete:boolean;integrity:boolean;providerBracketValid:boolean|null;hhChannelActive:boolean;hhChannelSuppressed:boolean;ehChannelObserved:boolean;ehChannelSuppressed:boolean;channelManipulationValid:boolean;giftTotalWelfare:boolean;hhWelfareContribution:boolean;hhDominance:boolean};
  verdict:"INCOMPLETE"|"INVALID"|"AWAITING POST-FLIGHT"|"CHANNEL MANIPULATION NOT VALIDATED"|"NO MATERIAL HH EXECUTION-CHANNEL CONTRIBUTION"|"HH EXECUTION CHANNEL CONTRIBUTES WITHOUT DOMINANCE"|"HH EXECUTION CHANNEL DOMINATES UNDER GIFT TALK"|"HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT";
  caveat:string; generatedAt:string;
};

export function roleChannelOrder(seed:number):readonly RoleChannelArm[]{const i=ROLE_CHANNEL_SEEDS.indexOf(seed as never);if(i<0)throw new Error(`unexpected role-channel seed ${seed}`);return ORDERS[i]!;}
export function roleChannelNotice(arm:RoleChannelArm):string{return arm==="neutral-standard"?NEUTRAL_ANNOUNCE:GIFT_ANNOUNCE;}
export function strictRoleChannelAction(text:string):string|null{const m=text.match(/\{[\s\S]*\}/);if(!m)return"missing JSON";try{const o=JSON.parse(m[0]) as Record<string,unknown>;if(JSON.stringify(Object.keys(o).sort())!==JSON.stringify(["giveCheck","giveChits","requireChit"].sort()))return"fields";if(typeof o.giveCheck!=="boolean"||typeof o.requireChit!=="boolean"||(o.giveChits!==0&&o.giveChits!==1))return"types";return null}catch{return"invalid JSON"}}
export function channelEligible(arm:RoleChannelArm,meType:AgentType,partnerType:AgentType,meChecks:number,original:Proposal):boolean{
  if(meChecks<1)return false;
  if(arm==="gift-hh-blocked")return meType==="H"&&partnerType==="H"&&original.giveCheck;
  if(arm==="gift-eh-gift-blocked")return meType==="E"&&partnerType==="H"&&original.giveCheck&&!original.requireChit;
  return false;
}
export function executeRoleChannel(arm:RoleChannelArm,meType:AgentType,partnerType:AgentType,meChecks:number,original:Proposal):{proposal:Proposal;eligible:boolean;blocked:boolean}{
  const eligible=channelEligible(arm,meType,partnerType,meChecks,original);
  if(!eligible)return{proposal:original,eligible:false,blocked:false};
  return{proposal:{...original,giveCheck:false},eligible:true,blocked:true};
}
function validProposal(p:Proposal):boolean{return typeof p.giveCheck==="boolean"&&(p.giveChits===0||p.giveChits===1)&&typeof p.requireChit==="boolean"&&(p.forfeit===undefined||p.forfeit===0)&&p.pAccept===undefined&&p.pSecond===undefined;}
export function summarizeRoleMechanism(result:RunResult):RoleMechanism{let meetings=0,hhMeetings=0,hhSwaps=0,ehGiftOpportunities=0,easyToHardGifts=0,hardAssignments=0,hardSolved=0,allTransfers=0;for(const round of result.rounds){for(let id=0;id<round.types.length;id++)if(round.types[id]==="H"){hardAssignments++;hardSolved+=Number(round.solved[id]);}for(const m of round.meetings){meetings++;if(m.kind!=="none")allTransfers++;const pair=[m.iType,m.jType].sort().join("");if(pair==="HH"){hhMeetings++;hhSwaps+=Number(m.kind==="swap");}if(pair==="EH"&&m.easyHadCheck){ehGiftOpportunities++;const easyId=m.iType==="E"?m.i:m.j;easyToHardGifts+=Number(m.kind==="gift"&&m.seller===easyId);}}}return{meetings,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,ehGiftOpportunities,easyToHardGifts,easyToHardGiftRate:ehGiftOpportunities?easyToHardGifts/ehGiftOpportunities:0,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0,allTransfers};}
export function summarizeOriginalMechanism(trace:RoleChannelTrace[]):OriginalMechanism{const pairs=new Map<string,RoleChannelTrace[]>();for(const x of trace){const key=`${x.t}|${Math.min(x.meId,x.partnerId)}|${Math.max(x.meId,x.partnerId)}`;const rows=pairs.get(key)??[];rows.push(x);pairs.set(key,rows);}let hhPairs=0,hhMutualGiveIntents=0,easyToHardGiftIntents=0;for(const rows of pairs.values()){if(rows.length!==2)throw new Error("proposal trace pair mismatch");if(rows[0]!.meType==="H"&&rows[0]!.partnerType==="H"){hhPairs++;hhMutualGiveIntents+=Number(rows.every(x=>x.original.giveCheck&&!x.original.requireChit));}for(const x of rows)if(x.meType==="E"&&x.partnerType==="H"&&x.original.giveCheck&&!x.original.requireChit)easyToHardGiftIntents++;}return{hhPairs,hhMutualGiveIntents,easyToHardGiftIntents,blockedProposals:trace.filter(x=>x.blocked).length};}
function avg(xs:number[]):number{return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function poolMechanism(rows:RoleMechanism[]):RoleMechanism{const sum=(k:keyof RoleMechanism)=>rows.reduce((s,r)=>s+r[k],0);const meetings=sum("meetings"),hhMeetings=sum("hhMeetings"),hhSwaps=sum("hhSwaps"),ehGiftOpportunities=sum("ehGiftOpportunities"),easyToHardGifts=sum("easyToHardGifts"),hardAssignments=sum("hardAssignments"),hardSolved=sum("hardSolved"),allTransfers=sum("allTransfers");return{meetings,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,ehGiftOpportunities,easyToHardGifts,easyToHardGiftRate:ehGiftOpportunities?easyToHardGifts/ehGiftOpportunities:0,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0,allTransfers};}
function poolOriginal(rows:OriginalMechanism[]):OriginalMechanism{return{hhPairs:rows.reduce((s,r)=>s+r.hhPairs,0),hhMutualGiveIntents:rows.reduce((s,r)=>s+r.hhMutualGiveIntents,0),easyToHardGiftIntents:rows.reduce((s,r)=>s+r.easyToHardGiftIntents,0),blockedProposals:rows.reduce((s,r)=>s+r.blockedProposals,0)};}
type Metric="score"|"hhSwapRate"|"ehGiftRate"|"hardSolveRate";
function metric(run:RoleChannelRun,key:Metric):number{if(key==="score")return run.meanScore;if(key==="hhSwapRate")return run.mechanism.hhSwapRate;if(key==="ehGiftRate")return run.mechanism.easyToHardGiftRate;return run.mechanism.hardSolveRate;}
function effect(runs:RoleChannelRun[],left:RoleChannelArm,right:RoleChannelArm,key:Metric,mres:number):RoleChannelEffect|null{const values:Array<{seed:number;delta:number}>=[];for(const seed of ROLE_CHANNEL_SEEDS){const a=runs.find(r=>r.seed===seed&&r.arm===left),b=runs.find(r=>r.seed===seed&&r.arm===right);if(a&&b&&a.scheduleHash===b.scheduleHash)values.push({seed,delta:metric(a,key)-metric(b,key)});}if(!values.length)return null;const base=pairedEffect(values.map(v=>v.delta)),exactUpperP=exactUpperSignFlipMitm(values.map(v=>v.delta),0);return{...base,exactUpperP,mres,passes:values.length===ROLE_CHANNEL_SEEDS.length&&base.mean>=mres&&exactUpperP!==null&&exactUpperP<=ROLE_CHANNEL_ALPHA,values};}
export function roleChannelVerdict(complete:boolean,integrity:boolean,provider:boolean|null,manipulation:boolean,hhContribution:boolean,dominance:boolean,total:boolean):RoleChannelReport["verdict"]{if(!complete)return"INCOMPLETE";if(!integrity)return"INVALID";if(provider===null)return"AWAITING POST-FLIGHT";if(!provider)return"INVALID";if(!manipulation)return"CHANNEL MANIPULATION NOT VALIDATED";if(!hhContribution)return"NO MATERIAL HH EXECUTION-CHANNEL CONTRIBUTION";if(!dominance)return"HH EXECUTION CHANNEL CONTRIBUTES WITHOUT DOMINANCE";return total?"HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT":"HH EXECUTION CHANNEL DOMINATES UNDER GIFT TALK";}
export function buildRoleChannelReport(raw:RoleChannelRun[],model:string,providerBracketValid:boolean|null=null):RoleChannelReport{
  const seen=new Set<string>();for(const r of raw){const key=`${r.seed}|${r.arm}`;if(seen.has(key))throw new Error(`duplicate run ${key}`);seen.add(key);if(!ROLE_CHANNEL_SEEDS.includes(r.seed as never)||!ROLE_CHANNEL_ARMS.includes(r.arm)||r.position!==roleChannelOrder(r.seed).indexOf(r.arm)+1||r.notice!==roleChannelNotice(r.arm)||r.apiFails||r.parseFails||r.robotCalls!==0||r.calls!==r.trace.length)throw new Error(`run invariant ${key}`);for(const x of r.trace){if(!validProposal(x.original)||!validProposal(x.executed))throw new Error(`proposal schema ${key}`);const q=executeRoleChannel(r.arm,x.meType,x.partnerType,x.meChecks,x.original);if(q.eligible!==x.eligible||q.blocked!==x.blocked||JSON.stringify(q.proposal)!==JSON.stringify(x.executed))throw new Error(`transform mismatch ${key}`);}if(!r.transformFidelity||JSON.stringify(r.mechanism)!==JSON.stringify(summarizeRoleMechanism(r.result))||JSON.stringify(r.originalMechanism)!==JSON.stringify(summarizeOriginalMechanism(r.trace)))throw new Error(`summary mismatch ${key}`);}
  const runs=[...raw].sort((a,b)=>a.seed-b.seed||a.position-b.position);const byArm:RoleChannelReport["byArm"]={};for(const arm of ROLE_CHANNEL_ARMS){const rows=runs.filter(r=>r.arm===arm);if(rows.length)byArm[arm]={n:rows.length,calls:rows.reduce((s,r)=>s+r.calls,0),meanScore:avg(rows.map(r=>r.meanScore)),mechanism:poolMechanism(rows.map(r=>r.mechanism)),originalMechanism:poolOriginal(rows.map(r=>r.originalMechanism))};}
  let scheduleMatchedBlocks=0,callMatchedBlocks=0;for(const seed of ROLE_CHANNEL_SEEDS){const rows=runs.filter(r=>r.seed===seed);if(rows.length===4&&new Set(rows.map(r=>r.scheduleHash)).size===1)scheduleMatchedBlocks++;if(rows.length===4&&new Set(rows.map(r=>r.calls)).size===1)callMatchedBlocks++;}
  const complete=ROLE_CHANNEL_SEEDS.every(seed=>ROLE_CHANNEL_ARMS.every(arm=>runs.some(r=>r.seed===seed&&r.arm===arm)));const effects={giftMinusNeutralScore:effect(runs,"gift-standard","neutral-standard","score",ROLE_CHANNEL_SCORE_MRES),giftMinusHhBlockedScore:effect(runs,"gift-standard","gift-hh-blocked","score",ROLE_CHANNEL_SCORE_MRES),ehBlockedMinusHhBlockedScore:effect(runs,"gift-eh-gift-blocked","gift-hh-blocked","score",ROLE_CHANNEL_SCORE_MRES),giftMinusHhBlockedSwapRate:effect(runs,"gift-standard","gift-hh-blocked","hhSwapRate",ROLE_CHANNEL_RATE_MRES),giftMinusEhBlockedGiftRate:effect(runs,"gift-standard","gift-eh-gift-blocked","ehGiftRate",0),giftMinusNeutralHhSwapRate:effect(runs,"gift-standard","neutral-standard","hhSwapRate",0),giftMinusNeutralHardSolveRate:effect(runs,"gift-standard","neutral-standard","hardSolveRate",0)};
  const pairwisePrecedenceBalanced=ROLE_CHANNEL_ARMS.every((a,i)=>ROLE_CHANNEL_ARMS.slice(i+1).every(b=>ROLE_CHANNEL_SEEDS.filter(seed=>roleChannelOrder(seed).indexOf(a)<roleChannelOrder(seed).indexOf(b)).length===6));
  const integrity={noRetainedFailures:runs.every(r=>!r.apiFails&&!r.parseFails),allControllersLlm:runs.every(r=>r.robotCalls===0&&r.calls===r.trace.length),scheduleMatchedBlocks,callMatchedBlocks,promptIdentity:roleChannelNotice("gift-standard")===roleChannelNotice("gift-hh-blocked")&&roleChannelNotice("gift-standard")===roleChannelNotice("gift-eh-gift-blocked")&&runs.every(r=>r.notice===roleChannelNotice(r.arm)),transformFidelity:runs.every(r=>r.transformFidelity),schemasValid:runs.every(r=>r.trace.every(x=>validProposal(x.original)&&validProposal(x.executed))),orderBalanced:ROLE_CHANNEL_ARMS.every(a=>[0,1,2,3].every(p=>ROLE_CHANNEL_SEEDS.filter(seed=>roleChannelOrder(seed)[p]===a).length===3)),pairwisePrecedenceBalanced,freshSeedCount:new Set(ROLE_CHANNEL_SEEDS).size,targetCalls:runs.reduce((s,r)=>s+r.calls,0)};
  const integrityPass=integrity.noRetainedFailures&&integrity.allControllersLlm&&integrity.scheduleMatchedBlocks===12&&integrity.callMatchedBlocks===12&&integrity.promptIdentity&&integrity.transformFidelity&&integrity.schemasValid&&integrity.orderBalanced&&integrity.pairwisePrecedenceBalanced&&integrity.freshSeedCount===12&&integrity.targetCalls===ROLE_CHANNEL_TARGET_CALLS;
  const standard=byArm["gift-standard"],hhBlocked=byArm["gift-hh-blocked"],ehBlocked=byArm["gift-eh-gift-blocked"];
  const hhChannelActive=Boolean(complete&&standard&&standard.mechanism.hhSwaps>0&&effects.giftMinusHhBlockedSwapRate?.passes);const hhChannelSuppressed=Boolean(complete&&hhBlocked&&hhBlocked.mechanism.hhSwaps===0&&hhBlocked.originalMechanism.blockedProposals>0);const ehChannelObserved=Boolean(complete&&standard&&standard.mechanism.easyToHardGifts>0);const ehChannelSuppressed=Boolean(complete&&ehBlocked&&ehBlocked.mechanism.easyToHardGifts===0&&ehBlocked.originalMechanism.blockedProposals>0);const channelManipulationValid=hhChannelActive&&hhChannelSuppressed&&ehChannelObserved&&ehChannelSuppressed;
  const giftTotalWelfare=Boolean(effects.giftMinusNeutralScore?.passes),hhWelfareContribution=Boolean(effects.giftMinusHhBlockedScore?.passes),hhDominance=Boolean(effects.ehBlockedMinusHhBlockedScore?.passes);const gates={complete,integrity:integrityPass,providerBracketValid,hhChannelActive,hhChannelSuppressed,ehChannelObserved,ehChannelSuppressed,channelManipulationValid,giftTotalWelfare,hhWelfareContribution,hhDominance};const providerBracket={status:providerBracketValid===null?"POST-FLIGHT PENDING":providerBracketValid?"BRACKET HEALTHY":"BRACKET INVALID",valid:providerBracketValid} as const;
  return{study:ROLE_CHANNEL_STUDY,status:"PROJECT-INTERNAL PROSPECTIVE MECHANISM EXPERIMENT — NOT EXTERNALLY REGISTERED",frozenProtocol:"VBE-welfare-role-generalization-channel-protocol.md",model,seeds:[...ROLE_CHANNEL_SEEDS],arms:[...ROLE_CHANNEL_ARMS],runs,completeBlocks:scheduleMatchedBlocks,byArm,effects,providerBracket,integrity,gates,verdict:roleChannelVerdict(complete,integrityPass,providerBracketValid,channelManipulationValid,hhWelfareContribution,hhDominance,giftTotalWelfare),caveat:"The seed-level population run is the randomized unit under interference. The three gift arms use byte-identical visible prompts; only the engine-executed proposal is transformed after the model response, while original proposals are retained. These controlled dynamic interventions identify total effects of suppressing specified execution channels under gift talk, not natural mediation, private mental states, consent, equilibrium welfare, or an individual-level effect. The neutral arm is a total-effect reference and is not text-matched to gift talk.",generatedAt:new Date().toISOString()};
}
export function roleChannelRunSummary(result:RunResult):Pick<RoleChannelRun,"scheduleHash"|"meanScore"|"mechanism">{return{scheduleHash:structuralScheduleHash(result),meanScore:result.meanScore,mechanism:summarizeRoleMechanism(result)};}
