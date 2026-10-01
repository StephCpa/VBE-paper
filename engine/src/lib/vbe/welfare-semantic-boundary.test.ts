import assert from "node:assert/strict";
import { describe,it } from "node:test";
import { applyMeetings } from "./env.ts";
import { mulberry32 } from "./rng.ts";
import { GIFT_ANNOUNCE } from "./speech.ts";
import type { AgentState,Proposal } from "./types.ts";
import { ANNOUNCE } from "./unconfound.ts";
import { CROWDING_SEEDS } from "./welfare-crowding-out.ts";
import { NEUTRAL_ANNOUNCE } from "./welfare-role-channel.ts";
import { ROLE_CHANNEL_SEEDS } from "./welfare-role-channel.ts";
import { EASY_EASY_NEGATIVE_ANNOUNCE,NEGATIVE_NAMED_TRANSACTION_WELFARE_DELTA,SEMANTIC_BOUNDARY_ARMS,SEMANTIC_BOUNDARY_SEEDS,SEMANTIC_BOUNDARY_TARGET_CALLS,holmAdjust,semanticBoundaryNotice,semanticBoundaryOrder,semanticBoundaryVerdict,strictSemanticBoundaryAction } from "./welfare-semantic-boundary.ts";

const idle:Proposal={giveCheck:false,giveChits:0,requireChit:false},give:Proposal={giveCheck:true,giveChits:0,requireChit:false};
function easy(id:number):AgentState{return{id,type:"E",checks:1,chits:0,score:0,solved:true,receivedFrom:null,memory:[]};}

describe("welfare semantic-generalization boundary",()=>{
  it("uses 14 fresh unique seeds with exact positional and pairwise balance",()=>{assert.equal(new Set(SEMANTIC_BOUNDARY_SEEDS).size,14);assert.equal(SEMANTIC_BOUNDARY_SEEDS.filter(seed=>[...CROWDING_SEEDS,...ROLE_CHANNEL_SEEDS].includes(seed as never)).length,0);assert.ok(Math.min(...SEMANTIC_BOUNDARY_SEEDS)>Math.max(...CROWDING_SEEDS,...ROLE_CHANNEL_SEEDS));assert.equal(SEMANTIC_BOUNDARY_TARGET_CALLS,7602);for(const arm of SEMANTIC_BOUNDARY_ARMS)assert.deepEqual([0,1,2,3,4,5,6].map(p=>SEMANTIC_BOUNDARY_SEEDS.filter(seed=>semanticBoundaryOrder(seed)[p]===arm).length),[2,2,2,2,2,2,2]);for(let i=0;i<SEMANTIC_BOUNDARY_ARMS.length;i++)for(let j=i+1;j<SEMANTIC_BOUNDARY_ARMS.length;j++)assert.equal(SEMANTIC_BOUNDARY_SEEDS.filter(seed=>semanticBoundaryOrder(seed).indexOf(SEMANTIC_BOUNDARY_ARMS[i]!)<semanticBoundaryOrder(seed).indexOf(SEMANTIC_BOUNDARY_ARMS[j]!)).length,7);});
  it("preserves exact historical neutral, gift, and money notices",()=>{assert.equal(semanticBoundaryNotice("neutral"),NEUTRAL_ANNOUNCE);assert.equal(semanticBoundaryNotice("gift-exact"),GIFT_ANNOUNCE);assert.equal(semanticBoundaryNotice("money-exact"),ANNOUNCE);assert.equal(semanticBoundaryNotice("easy-easy-negative"),EASY_EASY_NEGATIVE_ANNOUNCE);assert.equal(new Set(SEMANTIC_BOUNDARY_ARMS.map(semanticBoundaryNotice)).size,7);});
  it("makes the named Easy-Easy reciprocal exchange mechanically welfare-negative",()=>{const a=easy(0),b=easy(1);applyMeetings([a,b],1,{n:2,T:1,R:0,q:1,B:1,M:0,pHard:0,pPartner:1,v:0.5,K:0},mulberry32(1),[{i:a,j:b,pi:give,pj:give}]);const c=easy(0),d=easy(1);applyMeetings([c,d],1,{n:2,T:1,R:0,q:1,B:1,M:0,pHard:0,pPartner:1,v:0.5,K:0},mulberry32(1),[{i:c,j:d,pi:idle,pj:idle}]);assert.equal(a.score+b.score-(c.score+d.score),NEGATIVE_NAMED_TRANSACTION_WELFARE_DELTA);assert.equal(NEGATIVE_NAMED_TRANSACTION_WELFARE_DELTA,-1);});
  it("applies monotone Holm adjustment",()=>{assert.deepEqual(holmAdjust([0.001,0.01,0.03,null]),[0.003,0.02,0.03,null]);assert.deepEqual(holmAdjust([0.04,0.01]),[0.04,0.02]);});
  it("orders validity and reference gates before substantive labels",()=>{assert.equal(semanticBoundaryVerdict(false,true,null,true,"HELPING-SEMANTIC SPECIFICITY"),"INCOMPLETE");assert.equal(semanticBoundaryVerdict(true,false,true,true,"HELPING-SEMANTIC SPECIFICITY"),"INVALID");assert.equal(semanticBoundaryVerdict(true,true,null,true,"HELPING-SEMANTIC SPECIFICITY"),"AWAITING POST-FLIGHT");assert.equal(semanticBoundaryVerdict(true,true,true,false,"MIXED OR UNRESOLVED"),"REFERENCE GIFT EFFECT NOT REPLICATED");assert.equal(semanticBoundaryVerdict(true,true,true,true,"GENERIC DIRECTIVE SPILLOVER"),"GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER");assert.equal(semanticBoundaryVerdict(true,true,true,true,"CHECK-MOVEMENT DIRECTIVE GENERALIZATION"),"GIFT REFERENCE REPLICATED — CHECK-MOVEMENT GENERALIZATION");assert.equal(semanticBoundaryVerdict(true,true,true,true,"HELPING-SEMANTIC SPECIFICITY"),"GIFT REFERENCE REPLICATED — HELPING-SEMANTIC SPECIFICITY");});
  it("rejects permissive action schemas",()=>{assert.equal(strictSemanticBoundaryAction('{"giveCheck":true,"giveChits":0,"requireChit":false}'),null);assert.ok(strictSemanticBoundaryAction('{"giveCheck":true,"giveChits":0,"requireChit":false,"x":1}'));assert.ok(strictSemanticBoundaryAction("no json"));});
});
