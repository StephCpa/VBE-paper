import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { structuralScheduleHash } from "./epistemic.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { GIFT_ANNOUNCE } from "./speech.ts";
import type { Meeting, Proposal, RunResult } from "./types.ts";
import { ANNOUNCE } from "./unconfound.ts";
import { holmAdjust } from "./welfare-semantic-boundary.ts";
import { NEUTRAL_ANNOUNCE } from "./welfare-role-channel.ts";

export const MONEY_REPAIR_STUDY = "VBE-W-MER-ENGAGED-MONEY-REPAIR" as const;
export const MONEY_REPAIR_SEEDS = [13513,13523,13537,13553,13567,13577,13591,13613,13619,13627] as const;
export const MONEY_REPAIR_ARMS = ["neutral","gift-exact","money-exact","gift-bilateral","money-bilateral"] as const;
export type MoneyRepairArm = (typeof MONEY_REPAIR_ARMS)[number];
export const MONEY_REPAIR_TARGET_CALLS = 3930;
export const MONEY_REPAIR_ENGAGEMENT_MRES = 0.25;
export const MONEY_REPAIR_HH_MRES = 0.25;
export const MONEY_REPAIR_WELFARE_MRES = 0.5;
export const MONEY_REPAIR_PRIMARY_ALPHA = 0.025;
export const MONEY_REPAIR_WELFARE_ALPHA = 0.05;

export const GIFT_BILATERAL_ANNOUNCE = `PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check without requiring one mark, and the Hard agent gives no mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;
export const MONEY_BILATERAL_ANNOUNCE = `PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check while requiring one mark, and the Hard agent gives one mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;

const ROTATIONS = MONEY_REPAIR_ARMS.map((_,i)=>[...MONEY_REPAIR_ARMS.slice(i),...MONEY_REPAIR_ARMS.slice(0,i)] as MoneyRepairArm[]);
const ORDERS = [...ROTATIONS,...ROTATIONS.map(order=>[...order].reverse())] as readonly (readonly MoneyRepairArm[])[];

export type MoneyRepairMechanism = {
  meetings:number;
  hhMeetings:number; hhSwaps:number; hhSwapRate:number;
  ehGiftOpportunities:number; easyGiftIntentions:number; giftIntentionRate:number;
  ehSaleOpportunities:number; markSales:number; saleRate:number;
  bilateralMoneyIntentions:number; bilateralMoneyIntentionRate:number;
  hardAssignments:number; hardSolved:number; hardSolveRate:number;
};

export type MoneyRepairRun = {
  seed:number; arm:MoneyRepairArm; position:number; calls:number;
  apiFails:0; parseFails:0; robotCalls:0; scheduleHash:string; notice:string;
  meanScore:number; mechanism:MoneyRepairMechanism; result:RunResult;
};

export type AdjustedEffect = PairedEffect & {
  exactUpperP:number|null; holmAdjustedP:number|null; mres:number; passes:boolean;
  values:Array<{seed:number;delta:number}>;
};

export type ThresholdExclusion = {
  n:number; effectMean:number; threshold:number; marginMean:number;
  exactUpperP:number|null; holmAdjustedP:number|null; passes:boolean;
  values:Array<{seed:number;effect:number;margin:number}>;
};

export type MoneyRepairVerdict =
  | "INCOMPLETE" | "INVALID" | "AWAITING POST-FLIGHT"
  | "REFERENCE GIFT EFFECT NOT ACTIVE"
  | "MONEY REPAIR NOT ENGAGED — NO SEMANTIC CONCLUSION"
  | "MATCHED CONTROL NOT VALIDATED"
  | "ENGAGED PRICED DIRECTIVE GENERALIZES"
  | "ENGAGED PRICED-DIRECTIVE BOUNDARY SUPPORTED"
  | "ENGAGED MONEY SEMANTIC PROFILE UNRESOLVED";

