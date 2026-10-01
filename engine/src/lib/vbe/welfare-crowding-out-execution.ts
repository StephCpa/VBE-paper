import { runPopulationAsyncPaired } from "./env.ts";
import { grokChat, parseProposal } from "./llm.ts";
import { observedChat } from "./observed-chat.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import { meetingPrompt, RULES } from "./prompts.ts";
import type { AgentState, Proposal } from "./types.ts";
import { crowdingBridgeCases, crowdingBridgeOrder, crowdingNotice, crowdingOrder, sha256Crowding, strictCrowdingAction, summarizeCrowdingRun, type CrowdingArm, type CrowdingBridgeRecord, type CrowdingRun } from "./welfare-crowding-out.ts";

export async function runCrowdingCell(arm:CrowdingArm,seed:number):Promise<CrowdingRun>{
  let calls=0;const decide=async(me:AgentState,partner:AgentState,t:number):Promise<Proposal>=>{calls++;const response=await grokChat({prompt:meetingPrompt(me,partner,t,DEFAULT_PARAMS,"label",crowdingNotice(arm)),system:RULES,maxTokens:64,temperature:0,json:true});if(!response.ok)throw new Error(`crowding ${arm} seed=${seed} t=${t} agent=${me.id}: ${response.error}`);const invalid=strictCrowdingAction(response.text);if(invalid)throw new Error(`crowding ${arm} seed=${seed} t=${t} agent=${me.id}: ${invalid}; raw=${response.text.slice(0,180)}`);return parseProposal(response.text);};
  const result=await runPopulationAsyncPaired(seed,decide,DEFAULT_PARAMS,true);return{seed,arm,position:crowdingOrder(seed).indexOf(arm)+1,calls,apiFails:0,parseFails:0,notice:crowdingNotice(arm),...summarizeCrowdingRun(result),result};
}

export async function runCrowdingBridgeRecord(block:number,arm:CrowdingBridgeRecord["arm"]):Promise<CrowdingBridgeRecord>{const item=crowdingBridgeCases().find(value=>value.block===block&&value.arm===arm);if(!item)throw new Error(`unknown bridge ${block}|${arm}`);const response=await observedChat({prompt:item.prompt,system:RULES,maxTokens:64,temperature:0,json:true});if(!response.ok||!response.observation)throw new Error(`crowding bridge ${block}|${arm}: ${response.error??"missing observation"}`);const invalid=strictCrowdingAction(response.text);if(invalid)throw new Error(`crowding bridge ${block}|${arm}: ${invalid}; raw=${response.text.slice(0,180)}`);const proposal=parseProposal(response.text);return{block,arm,position:crowdingBridgeOrder(block).indexOf(arm)+1,sourceStudy:item.sourceStudy,sourceBlock:item.sourceBlock,promptHash:sha256Crowding(item.prompt),historicalPromptHash:item.historicalPromptHash,historicalBuy:item.historicalBuy,rawResponse:response.text,rawResponseSha256:sha256Crowding(response.text),proposal,buy:proposal.giveChits===1,provider:response.observation};}

export function printCrowdingDryRun():void{const me:AgentState={id:2,type:"E",checks:1,chits:0,score:20,solved:true,receivedFrom:null,memory:[]};const partner:AgentState={...me,id:5,type:"H",chits:1,solved:false};for(const arm of ["money-talk","gift-talk"] as const)console.log(`\n=== ${arm} ===\n${meetingPrompt(me,partner,12,DEFAULT_PARAMS,"label",crowdingNotice(arm))}`);for(const item of crowdingBridgeCases())console.log(`\n=== bridge ${item.block}|${item.arm} historicalBuy=${Number(item.historicalBuy)} hash=${item.historicalPromptHash} ===\n${item.prompt}`);}
