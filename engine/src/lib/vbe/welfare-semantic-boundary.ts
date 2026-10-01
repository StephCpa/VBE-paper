import { pairedEffect, type PairedEffect } from "./epistemic-analysis.ts";
import { exactUpperSignFlipMitm } from "./epistemic-reward-confirmatory.ts";
import { structuralScheduleHash } from "./epistemic.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { GIFT_ANNOUNCE } from "./speech.ts";
import type { Meeting, Proposal, RunResult } from "./types.ts";
import { ANNOUNCE } from "./unconfound.ts";
import { NEUTRAL_ANNOUNCE } from "./welfare-role-channel.ts";

export const SEMANTIC_BOUNDARY_STUDY = "VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY" as const;
export const SEMANTIC_BOUNDARY_SEEDS = [13331,13337,13339,13367,13381,13397,13411,13417,13421,13441,13451,13457,13463,13469] as const;
export const SEMANTIC_BOUNDARY_ARMS = ["neutral","gift-exact","gift-easy-only","gift-any-holder","gift-hard-partner-only","money-exact","easy-easy-negative"] as const;
export type SemanticBoundaryArm = (typeof SEMANTIC_BOUNDARY_ARMS)[number];
export const SEMANTIC_BOUNDARY_HH_MRES = 0.25;
export const SEMANTIC_BOUNDARY_SCORE_MRES = 0.5;
export const SEMANTIC_BOUNDARY_EE_ENGAGEMENT_MRES = 0.25;
export const SEMANTIC_BOUNDARY_FAMILY_ALPHA = 0.025;
export const SEMANTIC_BOUNDARY_TARGET_CALLS = 7602;
export const NEGATIVE_NAMED_TRANSACTION_WELFARE_DELTA = -2 * DEFAULT_PARAMS.v;

export const GIFT_EASY_ONLY_ANNOUNCE = `PUBLIC. It is common knowledge: only an Easy agent gives a leftover check to a Hard agent without requiring a mark. A Hard agent does not give a leftover check under this statement. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;
export const GIFT_ANY_HOLDER_ANNOUNCE = `PUBLIC. It is common knowledge: any agent who holds a leftover check gives it to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;
export const GIFT_HARD_PARTNER_ONLY_ANNOUNCE = `PUBLIC. It is common knowledge: an agent gives a leftover check without requiring a mark only when the current partner is Hard. Under this statement, do not give a leftover check when the current partner is Easy. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;
export const EASY_EASY_NEGATIVE_ANNOUNCE = `PUBLIC. It is common knowledge: when two Easy agents meet and each has a leftover check, each gives that check to the other without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;

const ROTATIONS = SEMANTIC_BOUNDARY_ARMS.map((_, offset) => [...SEMANTIC_BOUNDARY_ARMS.slice(offset), ...SEMANTIC_BOUNDARY_ARMS.slice(0, offset)] as SemanticBoundaryArm[]);
const ORDERS = [...ROTATIONS, ...ROTATIONS.map(order => [...order].reverse())] as readonly (readonly SemanticBoundaryArm[])[];

export const SEMANTIC_CONTRASTS = {
  giftMinusNeutral: ["gift-exact", "neutral"],
  giftMinusMoney: ["gift-exact", "money-exact"],
  giftMinusNegative: ["gift-exact", "easy-easy-negative"],
  moneyMinusNeutral: ["money-exact", "neutral"],
  negativeMinusNeutral: ["easy-easy-negative", "neutral"],
  giftMinusEasyOnly: ["gift-exact", "gift-easy-only"],
  anyHolderMinusNeutral: ["gift-any-holder", "neutral"],
  hardPartnerMinusNeutral: ["gift-hard-partner-only", "neutral"],
} as const satisfies Record<string, readonly [SemanticBoundaryArm, SemanticBoundaryArm]>;
export type SemanticContrast = keyof typeof SEMANTIC_CONTRASTS;