export type MoneyRepairReport = {
  study:typeof MONEY_REPAIR_STUDY;
  status:"PROJECT-INTERNAL PROSPECTIVE REPAIR — NOT EXTERNALLY REGISTERED";
  frozenProtocol:"VBE-welfare-money-engagement-repair-protocol.md";
  model:string; seeds:number[]; arms:MoneyRepairArm[]; runs:MoneyRepairRun[]; completeBlocks:number;
  byArm:Partial<Record<MoneyRepairArm,{n:number;calls:number;meanScore:number;mechanism:MoneyRepairMechanism}>>;
  engagement:{moneyVsNeutralSale:AdjustedEffect|null;giftBilateralVsNeutralIntent:AdjustedEffect|null};
  hh:{giftExactVsNeutral:AdjustedEffect|null;giftBilateralVsNeutral:AdjustedEffect|null;moneyBilateralVsNeutral:AdjustedEffect|null;giftMinusMoney:AdjustedEffect|null;moneyBelowMres:ThresholdExclusion|null};
  welfare:{giftExactVsNeutral:AdjustedEffect|null;giftBilateralVsNeutral:AdjustedEffect|null;moneyBilateralVsNeutral:AdjustedEffect|null;giftMinusMoney:AdjustedEffect|null};
  providerBracket:{status:"POST-FLIGHT PENDING"|"BRACKET HEALTHY"|"BRACKET INVALID";valid:boolean|null};
  integrity:{noRetainedFailures:boolean;allControllersLlm:boolean;scheduleHashesValid:boolean;meanScoresValid:boolean;scheduleMatchedBlocks:number;callMatchedBlocks:number;noticesExact:boolean;historicalNoticesExact:boolean;schemasValid:boolean;orderBalanced:boolean;pairwisePrecedenceBalanced:boolean;freshSeedCount:number;targetCalls:number};
  gates:{complete:boolean;integrity:boolean;providerBracketValid:boolean|null;referenceGiftActive:boolean;moneyEngaged:boolean;matchedGiftEngaged:boolean;matchedGiftHh:boolean;moneyHhGeneralizes:boolean;giftExceedsMoneyHh:boolean;moneyHhBelowMres:boolean};
  verdict:MoneyRepairVerdict; caveat:string; generatedAt:string;
};

export function moneyRepairOrder(seed:number):readonly MoneyRepairArm[]{const i=MONEY_REPAIR_SEEDS.indexOf(seed as never);if(i<0)throw new Error(`unexpected money-repair seed ${seed}`);return ORDERS[i]!;}
export function moneyRepairNotice(arm:MoneyRepairArm):string{switch(arm){case"neutral":return NEUTRAL_ANNOUNCE;case"gift-exact":return GIFT_ANNOUNCE;case"money-exact":return ANNOUNCE;case"gift-bilateral":return GIFT_BILATERAL_ANNOUNCE;case"money-bilateral":return MONEY_BILATERAL_ANNOUNCE;}}
export function strictMoneyRepairAction(text:string):string|null{const m=text.match(/\{[\s\S]*\}/);if(!m)return"missing JSON";try{const o=JSON.parse(m[0]) as Record<string,unknown>;if(JSON.stringify(Object.keys(o).sort())!==JSON.stringify(["giveCheck","giveChits","requireChit"].sort()))return"fields";if(typeof o.giveCheck!=="boolean"||typeof o.requireChit!=="boolean"||(o.giveChits!==0&&o.giveChits!==1))return"types";return null;}catch{return"invalid JSON";}}
function validProposal(p:Proposal):boolean{return typeof p.giveCheck==="boolean"&&(p.giveChits===0||p.giveChits===1)&&typeof p.requireChit==="boolean"&&(p.forfeit===undefined||p.forfeit===0)&&p.pAccept===undefined&&p.pSecond===undefined;}
function pair(m:Meeting):string{return[m.iType,m.jType].sort().join("");}

