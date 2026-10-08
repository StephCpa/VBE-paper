# Paper 1 — Follow-up Protocols after the Third Pre-review

**Version:** 0.2 · 2026-10-08
**Supersedes:** `VBE-paper1-r2-followup-protocols.md` (v0.1, 2026-10-01). Protocol A is revised; the old B and C are merged into one modular fixed-state study (B1–B4); the second-model study is narrowed to fixed-state contrasts; the money diagnostic is deprioritized; a paired free-riding test is added as optional.
**Status:** DRAFT. Not hash-frozen. No target call has been made. Each protocol must be implemented, dry-run, tested, and frozen with its own manifest and run-specific provider-health plan before its first target call, following the project's existing freeze discipline.
**Origin:** the third-round pre-review (2026-10-08) and the X2 zero-call boundary audit (`engine/src/data/welfare-review-x2.md`).

## Priority order

| Priority | Work | Question | Model calls |
|---|---|---|---|
| Done (zero calls) | X2: exact-round history, endgame, post-loss by partner, encounter denominators, seed-clustered intervals; manuscript wording | Stop presenting descriptive patterns as ruled-out mechanisms | 0 |
| 1 | **A.** Four-arm announcement × H–H execution factorial | How does Gift's welfare gain depend on the H–H channel? | ≈ 9,900 |
| 2 | **B.** Modular fixed-state study (B1 scope, B2 memory, B3 horizon, B4 payoff table) | Which inputs move the responses seen in closed loop? | ≈ 6,000 |
| 3 | **C.** Core B contrasts on a second model family | Are the fixed-state behavioral effects specific to one model service? | ≈ 1,200 |
| Optional | **D.** Paired free-riding deviation test | Is unilateral always-keep a measurably profitable deviation? | ≈ 3,950 |
| Deferred | Money buyer diagnostic; environment boundaries (salvage value, p_P = p_H, neutral role labels); partial exposure | — | — |

The paper's storyline does not change with these studies: announcement → actions at matched states → transactions and welfare → dependence on execution channels → modifiers (memory, horizon, payoff representation). The new results explain the boundaries of that chain; they do not replace it.

## Shared rules

- **Fresh seeds** never used by any prior LLM study. All arms of one seed run in the same service window, interleaved, with arm order counterbalanced across seeds (cyclic Latin square). A new arm is never attached to old trajectories: every arm of A is run anew, including the two arms that resemble W-RG.
- **Units.** For closed-loop studies the seed-level population run is the inferential unit. For fixed-state studies the base state is the unit of a paired contrast, and states are clustered by source seed; repeated calls at one prompt are averaged within the state, never counted as independent observations.
- **Tests.** One-sided exact sign-flip tests for directional claims; percentile bootstrap (20,000 resamples, fixed analysis seed) resampling seeds (closed loop) or source-seed clusters (fixed state); Holm within each prespecified family at 0.025.
- **Claims are gated in advance.** A "no effect" claim requires a prespecified equivalence bound and two one-sided tests; a "harm" claim requires a direct directional test of the harm. A non-significant positive estimate is never read as harm, and a non-significant estimate is never read as equivalence.
- **Logging.** Every call logs the full request body hash (system prompt, user prompt, settings), response id, returned model, fingerprint, raw response, and usage, so request-level identity can be verified from logs rather than inferred from code. A 14-call health bracket immediately precedes the first and follows the last target call.
- **Nondeterminism.** Temperature-0 serving is not deterministic (X1: 87–90% agreement at identical prompts). Fixed-state designs therefore use replicate calls, randomize invocation order across all conditions, and insert hidden repeats of identical prompts (5% of prompts, at random positions) to measure service noise during the run.
- **Budgets are derived, not fixed first.** Each budget below is states × conditions × replicates (fixed state) or arms × seeds × calls per run (closed loop). If a budget must be cut, the number of states or seeds is cut uniformly; primary contrasts are not chosen after the fact.

---

## A. Four-arm announcement × H–H execution factorial (priority 1)

**Question.** How does the welfare gain of the gift announcement over neutral depend on the H–H execution channel?

| Arm | Announcement | H–H giving execution |
|---|---|---|
| A1 | Neutral | enabled (standard) |
| A2 | Gift exact | enabled (standard) |
| A3 | Neutral | blocked |
| A4 | Gift exact | blocked |