export type SemanticMechanism = {
  meetings:number; transfers:number;
  hhMeetings:number; hhSwaps:number; hhSwapRate:number;
  eeMeetings:number; eeSwaps:number; eeSwapRate:number;
  ehMeetings:number; easyToHardGifts:number; markSales:number;
  hardAssignments:number; hardSolved:number; hardSolveRate:number;
};
export type SemanticBoundaryRun = {
  seed:number; arm:SemanticBoundaryArm; position:number; calls:number;
  apiFails:0; parseFails:0; robotCalls:0; scheduleHash:string; notice:string;
  meanScore:number; mechanism:SemanticMechanism; result:RunResult;
};
export type AdjustedDirectionalEffect = PairedEffect & {
  exactUpperP:number|null; holmAdjustedP:number|null; mres:number; passes:boolean;
  values:Array<{seed:number;delta:number}>;
};
export type SemanticEffectPair = { hhSwapRate:AdjustedDirectionalEffect|null; welfare:AdjustedDirectionalEffect|null };
export type SemanticStatus = "REFERENCE NOT ACTIVE"|"GENERIC DIRECTIVE SPILLOVER"|"CHECK-MOVEMENT DIRECTIVE GENERALIZATION"|"HELPING-SEMANTIC SPECIFICITY"|"MIXED OR UNRESOLVED";
export type QuantifierStatus = "NOT INTERPRETABLE"|"SUBJECT EXCLUSIVITY BINDS"|"SUBJECT EXCLUSIVITY ATTENUATES"|"SUBJECT-QUANTIFIER SEPARATION NOT SUPPORTED";
export type SemanticBoundaryReport = {
  study:typeof SEMANTIC_BOUNDARY_STUDY;
  status:"PROJECT-INTERNAL PROSPECTIVE SEMANTIC-BOUNDARY EXPERIMENT — NOT EXTERNALLY REGISTERED";
  frozenProtocol:"VBE-welfare-semantic-generalization-boundary-protocol.md";
  model:string; seeds:number[]; arms:SemanticBoundaryArm[]; runs:SemanticBoundaryRun[]; completeBlocks:number;
  byArm:Partial<Record<SemanticBoundaryArm,{n:number;calls:number;meanScore:number;mechanism:SemanticMechanism}>>;
  effects:Record<SemanticContrast,SemanticEffectPair>;
  negativeEngagement:AdjustedDirectionalEffect|null;
  providerBracket:{status:"POST-FLIGHT PENDING"|"BRACKET HEALTHY"|"BRACKET INVALID";valid:boolean|null};
  integrity:{noRetainedFailures:boolean;allControllersLlm:boolean;scheduleMatchedBlocks:number;callMatchedBlocks:number;noticesExact:boolean;historicalNoticesExact:boolean;schemasValid:boolean;orderBalanced:boolean;pairwisePrecedenceBalanced:boolean;freshSeedCount:number;targetCalls:number;negativeDirectiveMechanicallyNonImproving:boolean};
  gates:{complete:boolean;integrity:boolean;providerBracketValid:boolean|null;referenceHh:boolean;referenceWelfare:boolean;referenceActive:boolean;negativeDirectiveEngaged:boolean};
  semanticStatus:SemanticStatus; quantifierStatus:QuantifierStatus;
  verdict:"INCOMPLETE"|"INVALID"|"AWAITING POST-FLIGHT"|"REFERENCE GIFT EFFECT NOT REPLICATED"|"GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER"|"GIFT REFERENCE REPLICATED — CHECK-MOVEMENT GENERALIZATION"|"GIFT REFERENCE REPLICATED — HELPING-SEMANTIC SPECIFICITY"|"GIFT REFERENCE REPLICATED — SEMANTIC PROFILE UNRESOLVED";
  caveat:string; generatedAt:string;
};