export function summarizeMoneyRepairMechanism(result:RunResult):MoneyRepairMechanism{
  let meetings=0,hhMeetings=0,hhSwaps=0,ehGiftOpportunities=0,easyGiftIntentions=0,ehSaleOpportunities=0,markSales=0,bilateralMoneyIntentions=0,hardAssignments=0,hardSolved=0;
  for(const round of result.rounds){
    for(let id=0;id<round.types.length;id++)if(round.types[id]==="H"){hardAssignments++;hardSolved+=Number(round.solved[id]);}
    for(const m of round.meetings){meetings++;if(pair(m)==="HH"){hhMeetings++;hhSwaps+=Number(m.kind==="swap");}
      if(pair(m)!=="EH"||m.t===DEFAULT_PARAMS.T)continue;
      const easyIsI=m.iType==="E",easy=easyIsI?m.pi:m.pj,hard=easyIsI?m.pj:m.pi;
      if(m.easyHadCheck){ehGiftOpportunities++;easyGiftIntentions+=Number(easy.giveCheck&&!easy.requireChit);}
      if(m.easyHadCheck&&m.hardHadChit){ehSaleOpportunities++;markSales+=Number(m.kind==="chit-for-check"&&m.seller===(easyIsI?m.i:m.j));bilateralMoneyIntentions+=Number(easy.giveCheck&&easy.requireChit&&hard.giveChits===1);}
    }
  }
  return{meetings,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,ehGiftOpportunities,easyGiftIntentions,giftIntentionRate:ehGiftOpportunities?easyGiftIntentions/ehGiftOpportunities:0,ehSaleOpportunities,markSales,saleRate:ehSaleOpportunities?markSales/ehSaleOpportunities:0,bilateralMoneyIntentions,bilateralMoneyIntentionRate:ehSaleOpportunities?bilateralMoneyIntentions/ehSaleOpportunities:0,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0};
}

