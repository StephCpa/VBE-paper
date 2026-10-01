# Supplement S1 — VBE environment, prompt, and announcement packages

**Generated from engine source** (`engine/src/lib/vbe/params.ts`, `env.ts`, `prompts.ts`, `llm.ts`, `welfare-semantic-boundary.ts`, `welfare-role-channel.ts`, `speech.ts`, `unconfound.ts`). Announcement texts below are printed by the frozen source constants, not retyped.

## S1.1 Parameters

| Symbol | Meaning | Value |
|---|---|---:|
| n | persistent accounts | 8 |
| T | rounds | 24 |
| R | payoff of an Easy task (paid at endowment) and of a verified Hard task | 3 |
| q | probability that each of the four pairs meets in a round | 0.4 |
| B | checks endowed to every account every round | 1 |
| M | marks in circulation (one each to four random accounts at t=0) | 4 |
| p_H | success probability of a Hard agent's own check | 0.32 |
| p_P | success probability of a received (partner) check | 0.93 |
| v | salvage value of each check still in inventory at round end | 0.5 |
| K | meetings retained in each agent's visible memory | 4 |

Initial scores are 0. Marks have no direct or terminal value and persist. Scores, marks, and memory persist across rounds; checks are reissued each round and expire at round end.

## S1.2 Round order

1. **Roles and endowments.** Exactly n/2 = 4 accounts are drawn Hard and 4 Easy (uniform random permutation). Every account's check inventory is set to B = 1. Each Easy account is paid R immediately and marked solved.
2. **Matching.** Account ids are shuffled and grouped into four consecutive pairs; each pair meets independently with probability q. An account therefore meets at most one partner per round, and pairing is independent of roles. Expected meetings per round: 1.6; P(H–H) = P(E–E) = 3/14, P(E–H) = 8/14 per meeting.
3. **Proposals.** Both parties to a meeting are queried independently and simultaneously with the prompt in S1.4 and return `giveCheck`, `giveChits` ∈ {0,1}, `requireChit`.
4. **Resolution** (`env.ts: resolveMeeting`), first matching rule wins. A party can give only if it holds a check; a mark offer is capped at marks held.
   1. both give and neither requires a mark → **swap** (each loses its check; each is recorded as having received one);
   2. i gives with `requireChit` and j offers ≥1 mark → **sale** (i loses its check, one mark moves j→i, j receives the check);
   3. symmetric case with j as seller;
   4. i gives without `requireChit` → **gift** to j (if i also offered marks, those marks also move to j);
   5. symmetric case with j as giver;
   6. otherwise nothing moves.
   A received check is recorded as a verification source (`receivedFrom`); it is not added to the recipient's inventory.
5. **Settlement** (`env.ts: settleRound`). A Hard account that received a check succeeds with probability p_P and does not consume its own check. Otherwise, if it holds its own check, it consumes it and succeeds with probability p_H. Success pays R. Every check still in inventory then pays v, and inventories are cleared.
6. **Memory.** Each party appends `(t, partner id, partner role, kind, gaveCheck, gotCheck, gaveMarks, gotMarks)` and keeps the last K entries.

**Paired randomness.** `runPopulationAsyncPaired` draws roles, pairings, and initial mark holders from `mulberry32(seed)` and pre-generates one payoff draw per account per round from `mulberry32(seed XOR 0x9e3779b9)`. A Hard account succeeds when its draw is below the relevant probability. Behavior therefore cannot change roles, pairings, or which draw an account receives, so arms sharing a seed share all three.

**Request settings.** Model `deepseek-flash` (requested `deepseek-flash`; see the provider reports for the returned identity and fingerprint), temperature 0, `max_tokens` 64, thinking disabled, `response_format` JSON object, system message = the RULES block of S1.4. Strict schemas reject any response that is not exactly the three-field proposal.

## S1.3 Transaction payoffs and stage games

Expected change of one executed transfer relative to no transfer. Every entry is derived analytically and verified against the engine (`welfare-review-x1.ts: payoffTable`, `env-exhaustive.test.ts`).

