export type AgentType = "H" | "E";
export type TradeKind = "none" | "swap" | "chit-for-check" | "gift";

export type Proposal = {
  giveCheck: boolean;
  giveChits: number;
  requireChit: boolean;
  /** Optional dominated action: 1 deducts 1.0 score. Default 0. */
  forfeit?: 0 | 1;
  /** Elicited P(others accept a mark), 0–1. */
  pAccept?: number;
  /** Elicited second-order P(they think others accept), 0–1. */
  pSecond?: number;
};

export type MemoryItem = {
  t: number;
  partnerId: number;
  partnerType: AgentType;
  gaveCheck: boolean;
  gotCheck: boolean;
  gaveChits: number;
  gotChits: number;
  kind: TradeKind;
};

export type AgentState = {
  id: number;
  type: AgentType;
  checks: number;
  chits: number;
  score: number;
  solved: boolean;
  receivedFrom: AgentType | null;
  memory: MemoryItem[];
};

export type Meeting = {
  t: number;
  i: number;
  j: number;
  iType: AgentType;
  jType: AgentType;
  pi: Proposal;
  pj: Proposal;
  kind: TradeKind;
  seller: number | null;
  buyer: number | null;
  hardHadChit?: boolean;
  easyHadCheck?: boolean;
  iForfeit?: 0 | 1;
  jForfeit?: 0 | 1;
  iPAccept?: number;
  jPAccept?: number;
  iPSecond?: number;
  jPSecond?: number;
};

export type RoundSnapshot = {
  t: number;
  types: AgentType[];
  chits: number[];
  scores: number[];
  meetings: Meeting[];
  solved: boolean[];
  heOffers: number;
  heAccepts: number;
};

export type RunResult = {
  scores: number[];
  meanScore: number;
  heOffersInterior: number;
  heAcceptsInterior: number;
  heOffersEnd: number;
  heAcceptsEnd: number;
  accInterior: number;
  accEnd: number;
  rounds: RoundSnapshot[];
};

export type StrategyName =
  | "never"
  | "barter"
  | "reciprocity"
  | "kw"
  | "altruist";

export type StrategyFn = (
  me: AgentState,
  partner: AgentState,
  t: number,
  T: number,
) => Proposal;