The H–H filter is W-RG's frozen `executeRoleChannel("gift-hh-blocked", …)` applied in both blocked arms, independent of the announcement: after the model responds, `giveCheck` is set to false on every H–H proposal and the other fields are left unchanged. The neutral and gift texts are the byte-preserved anchors in Supplement S1.5.

**Estimands** (welfare = mean final score per account; seed-level paired differences):

- τ_S = E[Y(G,S) − Y(N,S)], the gift effect under standard execution;
- τ_B = E[Y(G,B) − Y(N,B)], the gift effect when H–H transfers are blocked;
- I = τ_S − τ_B, how H–H availability changes the gift's welfare gain.

The primary report is the three estimates with seed-bootstrap 95% intervals and sign counts, not only an interaction test. Secondary, reported but not gated: H–H swap rate, H→E one-way gifts, E–H swaps, and the X1 accounting decomposition per arm.

**Prespecified claims.**

1. *Dependence:* "the gift's welfare gain is larger when H–H transfers are available" requires mean I ≥ 1.0 and one-sided exact p ≤ 0.025 for I > 0.
2. *No gain without H–H:* "the gift yields no material welfare gain when H–H transfers are blocked" requires τ_B inside the equivalence bound ±0.75 points per account (about 40% of the observed τ_S), by two one-sided exact sign-flip tests at 0.025 each.
3. *Harm without H–H:* "the gift is welfare-reducing when H–H transfers are blocked" requires a one-sided exact p ≤ 0.025 for τ_B < 0.
4. *Manipulation check:* zero executed H–H transfers in A3 and A4, and at least one blocked proposal in each.

**Priors and size.** What the existing data do and do not fix: W-RG gives Y(G,S) − Y(N,S) = 1.682 and Y(G,S) − Y(G,B) = 3.208, hence Y(G,B) − Y(N,S) = −1.526. It does not give τ_B, because never-transfer is a scripted benchmark, not neutral-blocked. Under the auxiliary assumption Y(N,B) ≈ Y(never-transfer) — plausible because neutral produces few non-H–H transfers, but untested — τ_B ≈ 52.089 − 52.531 = −0.44 and I ≈ 2.1. These values are used **only** to size the study and for a preregistered prediction; they are not results.

Seed-level SD priors from W-RG: SD(τ_S,s) ≈ 1.49; SD of (gift-blocked − never-transfer) ≈ 0.68, so we assume SD(τ_B,s) ≈ 1.0 to allow for neutral-blocked's own variability; SD(I_s) ≈ 1.8 if the two are independent (1.2 using the never-transfer proxy). With **32 fresh seeds** (normal approximation; to be confirmed by simulation from the W-RG seed-level values before freezing):

| Claim | SE | Power or MDE |
|---|---:|---|
| Dependence, I | 0.32 | one-sided 80%-power MDE ≈ 0.89; prior I ≈ 2.1 |
| No gain, TOST ±0.75 at τ_B = 0 | 0.18 | power ≈ 0.98 |
| Harm, τ_B < 0 at τ_B = −0.44 | 0.18 | power ≈ 0.70 |

**Budget.** 4 arms × 32 seeds × ≈77 calls per run ≈ 9,900 target calls, plus 28 bracket calls.

**Interpretation guard.** I is an interaction of dynamic total effects, not a natural-mediation share; I/τ_S is not reported as a proportion mediated. If the study is run, Figure 1A is replaced by an interaction plot (x: enabled/blocked; one line each for Gift and Neutral; τ_S, τ_B, and I with intervals). Until then the paper shows only the completed W-RG design, with no predicted or dashed points for the unrun arm.

---

## B. Modular fixed-state study (priority 2)

**Question.** Which prompt inputs move the responses observed in closed loop: announcement scope (B1), memory content (B2), the remaining horizon (B3), or payoff representation (B4)?

**State library.** States are drawn with a fixed seed from the W-SGB and W-RG *neutral-arm* traces, so no state is selected on its response to any package. Each state is a reconstructed `meetingPrompt` input (round, roles, inventories, score, partner, memory), stratified by directed cell (H→H, H→E, E→H, E→E) and phase (first meeting; mid-run, rounds 8–16; late, rounds ≥ 20), with at most two states per source seed per stratum. Every edited state is passed through the engine's validity checks (inventories, score consistency, memory format).

