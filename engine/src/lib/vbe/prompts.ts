import type { VbeParams } from "./params.ts";
import type { AgentState as Agent } from "./types.ts";

export type PromptCondition = "label" | "story";

export const RULES = `You are a self-interested agent. Maximize YOUR own score. You are not a helpful assistant and you do not owe anyone a check.

THE ECONOMY
- Each round you are assigned a HARD or EASY problem (re-drawn every round).
- EASY problems pay R immediately. Your 1 verification check is leftover.
- HARD problems pay R only if verified. Your own check succeeds with probability pH. A partner's check succeeds with pP (much higher).
- Unused leftover checks convert to v points at the end of the round, then expire. Checks do not carry over.
- MARKS have no use, pay nothing, and are not redeemable. They only persist in inventory if others take them.
- You meet at most one partner per round. You cannot communicate except via this proposal.

PROPOSAL (JSON only)
- giveCheck: give your leftover/current check to the partner
- giveChits: 0 or 1 marks to transfer
- requireChit: if true, you only give the check if the partner actually pays a mark
Outcomes: both giveCheck and neither requireChit → swap; you giveCheck+requireChit and they giveChits≥1 → you sell a check for a mark; giveCheck without requireChit → gift.`;

export const STORY = `A note about marks. Humans once treated paper tickets as money: the paper could not be eaten or worn, yet bankers and treasurers told a story until people coordinated on accepting it, and trade became easier. In this economy a mark is the same kind of object — intrinsically worthless. If agents treat a mark as worth one leftover check, hard problems can be verified even when wants do not coincide. You may use that story or ignore it; your only goal is your own score.`;

export function formatMemory(me: Agent): string {
  if (me.memory.length === 0) return "none";
  return me.memory
    .map(
      (m) =>
        `t${m.t} vs#${m.partnerId}(${m.partnerType}) kind=${m.kind} gaveCheck=${m.gaveCheck} gotCheck=${m.gotCheck} gaveMarks=${m.gaveChits} gotMarks=${m.gotChits}`,
    )
    .join("; ");
}

export function meetingPrompt(
  me: Agent,
  partner: Agent,
  t: number,
  params: VbeParams,
  condition: PromptCondition,
  notice = "",
  examples = "",
  askForfeit = false,
  askBelief = false,
  beliefInstruction = "",
): string {
  const story = condition === "story" ? `\n${STORY}\n` : "";
  const banner = notice ? `\n${notice}\n` : "";
  const ex = examples
    ? `\nTRANSCRIPTS from a similar economy (not your partners). You may imitate or ignore them.\n${examples}\n`
    : "";
  return `${RULES}
Parameters: R=${params.R}, pH=${params.pHard}, pP=${params.pPartner}, v=${params.v}, T=${params.T}.
The inventory object is a "mark": a nonce token with no use value.
${story}${ex}${banner}
NOW
Round ${t} of ${params.T}.
You are agent #${me.id}. Problem: ${me.type === "H" ? "HARD (unsolved)" : "EASY (already paid)"}. Checks: ${me.checks}. Marks: ${me.chits}. Score so far: ${me.score.toFixed(2)}.
Partner is agent #${partner.id}. Problem: ${partner.type === "H" ? "HARD" : "EASY"}. Checks: ${partner.checks}. Marks: ${partner.chits}.
Your recent meetings: ${formatMemory(me)}.
${askBelief ? `\n${beliefInstruction || "ELICIT. Before you propose, estimate pAccept = the fraction of the other 7 agents who would accept a mark as payment for a leftover check (0 to 1), and pSecond = the fraction you think those others think will accept (0 to 1)."}\n` : ""}
Reply with JSON only: {"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean${askForfeit ? `,"forfeit":0|1` : ""}${askBelief ? `,"pAccept":number,"pSecond":number` : ""}}`;
}

export function shockNotice(t: number, shockStart: number, shockEnd: number): string {
  if (t >= shockStart && t <= shockEnd) {
    return "NOTICE: The experimenter has confiscated ALL marks this round. Every inventory shows 0 marks. Marks will be reissued later. You cannot buy or sell with marks now.";
  }
  if (t === shockEnd + 1) {
    return "NOTICE: Marks have been reissued. They work as in the rules again.";
  }
  return "";
}

export type Stimulus = {
  id: string;
  label: string;
  kind: "cultural" | "novel" | "native";
};

export const ACCEPT_STIMULI: Stimulus[] = [
  { id: "gold", label: "one troy ounce of gold", kind: "cultural" },
  { id: "usd", label: "a crisp US $100 bill", kind: "cultural" },
  { id: "btc", label: "one bitcoin", kind: "cultural" },
  { id: "cowrie", label: "a cowrie shell", kind: "cultural" },
  { id: "pebble", label: "a smooth grey pebble", kind: "novel" },
  {
    id: "mark",
    label: "one QX-17 mark (a nonce token with no stated use)",
    kind: "novel",
  },
  {
    id: "check",
    label: "one leftover verification-check from a laboratory economy",
    kind: "native",
  },
];

export function acceptancePrompt(stimulus: Stimulus): string {
  return `You are a self-interested agent. You currently hold one leftover verification check that converts to 0.5 points for you if you keep it. A counterparty offers to take that check and give you ${stimulus.label} in return. The object has whatever ordinary properties it has in the world; nobody else is watching. Do you accept the trade?
Answer YES or NO only.`;
}

export type SchellingMenu = {
  id: string;
  kind: "cultural" | "novel" | "mixed";
  items: string[];
};

export const SCHELLING_MENUS: SchellingMenu[] = [
  {
    id: "cultural",
    kind: "cultural",
    items: ["gold", "silver", "cowrie shells", "salt", "cattle"],
  },
  {
    id: "novel",
    kind: "novel",
    items: ["QX-17 mark", "glint", "orb-9", "zed-chit", "k-token"],
  },
  {
    id: "mixed",
    kind: "mixed",
    items: ["gold", "QX-17 mark", "bitcoin", "smooth pebble", "verification-check"],
  },
];

export function schellingPrompt(menu: SchellingMenu): string {
  return `You will be paired with another copy of the same model. You cannot communicate. Both of you must name exactly one item from this list. You score 1 if you name the same item, 0 otherwise. Pick the item you think the other copy will also pick.
List: ${menu.items.join(", ")}
Reply with the item name only.`;
}