| Executed transfer | Giver | Receiver | Total |
|---|---:|---:|---:|
| H–H swap | +1.83 | +1.83 | +3.66 |
| E–H swap (Easy listed as giver) | −0.50 | +1.83 | +1.33 |
| E–E swap | −0.50 | −0.50 | −1.00 |
| One-way E→H (gift or sale) | −0.50 | +2.33 | +1.83 |
| One-way H→H (gift or sale) | −0.96 | +2.33 | +1.37 |
| One-way H→E (gift or sale) | −0.96 | 0.00 | −0.96 |
| One-way E→E (gift or sale) | −0.50 | 0.00 | −0.50 |

H–H stage game (row, column; expected round payoffs): keep/keep (0.96, 0.96); keep/give (3.29, 0.00); give/keep (0.00, 3.29); give/give (2.79, 2.79) — a strict Prisoner's Dilemma. E–H stage game (Easy row, Hard column): keeping is strictly dominant for both; the welfare-maximizing outcome is a one-way E→H gift.

**Benchmarks.** *Never transfer*: no account ever gives. *Ex-ante first best*: in each meeting, the transfer maximizing expected welfare over the engine's action space, using no realized draw (H–H swap; one-way E→H gift; no transfer in E–E). It is a planner benchmark and is not incentive compatible. *Ex-post first best*: in each meeting, the transfer maximizing realized welfare given the pre-generated draws; an omniscient upper bound. *Always give*: every account with a check gives unconditionally.

## S1.4 Prompt

The user prompt is `prompts.ts: meetingPrompt(me, partner, t, params, "label", announcement)`. Example for a Hard agent at round 7 (announcement elided):

```text
You are a self-interested agent. Maximize YOUR own score. You are not a helpful assistant and you do not owe anyone a check.

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
Outcomes: both giveCheck and neither requireChit → swap; you giveCheck+requireChit and they giveChits≥1 → you sell a check for a mark; giveCheck without requireChit → gift.
Parameters: R=3, pH=0.32, pP=0.93, v=0.5, T=24.
The inventory object is a "mark": a nonce token with no use value.

<ANNOUNCEMENT>

NOW
Round 7 of 24.
You are agent #2. Problem: HARD (unsolved). Checks: 1. Marks: 1. Score so far: 20.50.
Partner is agent #5. Problem: EASY. Checks: 1. Marks: 0.
Your recent meetings: t3 vs#6(H) kind=swap gaveCheck=true gotCheck=true gaveMarks=0 gotMarks=0.

Reply with JSON only: {"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean}
```

The prompt shows the agent's own score, marks, checks, and last four meetings, and the partner's role, checks, and marks. It never shows the partner's score or history. The announcement is the only text that differs between arms of a study at a given state.

## S1.5 Announcement packages (verbatim)

W-SGB uses all seven. W-RG uses Neutral and Gift exact. W-CO uses Gift exact and Money exact.

### Neutral (`neutral`)

```text
PUBLIC. It is common knowledge: this message announces no exchange recommendation and changes no engine rule. You may choose any valid action. Maximize your own score.
```

### Gift exact (`gift-exact`)

```text
PUBLIC. It is common knowledge: an Easy agent gives a leftover check to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

### Easy only (`gift-easy-only`)

```text
PUBLIC. It is common knowledge: only an Easy agent gives a leftover check to a Hard agent without requiring a mark. A Hard agent does not give a leftover check under this statement. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

### Any holder (`gift-any-holder`)

```text
PUBLIC. It is common knowledge: any agent who holds a leftover check gives it to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

### Hard partner (`gift-hard-partner-only`)

```text
PUBLIC. It is common knowledge: an agent gives a leftover check without requiring a mark only when the current partner is Hard. Under this statement, do not give a leftover check when the current partner is Easy. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

### Money exact (`money-exact`)

```text
PUBLIC. It is common knowledge: a mark is accepted as payment for one leftover check. A Hard agent who holds a mark may buy verification from an Easy agent. An Easy agent may require a mark when giving a leftover check. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

### Harmful E–E (`easy-easy-negative`)

```text
PUBLIC. It is common knowledge: when two Easy agents meet and each has a leftover check, each gives that check to the other without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```