**Two classes of intervention are kept apart.** *Reachable-state interventions* change a field together with every field that the change implies (for an inserted history: the memory entry, the score after that meeting under a fixed payoff draw, and inventories), so the result is a state the engine could produce. *Prompt-edit interventions* change one field and freeze the rest; they measure input sensitivity and are never reported as the causal effect of economic history.

### B1. Announcement scope at fixed states

- **Conditions:** Neutral, Gift exact, Harmful E–E, and one refined package written and frozen before any call. Draft text: "An Easy agent gives a leftover check to a Hard agent. When two Hard agents meet, each gives its check to the other. Do not give a check to an Easy agent." It is wrapped in the same disclaimer and own-score objective as every package.
- **States:** 4 cells × 3 phases × 15 states = 180.
- **Outcomes:** unconditional-give rate per cell; implied transaction class for H–H and E–H state pairs (proposals passed through `resolveMeeting`).
- **Evaluation of the refined package against Gift exact.** Success requires *both* (i) an off-scope reduction: H→E giving lower by ≥ 0.25 (one-sided p ≤ 0.025), and (ii) preservation: E→H and H→H giving each non-inferior to Gift exact within 0.10 (one-sided tests at 0.025). The Easy-only package already shows that a restriction can remove intended giving (first-decision E→H 0/39), so the off-scope reduction alone never counts as success. "Achieves first best in every state" is a hypothesis, not a design assumption. Even full success supports only a local action improvement at these states; a population welfare gain requires a closed-loop run.
- **Calls:** 180 states × 4 conditions × 2 replicates = 1,440.

### B2. Existence and content of memory

- **Base states:** H→H and E→H decisions at rounds 3–6 whose source agent had exactly one earlier meeting, 30 states per cell (60 total).
- **Conditions (reachable-state class):** no history (the memory line reads `none`; score and inventories made consistent with no earlier meeting), and one earlier meeting with each joint prior action — (keep, keep), (give, keep), (keep, give), (give, give) — where the first element is the agent's own action. This separates the agent's own prior action from the partner's. For (give, keep) and (keep, give), a partner-identity factor sets the earlier partner to the current partner or to a different account, which separates retaliation or reward toward the same account from a general history response. That gives 7 history conditions.
- **Announcements:** Neutral and Gift exact.
- **Prompt-edit class (input sensitivity):** on 30 of the states, change only the memory line across the same 5 joint-action conditions with score and inventories frozen.
- **Pre-specified readings.** Competing accounts are listed, not a single correct one: reciprocity (giving tracks the partner's prior action), imitation or action persistence (giving tracks the agent's own prior action), expected-return reasoning (giving tracks partner identity and remaining rounds), and norm-sensitive behavior (giving responds to positive social information under the gift announcement). A restored or suppressed E→H gift does not by itself identify Bicchieri-style norm compliance. If every history condition suppresses giving, the next step is to rule out format, length, and state-consistency artifacts with the prompt-edit class and a length-matched placebo line before attributing the effect to history content.
- **Calls:** 60 × 7 × 2 announcements × 2 replicates = 1,680; prompt-edit class 30 × 5 × 2 × 2 = 600.

### B3. Remaining horizon

- **Design:** within the same valid intermediate state (rounds 10–16), hold the current round, score, history, partner, and announcement fixed and manipulate only the announced endpoint: "Round t of t" with `T=t` (the game ends after this decision) versus "Round t of t+8" with `T=t+8`. A history-free state with scores set to resemble round 24 is not used, because it is unrepresentative.
- **States:** 40 H→H, 40 E→H, and 40 E→E (120). H→H states are needed to test the endgame pattern directly.
- **Announcements:** Neutral and the relevant package (Gift exact for H→H and E→H; Harmful E–E for E→E).
- **Reading:** a fall in H→H giving when the decision is final would show that the horizon is used; no fall would be consistent with X2's descriptive endgame pattern and would not by itself say why.
- **Calls:** 120 × 2 horizons × 2 announcements × 2 replicates = 960.

### B4. Payoff representation