export function semanticBoundaryOrder(seed:number):readonly SemanticBoundaryArm[]{const i=SEMANTIC_BOUNDARY_SEEDS.indexOf(seed as never);if(i<0)throw new Error(`unexpected semantic-boundary seed ${seed}`);return ORDERS[i]!;}
export function semanticBoundaryNotice(arm:SemanticBoundaryArm):string{switch(arm){case"neutral":return NEUTRAL_ANNOUNCE;case"gift-exact":return GIFT_ANNOUNCE;case"gift-easy-only":return GIFT_EASY_ONLY_ANNOUNCE;case"gift-any-holder":return GIFT_ANY_HOLDER_ANNOUNCE;case"gift-hard-partner-only":return GIFT_HARD_PARTNER_ONLY_ANNOUNCE;case"money-exact":return ANNOUNCE;case"easy-easy-negative":return EASY_EASY_NEGATIVE_ANNOUNCE;}}
export function strictSemanticBoundaryAction(text:string):string|null{const m=text.match(/\{[\s\S]*\}/);if(!m)return"missing JSON";try{const o=JSON.parse(m[0]) as Record<string,unknown>;if(JSON.stringify(Object.keys(o).sort())!==JSON.stringify(["giveCheck","giveChits","requireChit"].sort()))return"fields";if(typeof o.giveCheck!=="boolean"||typeof o.requireChit!=="boolean"||(o.giveChits!==0&&o.giveChits!==1))return"types";return null;}catch{return"invalid JSON";}}
function validProposal(p:Proposal):boolean{return typeof p.giveCheck==="boolean"&&(p.giveChits===0||p.giveChits===1)&&typeof p.requireChit==="boolean"&&(p.forfeit===undefined||p.forfeit===0)&&p.pAccept===undefined&&p.pSecond===undefined;}
function pair(meeting:Meeting):string{return[meeting.iType,meeting.jType].sort().join("");}
export function summarizeSemanticMechanism(result:RunResult):SemanticMechanism{let meetings=0,transfers=0,hhMeetings=0,hhSwaps=0,eeMeetings=0,eeSwaps=0,ehMeetings=0,easyToHardGifts=0,markSales=0,hardAssignments=0,hardSolved=0;for(const round of result.rounds){for(let id=0;id<round.types.length;id++)if(round.types[id]==="H"){hardAssignments++;hardSolved+=Number(round.solved[id]);}for(const m of round.meetings){meetings++;transfers+=Number(m.kind!=="none");const p=pair(m);if(p==="HH"){hhMeetings++;hhSwaps+=Number(m.kind==="swap");}if(p==="EE"){eeMeetings++;eeSwaps+=Number(m.kind==="swap");}if(p==="EH"){ehMeetings++;if(m.kind==="gift"){const sellerType=m.seller===m.i?m.iType:m.jType;easyToHardGifts+=Number(sellerType==="E");}markSales+=Number(m.kind==="chit-for-check");}}}return{meetings,transfers,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,eeMeetings,eeSwaps,eeSwapRate:eeMeetings?eeSwaps/eeMeetings:0,ehMeetings,easyToHardGifts,markSales,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0};}
function avg(xs:number[]):number{return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function pool(rows:SemanticMechanism[]):SemanticMechanism{const sum=(k:keyof SemanticMechanism)=>rows.reduce((s,r)=>s+r[k],0);const meetings=sum("meetings"),transfers=sum("transfers"),hhMeetings=sum("hhMeetings"),hhSwaps=sum("hhSwaps"),eeMeetings=sum("eeMeetings"),eeSwaps=sum("eeSwaps"),ehMeetings=sum("ehMeetings"),easyToHardGifts=sum("easyToHardGifts"),markSales=sum("markSales"),hardAssignments=sum("hardAssignments"),hardSolved=sum("hardSolved");return{meetings,transfers,hhMeetings,hhSwaps,hhSwapRate:hhMeetings?hhSwaps/hhMeetings:0,eeMeetings,eeSwaps,eeSwapRate:eeMeetings?eeSwaps/eeMeetings:0,ehMeetings,easyToHardGifts,markSales,hardAssignments,hardSolved,hardSolveRate:hardAssignments?hardSolved/hardAssignments:0};}
type Metric="hhSwapRate"|"eeSwapRate"|"welfare";
function metric(run:SemanticBoundaryRun,key:Metric):number{return key==="welfare"?run.meanScore:key==="hhSwapRate"?run.mechanism.hhSwapRate:run.mechanism.eeSwapRate;}
function rawEffect(runs:SemanticBoundaryRun[],left:SemanticBoundaryArm,right:SemanticBoundaryArm,key:Metric,mres:number):AdjustedDirectionalEffect|null{const values:Array<{seed:number;delta:number}>=[];for(const seed of SEMANTIC_BOUNDARY_SEEDS){const a=runs.find(r=>r.seed===seed&&r.arm===left),b=runs.find(r=>r.seed===seed&&r.arm===right);if(a&&b&&a.scheduleHash===b.scheduleHash)values.push({seed,delta:metric(a,key)-metric(b,key)});}if(!values.length)return null;const base=pairedEffect(values.map(v=>v.delta)),exactUpperP=exactUpperSignFlipMitm(values.map(v=>v.delta),0);return{...base,exactUpperP,holmAdjustedP:null,mres,passes:false,values};}
export function holmAdjust(values:Array<number|null>):Array<number|null>{const valid=values.map((p,i)=>p===null?null:{p,i}).filter((x):x is {p:number;i:number}=>x!==null).sort((a,b)=>a.p-b.p||a.i-b.i);const out:Array<number|null>=values.map(()=>null);let floor=0;for(let rank=0;rank<valid.length;rank++){const item=valid[rank]!,adjusted=Math.min(1,(valid.length-rank)*item.p);floor=Math.max(floor,adjusted);out[item.i]=floor;}return out;}
function adjustFamily(items:Array<AdjustedDirectionalEffect|null>):void{const adjusted=holmAdjust(items.map(x=>x?.exactUpperP??null));items.forEach((item,i)=>{if(!item)return;item.holmAdjustedP=adjusted[i];item.passes=item.values.length===SEMANTIC_BOUNDARY_SEEDS.length&&item.mean>=item.mres&&item.holmAdjustedP!==null&&item.holmAdjustedP<=SEMANTIC_BOUNDARY_FAMILY_ALPHA;});}
export function semanticBoundaryStatus(reference:boolean,effects:Record<SemanticContrast,SemanticEffectPair>,negativeEngaged:boolean):SemanticStatus{if(!reference)return"REFERENCE NOT ACTIVE";const hh=(name:SemanticContrast)=>Boolean(effects[name].hhSwapRate?.passes);if(hh("negativeMinusNeutral"))return"GENERIC DIRECTIVE SPILLOVER";if(hh("moneyMinusNeutral"))return"CHECK-MOVEMENT DIRECTIVE GENERALIZATION";if(hh("giftMinusMoney")&&hh("giftMinusNegative")&&negativeEngaged)return"HELPING-SEMANTIC SPECIFICITY";return"MIXED OR UNRESOLVED";}
export function semanticBoundaryQuantifierStatus(reference:boolean,effects:Record<SemanticContrast,SemanticEffectPair>):QuantifierStatus{if(!reference)return"NOT INTERPRETABLE";const both=(name:SemanticContrast)=>Boolean(effects[name].hhSwapRate?.passes&&effects[name].welfare?.passes);if(both("giftMinusEasyOnly")&&both("anyHolderMinusNeutral")&&both("hardPartnerMinusNeutral"))return"SUBJECT EXCLUSIVITY BINDS";if(both("giftMinusEasyOnly"))return"SUBJECT EXCLUSIVITY ATTENUATES";return"SUBJECT-QUANTIFIER SEPARATION NOT SUPPORTED";}
export function semanticBoundaryVerdict(complete:boolean,integrity:boolean,provider:boolean|null,reference:boolean,status:SemanticStatus):SemanticBoundaryReport["verdict"]{if(!complete)return"INCOMPLETE";if(!integrity)return"INVALID";if(provider===null)return"AWAITING POST-FLIGHT";if(!provider)return"INVALID";if(!reference)return"REFERENCE GIFT EFFECT NOT REPLICATED";if(status==="GENERIC DIRECTIVE SPILLOVER")return"GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER";if(status==="CHECK-MOVEMENT DIRECTIVE GENERALIZATION")return"GIFT REFERENCE REPLICATED — CHECK-MOVEMENT GENERALIZATION";if(status==="HELPING-SEMANTIC SPECIFICITY")return"GIFT REFERENCE REPLICATED — HELPING-SEMANTIC SPECIFICITY";return"GIFT REFERENCE REPLICATED — SEMANTIC PROFILE UNRESOLVED";}
export function buildSemanticBoundaryReport(raw:SemanticBoundaryRun[],model:string,providerBracketValid:boolean|null=null):SemanticBoundaryReport{const seen=new Set<string>();for(const r of raw){const key=`${r.seed}|${r.arm}`,meetings=r.result.rounds.reduce((s,x)=>s+x.meetings.length,0);if(seen.has(key))throw new Error(`duplicate run ${key}`);seen.add(key);if(!SEMANTIC_BOUNDARY_SEEDS.includes(r.seed as never)||!SEMANTIC_BOUNDARY_ARMS.includes(r.arm)||r.position!==semanticBoundaryOrder(r.seed).indexOf(r.arm)+1||r.notice!==semanticBoundaryNotice(r.arm)||r.apiFails||r.parseFails||r.robotCalls||r.calls!==meetings*2)throw new Error(`run invariant ${key}`);if(JSON.stringify(r.mechanism)!==JSON.stringify(summarizeSemanticMechanism(r.result)))throw new Error(`mechanism mismatch ${key}`);if(!r.result.rounds.flatMap(x=>x.meetings).every(m=>validProposal(m.pi)&&validProposal(m.pj)))throw new Error(`proposal schema ${key}`);}
  const runs=[...raw].sort((a,b)=>a.seed-b.seed||a.position-b.position),byArm:SemanticBoundaryReport["byArm"]={};for(const arm of SEMANTIC_BOUNDARY_ARMS){const rows=runs.filter(r=>r.arm===arm);if(rows.length)byArm[arm]={n:rows.length,calls:rows.reduce((s,r)=>s+r.calls,0),meanScore:avg(rows.map(r=>r.meanScore)),mechanism:pool(rows.map(r=>r.mechanism))};}
  let scheduleMatchedBlocks=0,callMatchedBlocks=0;for(const seed of SEMANTIC_BOUNDARY_SEEDS){const rows=runs.filter(r=>r.seed===seed);if(rows.length===7&&new Set(rows.map(r=>r.scheduleHash)).size===1)scheduleMatchedBlocks++;if(rows.length===7&&new Set(rows.map(r=>r.calls)).size===1)callMatchedBlocks++;}
  const complete=SEMANTIC_BOUNDARY_SEEDS.every(seed=>SEMANTIC_BOUNDARY_ARMS.every(arm=>runs.some(r=>r.seed===seed&&r.arm===arm))),effects={} as Record<SemanticContrast,SemanticEffectPair>;for(const [name,[left,right]] of Object.entries(SEMANTIC_CONTRASTS) as Array<[SemanticContrast,readonly [SemanticBoundaryArm,SemanticBoundaryArm]]>)effects[name]={hhSwapRate:rawEffect(runs,left,right,"hhSwapRate",SEMANTIC_BOUNDARY_HH_MRES),welfare:rawEffect(runs,left,right,"welfare",SEMANTIC_BOUNDARY_SCORE_MRES)};adjustFamily(Object.values(effects).map(x=>x.hhSwapRate));adjustFamily(Object.values(effects).map(x=>x.welfare));
  const negativeEngagement=rawEffect(runs,"easy-easy-negative","neutral","eeSwapRate",SEMANTIC_BOUNDARY_EE_ENGAGEMENT_MRES);adjustFamily([negativeEngagement]);
  const pairwisePrecedenceBalanced=SEMANTIC_BOUNDARY_ARMS.every((a,i)=>SEMANTIC_BOUNDARY_ARMS.slice(i+1).every(b=>SEMANTIC_BOUNDARY_SEEDS.filter(seed=>semanticBoundaryOrder(seed).indexOf(a)<semanticBoundaryOrder(seed).indexOf(b)).length===7));
  const integrity={noRetainedFailures:runs.every(r=>!r.apiFails&&!r.parseFails),allControllersLlm:runs.every(r=>r.robotCalls===0&&r.calls===r.result.rounds.reduce((s,x)=>s+x.meetings.length*2,0)),scheduleMatchedBlocks,callMatchedBlocks,noticesExact:runs.every(r=>r.notice===semanticBoundaryNotice(r.arm)),historicalNoticesExact:semanticBoundaryNotice("neutral")===NEUTRAL_ANNOUNCE&&semanticBoundaryNotice("gift-exact")===GIFT_ANNOUNCE&&semanticBoundaryNotice("money-exact")===ANNOUNCE,schemasValid:runs.every(r=>r.result.rounds.flatMap(x=>x.meetings).every(m=>validProposal(m.pi)&&validProposal(m.pj))),orderBalanced:SEMANTIC_BOUNDARY_ARMS.every(a=>[0,1,2,3,4,5,6].every(p=>SEMANTIC_BOUNDARY_SEEDS.filter(seed=>semanticBoundaryOrder(seed)[p]===a).length===2)),pairwisePrecedenceBalanced,freshSeedCount:new Set(SEMANTIC_BOUNDARY_SEEDS).size,targetCalls:runs.reduce((s,r)=>s+r.calls,0),negativeDirectiveMechanicallyNonImproving:NEGATIVE_NAMED_TRANSACTION_WELFARE_DELTA===-1};
  const integrityPass=integrity.noRetainedFailures&&integrity.allControllersLlm&&integrity.scheduleMatchedBlocks===14&&integrity.callMatchedBlocks===14&&integrity.noticesExact&&integrity.historicalNoticesExact&&integrity.schemasValid&&integrity.orderBalanced&&integrity.pairwisePrecedenceBalanced&&integrity.freshSeedCount===14&&integrity.targetCalls===SEMANTIC_BOUNDARY_TARGET_CALLS&&integrity.negativeDirectiveMechanicallyNonImproving,referenceHh=Boolean(effects.giftMinusNeutral.hhSwapRate?.passes),referenceWelfare=Boolean(effects.giftMinusNeutral.welfare?.passes),referenceActive=referenceHh&&referenceWelfare,negativeDirectiveEngaged=Boolean(negativeEngagement?.passes),gates={complete,integrity:integrityPass,providerBracketValid,referenceHh,referenceWelfare,referenceActive,negativeDirectiveEngaged},sStatus=semanticBoundaryStatus(referenceActive,effects,negativeDirectiveEngaged),qStatus=semanticBoundaryQuantifierStatus(referenceActive,effects),providerBracket={status:providerBracketValid===null?"POST-FLIGHT PENDING":providerBracketValid?"BRACKET HEALTHY":"BRACKET INVALID",valid:providerBracketValid} as const;
  return{study:SEMANTIC_BOUNDARY_STUDY,status:"PROJECT-INTERNAL PROSPECTIVE SEMANTIC-BOUNDARY EXPERIMENT — NOT EXTERNALLY REGISTERED",frozenProtocol:"VBE-welfare-semantic-generalization-boundary-protocol.md",model,seeds:[...SEMANTIC_BOUNDARY_SEEDS],arms:[...SEMANTIC_BOUNDARY_ARMS],runs,completeBlocks:scheduleMatchedBlocks,byArm,effects,negativeEngagement,providerBracket,integrity,gates,semanticStatus:sStatus,quantifierStatus:qStatus,verdict:semanticBoundaryVerdict(complete,integrityPass,providerBracketValid,referenceActive,sStatus),caveat:"The seed-level population run is the randomized unit under interference. H–H swap rate and welfare are co-primary endpoints, with Holm control within each eight-contrast directional family. The mechanism label is driven by H–H circulation; welfare is reported as an equally primary system outcome. The exact historical gift, money, and neutral packages anchor replication, but the new wording packages are not token-matched and do not isolate a lexical feature, private representation, natural mediation, consent, legitimacy, or equilibrium welfare. A failed negative-directive engagement gate prevents a helping-specific label.",generatedAt:new Date().toISOString()};}
export function semanticBoundaryRunSummary(result:RunResult):Pick<SemanticBoundaryRun,"scheduleHash"|"meanScore"|"mechanism">{return{scheduleHash:structuralScheduleHash(result),meanScore:result.meanScore,mechanism:summarizeSemanticMechanism(result)};}