function avg(xs:number[]):number{return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function pool(rows:MoneyRepairMechanism[]):MoneyRepairMechanism{const s=(k:keyof MoneyRepairMechanism)=>rows.reduce((a,b)=>a+b[k],0),meetings=s("meetings"),hhMeetings=s("hhMeetings"),hhSwaps=s("hhSwaps"),ehGiftOpportunities=s("ehGiftOpportunities"),easyGiftIntentions=s("easyGiftIntentions"),ehSaleOpportunities=s("ehSaleOpportunities"),markSales=s("markSales"),bilateralMoneyIntentions=s("bilateralMoneyIntentions"),hardAssignments=s("hardAssignments"),hardSolved=s("hardSolved");return{meetings,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,ehGiftOpportunities,easyGiftIntentions,giftIntentionRate:ehGiftOpportunities?easyGiftIntentions/ehGiftOpportunities:0,ehSaleOpportunities,markSales,saleRate:ehSaleOpportunities?markSales/ehSaleOpportunities:0,bilateralMoneyIntentions,bilateralMoneyIntentionRate:ehSaleOpportunities?bilateralMoneyIntentions/ehSaleOpportunities:0,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0};}
type Metric="hhSwapRate"|"giftIntentionRate"|"saleRate"|"welfare";
function metric(run:MoneyRepairRun,key:Metric):number{return key==="welfare"?run.meanScore:run.mechanism[key];}
function rawEffect(runs:MoneyRepairRun[],left:MoneyRepairArm,right:MoneyRepairArm,key:Metric,mres:number):AdjustedEffect|null{const values:Array<{seed:number;delta:number}>=[];for(const seed of MONEY_REPAIR_SEEDS){const a=runs.find(r=>r.seed===seed&&r.arm===left),b=runs.find(r=>r.seed===seed&&r.arm===right);if(a&&b&&a.scheduleHash===b.scheduleHash)values.push({seed,delta:metric(a,key)-metric(b,key)});}if(!values.length)return null;const base=pairedEffect(values.map(v=>v.delta)),exactUpperP=exactUpperSignFlipMitm(values.map(v=>v.delta),0);return{...base,exactUpperP,holmAdjustedP:null,mres,passes:false,values};}
function rawThresholdExclusion(runs:MoneyRepairRun[]):ThresholdExclusion|null{const values:Array<{seed:number;effect:number;margin:number}>=[];for(const seed of MONEY_REPAIR_SEEDS){const a=runs.find(r=>r.seed===seed&&r.arm==="money-bilateral"),b=runs.find(r=>r.seed===seed&&r.arm==="neutral");if(a&&b&&a.scheduleHash===b.scheduleHash){const effect=metric(a,"hhSwapRate")-metric(b,"hhSwapRate");values.push({seed,effect,margin:MONEY_REPAIR_HH_MRES-effect});}}if(!values.length)return null;const margins=values.map(v=>v.margin);return{n:values.length,effectMean:avg(values.map(v=>v.effect)),threshold:MONEY_REPAIR_HH_MRES,marginMean:avg(margins),exactUpperP:exactUpperSignFlipMitm(margins,0),holmAdjustedP:null,passes:false,values};}
function adjustEffects(items:Array<AdjustedEffect|null>,alpha:number):void{const adjusted=holmAdjust(items.map(x=>x?.exactUpperP??null));items.forEach((x,i)=>{if(x){x.holmAdjustedP=adjusted[i];x.passes=x.n===MONEY_REPAIR_SEEDS.length&&x.mean>=x.mres&&x.holmAdjustedP!==null&&x.holmAdjustedP<=alpha;}});}

export function moneyRepairVerdict(complete:boolean,integrity:boolean,provider:boolean|null,g:Omit<MoneyRepairReport["gates"],"complete"|"integrity"|"providerBracketValid">):MoneyRepairVerdict{if(!complete)return"INCOMPLETE";if(!integrity)return"INVALID";if(provider===null)return"AWAITING POST-FLIGHT";if(!provider)return"INVALID";if(!g.referenceGiftActive)return"REFERENCE GIFT EFFECT NOT ACTIVE";if(!g.moneyEngaged)return"MONEY REPAIR NOT ENGAGED — NO SEMANTIC CONCLUSION";if(!g.matchedGiftEngaged||!g.matchedGiftHh)return"MATCHED CONTROL NOT VALIDATED";if(g.moneyHhGeneralizes)return"ENGAGED PRICED DIRECTIVE GENERALIZES";if(g.giftExceedsMoneyHh&&g.moneyHhBelowMres)return"ENGAGED PRICED-DIRECTIVE BOUNDARY SUPPORTED";return"ENGAGED MONEY SEMANTIC PROFILE UNRESOLVED";}

export function buildMoneyRepairReport(raw:MoneyRepairRun[],model:string,providerBracketValid:boolean|null=null):MoneyRepairReport{
  const seen=new Set<string>();for(const r of raw){const key=`${r.seed}|${r.arm}`,meetings=r.result.rounds.reduce((s,x)=>s+x.meetings.length,0);if(seen.has(key))throw new Error(`duplicate run ${key}`);seen.add(key);if(!MONEY_REPAIR_SEEDS.includes(r.seed as never)||!MONEY_REPAIR_ARMS.includes(r.arm)||r.position!==moneyRepairOrder(r.seed).indexOf(r.arm)+1||r.notice!==moneyRepairNotice(r.arm)||r.apiFails||r.parseFails||r.robotCalls||r.calls!==meetings*2||r.scheduleHash!==structuralScheduleHash(r.result)||r.meanScore!==r.result.meanScore)throw new Error(`run invariant ${key}`);if(JSON.stringify(r.mechanism)!==JSON.stringify(summarizeMoneyRepairMechanism(r.result)))throw new Error(`mechanism mismatch ${key}`);if(!r.result.rounds.flatMap(x=>x.meetings).every(m=>validProposal(m.pi)&&validProposal(m.pj)))throw new Error(`proposal schema ${key}`);}
  const runs=[...raw].sort((a,b)=>a.seed-b.seed||a.position-b.position),byArm:MoneyRepairReport["byArm"]={};for(const arm of MONEY_REPAIR_ARMS){const rows=runs.filter(r=>r.arm===arm);if(rows.length)byArm[arm]={n:rows.length,calls:rows.reduce((s,r)=>s+r.calls,0),meanScore:avg(rows.map(r=>r.meanScore)),mechanism:pool(rows.map(r=>r.mechanism))};}
  let scheduleMatchedBlocks=0,callMatchedBlocks=0;for(const seed of MONEY_REPAIR_SEEDS){const rows=runs.filter(r=>r.seed===seed);if(rows.length===5&&new Set(rows.map(r=>r.scheduleHash)).size===1)scheduleMatchedBlocks++;if(rows.length===5&&new Set(rows.map(r=>r.calls)).size===1)callMatchedBlocks++;}
  const complete=MONEY_REPAIR_SEEDS.every(seed=>MONEY_REPAIR_ARMS.every(arm=>runs.some(r=>r.seed===seed&&r.arm===arm)));
  const engagement={moneyVsNeutralSale:rawEffect(runs,"money-bilateral","neutral","saleRate",MONEY_REPAIR_ENGAGEMENT_MRES),giftBilateralVsNeutralIntent:rawEffect(runs,"gift-bilateral","neutral","giftIntentionRate",MONEY_REPAIR_ENGAGEMENT_MRES)};adjustEffects(Object.values(engagement),MONEY_REPAIR_PRIMARY_ALPHA);
  const hh={giftExactVsNeutral:rawEffect(runs,"gift-exact","neutral","hhSwapRate",MONEY_REPAIR_HH_MRES),giftBilateralVsNeutral:rawEffect(runs,"gift-bilateral","neutral","hhSwapRate",MONEY_REPAIR_HH_MRES),moneyBilateralVsNeutral:rawEffect(runs,"money-bilateral","neutral","hhSwapRate",MONEY_REPAIR_HH_MRES),giftMinusMoney:rawEffect(runs,"gift-bilateral","money-bilateral","hhSwapRate",MONEY_REPAIR_HH_MRES),moneyBelowMres:rawThresholdExclusion(runs)};const hhPositive=[hh.giftExactVsNeutral,hh.giftBilateralVsNeutral,hh.moneyBilateralVsNeutral,hh.giftMinusMoney],hhAdjusted=holmAdjust([...hhPositive.map(x=>x?.exactUpperP??null),hh.moneyBelowMres?.exactUpperP??null]);hhPositive.forEach((x,i)=>{if(x){x.holmAdjustedP=hhAdjusted[i];x.passes=x.n===MONEY_REPAIR_SEEDS.length&&x.mean>=x.mres&&x.holmAdjustedP!==null&&x.holmAdjustedP<=MONEY_REPAIR_PRIMARY_ALPHA;}});if(hh.moneyBelowMres){hh.moneyBelowMres.holmAdjustedP=hhAdjusted[4];hh.moneyBelowMres.passes=hh.moneyBelowMres.n===MONEY_REPAIR_SEEDS.length&&hh.moneyBelowMres.marginMean>0&&hh.moneyBelowMres.holmAdjustedP!==null&&hh.moneyBelowMres.holmAdjustedP<=MONEY_REPAIR_PRIMARY_ALPHA;}
  const welfare={giftExactVsNeutral:rawEffect(runs,"gift-exact","neutral","welfare",MONEY_REPAIR_WELFARE_MRES),giftBilateralVsNeutral:rawEffect(runs,"gift-bilateral","neutral","welfare",MONEY_REPAIR_WELFARE_MRES),moneyBilateralVsNeutral:rawEffect(runs,"money-bilateral","neutral","welfare",MONEY_REPAIR_WELFARE_MRES),giftMinusMoney:rawEffect(runs,"gift-bilateral","money-bilateral","welfare",MONEY_REPAIR_WELFARE_MRES)};adjustEffects(Object.values(welfare),MONEY_REPAIR_WELFARE_ALPHA);
  const pairwisePrecedenceBalanced=MONEY_REPAIR_ARMS.every((a,i)=>MONEY_REPAIR_ARMS.slice(i+1).every(b=>MONEY_REPAIR_SEEDS.filter(seed=>moneyRepairOrder(seed).indexOf(a)<moneyRepairOrder(seed).indexOf(b)).length===5));
  const integrity={noRetainedFailures:runs.every(r=>!r.apiFails&&!r.parseFails),allControllersLlm:runs.every(r=>r.robotCalls===0&&r.calls===r.result.rounds.reduce((s,x)=>s+x.meetings.length*2,0)),scheduleHashesValid:runs.every(r=>r.scheduleHash===structuralScheduleHash(r.result)),meanScoresValid:runs.every(r=>r.meanScore===r.result.meanScore),scheduleMatchedBlocks,callMatchedBlocks,noticesExact:runs.every(r=>r.notice===moneyRepairNotice(r.arm)),historicalNoticesExact:moneyRepairNotice("neutral")===NEUTRAL_ANNOUNCE&&moneyRepairNotice("gift-exact")===GIFT_ANNOUNCE&&moneyRepairNotice("money-exact")===ANNOUNCE,schemasValid:runs.every(r=>r.result.rounds.flatMap(x=>x.meetings).every(m=>validProposal(m.pi)&&validProposal(m.pj))),orderBalanced:MONEY_REPAIR_ARMS.every(a=>[0,1,2,3,4].every(p=>MONEY_REPAIR_SEEDS.filter(seed=>moneyRepairOrder(seed)[p]===a).length===2)),pairwisePrecedenceBalanced,freshSeedCount:new Set(MONEY_REPAIR_SEEDS).size,targetCalls:runs.reduce((s,r)=>s+r.calls,0)};
  const integrityPass=integrity.noRetainedFailures&&integrity.allControllersLlm&&integrity.scheduleHashesValid&&integrity.meanScoresValid&&integrity.scheduleMatchedBlocks===10&&integrity.callMatchedBlocks===10&&integrity.noticesExact&&integrity.historicalNoticesExact&&integrity.schemasValid&&integrity.orderBalanced&&integrity.pairwisePrecedenceBalanced&&integrity.freshSeedCount===10&&integrity.targetCalls===MONEY_REPAIR_TARGET_CALLS;
  const coreGates={referenceGiftActive:Boolean(hh.giftExactVsNeutral?.passes),moneyEngaged:Boolean(engagement.moneyVsNeutralSale?.passes),matchedGiftEngaged:Boolean(engagement.giftBilateralVsNeutralIntent?.passes),matchedGiftHh:Boolean(hh.giftBilateralVsNeutral?.passes),moneyHhGeneralizes:Boolean(hh.moneyBilateralVsNeutral?.passes),giftExceedsMoneyHh:Boolean(hh.giftMinusMoney?.passes),moneyHhBelowMres:Boolean(hh.moneyBelowMres?.passes)},gates={complete,integrity:integrityPass,providerBracketValid,...coreGates},providerBracket={status:providerBracketValid===null?"POST-FLIGHT PENDING":providerBracketValid?"BRACKET HEALTHY":"BRACKET INVALID",valid:providerBracketValid} as const;
  return{study:MONEY_REPAIR_STUDY,status:"PROJECT-INTERNAL PROSPECTIVE REPAIR — NOT EXTERNALLY REGISTERED",frozenProtocol:"VBE-welfare-money-engagement-repair-protocol.md",model,seeds:[...MONEY_REPAIR_SEEDS],arms:[...MONEY_REPAIR_ARMS],runs,completeBlocks:scheduleMatchedBlocks,byArm,engagement,hh,welfare,providerBracket,integrity,gates,verdict:moneyRepairVerdict(complete,integrityPass,providerBracketValid,coreGates),caveat:"Named-sale engagement is a prerequisite for interpreting the priced directive. H–H scope expansion is opportunity-normalized and seed-level under interference. The bilateral gift and money packages are structurally parallel but not token-identical; the study does not identify a word-level cause, private belief, natural mediation, monetary equilibrium, or cross-model generality.",generatedAt:new Date().toISOString()};
}

export function moneyRepairRunSummary(result:RunResult):Pick<MoneyRepairRun,"scheduleHash"|"meanScore"|"mechanism">{return{scheduleHash:structuralScheduleHash(result),meanScore:result.meanScore,mechanism:summarizeMoneyRepairMechanism(result)};}