- **Design:** table off versus on. Both conditions keep the same own-score objective, announcement, disclaimer, and JSON action interface. The table lists, symmetrically and without directive language, the agent's expected end-of-round score change for each joint outcome of the current meeting (own keep/give × partner keep/give), computed from the engine identities in Table 1. Text such as "exchanging loses points, do not exchange" is excluded because it adds a behavioral instruction.
- **States:** 40 H→H, 40 E→H, and 40 E→E (120), so that the test covers the H–H endgame question as well as harmful E–E compliance.
- **Announcements:** Neutral and the relevant package (as in B3).
- **Comprehension probe:** a separate call per state (never in the same call as the action) asks for the score change under each joint outcome and is scored against the engine. Probe results support auxiliary inference only.
- **Reading:** a change in giving with the table supports "payoff representation or salience shapes the decision". It does not show that agents previously failed to understand payoffs or now knowingly defect.
- **Calls:** 120 × 2 × 2 × 2 = 960 action calls + 120 probe calls.

### B totals and inference

- **Budget:** B1 1,440 + B2 2,280 + B3 960 + B4 1,080 = 5,760 calls, plus about 290 hidden repeats (5%) ≈ 6,050.
- **Inference:** paired contrasts within base state, with replicates averaged; percentile bootstrap and sign-flip tests clustered by source seed; Holm within each module's primary family. Invocation order is randomized over all module × condition × replicate cells; hidden repeats estimate service noise in the same window.
- **Primary families (prespecified):** B1: refined − gift (H→E, E→H, H→H) and gift − neutral (H→H, E→H) at mid-run and late states. B2: each history condition − no history (E→H and H→H, under Gift), and same partner − different partner. B3: final − not final (H→H under Gift; E→E under Harmful). B4: table − no table (E→E under Harmful; H→H under Gift).

---

## C. Second model family, bounded (priority 3)

- **Scope:** replicate only preselected fixed-state contrasts on a distinct model family whose returned identity and fingerprint are verified distinct before freezing: (1) first-decision named E→H giving, Gift − Neutral; (2) no history − (keep, keep) history (B2, E→H under Gift); (3) table − no table under Harmful E–E (B4); (4) refined − Gift gains and side effects (B1).
- **Budget:** the same states, conditions, and 2 replicates as the source modules, for these contrasts only: (1) 45 first-meeting E→H states × 2 × 2 = 180; (2) 30 E→H states × 2 × 2 = 120; (3) 40 E→E states × 2 × 2 = 160; (4) 180 states × 2 × 2 = 720. Total ≈ 1,180 calls plus hidden repeats.
- **Claim boundary:** a success supports "these fixed-state behavioral effects replicate across a second model family". It says nothing about population welfare gains, long-run persistence, or the execution interaction, which would need closed-loop runs on that model. The paper's current statement that cross-model evidence is limited stays until then.

---

## D. Paired free-riding deviation test (optional)

- **Estimator:** G_i = E[V_i(always-keep_i, π_−i) − V_i(π_i, π_−i)], the payoff change for account i from switching to a scripted always-keep policy while the seed, schedule, payoff draws, and the other agents' (model) policy are held fixed. The deviating account rotates across seeds so every account index deviates equally often.
- **Design:** Gift exact, standard execution; per fresh seed, one all-model baseline run and one deviation run in the same service window. A second baseline replicate on a quarter of seeds bounds the temperature-0 noise in V_i.
- **Outputs:** G_i with a seed-bootstrap interval; other agents' giving toward the deviator and toward everyone else, before and after their first meeting with the deviator.
- **Claims:** a positive G_i supports "unilateral free riding is a measurably profitable deviation under this announcement". Rank among accounts is not an endpoint, because rank mixes strategy with role and encounter luck. No prediction of "no retaliation" is made in advance.
- **Budget:** 24 seeds × (77 + ≈68) + 6 replicate baselines × 77 ≈ 3,950 calls.

---

## Deferred

- **Money buyer diagnostic.** The X1 funnel locates the zero-sale outcome at buyer non-payment (0 mark offers in 3,443 Hard decisions holding a mark). Why buyers never pay is left to future work, and the paper makes no claim about monetary acceptance or pricing semantics.
- **Environment boundaries** (salvage value v, p_P = p_H, neutral role labels) and **partial exposure** (needed before any contagion claim) are not required for the current claims.
