# Paper 1 — Follow-up Protocols for the Second Review Round

**Version:** 0.1 · 2026-10-01
**Status:** DRAFT. Not hash-frozen. No target call has been made. Each protocol must be implemented, dry-run, tested, and frozen with its own manifest and run-specific provider-health plan before its first target call, following the project's existing freeze discipline.
**Origin:** the AAMAS review received 2026-10-01 (Experiments A–E) and the X1 zero-call audit (`engine/src/data/welfare-review-x1.md`), which already answers part of B and the funnel part of D without model calls.

Shared rules for every protocol below:

- Fresh seeds never used by any prior LLM study; one population run per seed and arm; paired arms share roles, pairings, and payoff draws (`runPopulationAsyncPaired`).
- The seed-level population run is the inferential unit. One-sided exact sign-flip tests; percentile bootstrap (20,000 resamples, fixed analysis seed); Holm within each prespecified family at 0.025.
- Each gate states both a minimum relevant effect (MRES) and, where a claim of the form "at least MRES" is intended, an MRES-shifted test (H0: Δ ≤ MRES).
- Every call logs the raw response, request-body hash, response id, returned model, fingerprint, and usage. A 14-call health bracket immediately precedes the first and follows the last target call.
- Temperature-0 serving is not deterministic (X1: 87–90% agreement at byte-identical prompts). Designs that replay fixed prompts therefore include replicate calls.

---

## A. Announcement × execution factorial (highest value)

**Question.** Does the welfare gain of the gift announcement over neutral depend on the H–H execution channel?

**Arms (2×2, all on each seed).**

| Arm | Announcement | Execution |
|---|---|---|
| A1 | Neutral | standard |
| A2 | Gift exact | standard |
| A3 | Neutral | H–H giving blocked |
| A4 | Gift exact | H–H giving blocked |

The H–H filter is W-RG's frozen `executeRoleChannel("gift-hh-blocked", …)` applied in both blocked arms, independent of the announcement. The neutral and gift texts are the byte-preserved anchors in Supplement S1.5.

**Estimands.**

- τ_int = mean_s[(Y(G,S) − Y(N,S)) − (Y(G,B) − Y(N,B))], welfare per account.
- Simple effects: gift − neutral under standard execution, and under blocked execution.
- Reported, not inferred: H–H swap rate, H→E one-way gifts, E–H swaps, the X1 accounting decomposition per arm.

**Gates (frozen before calls).**

1. Manipulation: zero executed H–H transfers in A3 and A4; at least one blocked proposal in each.
2. Interaction: mean τ_int ≥ 1.0 and one-sided exact p ≤ 0.025.
3. Dependence ("H–H path necessary for the gift gain"): requires gate 2 **and** an equivalence test showing the blocked-execution simple effect lies within ±0.5 (two one-sided exact sign-flip tests at 0.025 each). Non-significance alone is never read as equivalence.
4. A gift-minus-neutral effect under blocked execution that is significantly negative is reported as "the gift announcement is welfare-reducing without the H–H channel".

**Size.** W-RG's seed-level gift − neutral SD is 1.49. Approximating the interaction SD as √2 × 1.49 = 2.10, 24 seeds give SE ≈ 0.43 and a one-sided 80%-power minimum detectable interaction ≈ 1.2. The X1 accounting predicts an interaction near 2.3, so 24 seeds is adequately powered. Budget ≈ 4 × 24 × 77 ≈ 7,400 target calls plus 28 bracket calls.

**Interpretation guard.** τ_int is a dynamic-total-effect interaction, not a natural-mediation share. Dividing τ_int by the total effect is not reported as a proportion mediated.

---

## B. Full-history state replay (most diagnostic)

**Already answered without calls (X1).** First decisions are byte-identical across arms except for the announcement. At those states the gift and harmful E–E announcements directly raise H→H giving (0.94 and 0.83 versus 0.39 under neutral), and the named E→H gift is engaged (0.44 versus 0.00) in all three studies.

**Remaining question.** Do the same text effects hold at later states, with identical non-empty histories?

**Design.** Build a frozen state library from the W-SGB neutral-arm traces (so no state is selected for responsiveness to any package), stratified by directed cell (H→H, H→E, E→H, E→E), round tercile, mark holding, and the agent's last-meeting outcome. Target 60 states per cell (240 states), sampled with a fixed seed, with at most 2 states per source seed per stratum.

For each state, reconstruct the exact prompt with `meetingPrompt` and replace only the announcement with each of the seven W-SGB packages. Two replicate calls per state × package estimate within-prompt nondeterminism. A third factor adds two pre-written paraphrases of gift exact and harmful E–E to test dependence on one text instance. Budget: 240 × (7 + 4) × 2 ≈ 5,300 calls.

**Outputs.** Per cell and package: give, sale, mark-offer, and keep rates; differences from neutral at identical states; replicate agreement. Proposal pairs are also passed through `resolveMeeting` to report the implied transaction class for each H–H and E–H state pair.

**Inference.** Unit = source seed (states nested in seeds). Primary contrasts per cell: gift − neutral and harmful − neutral, Holm within cell family. Interpretations are pre-specified: an H→H effect at later states comparable to the first-decision effect supports a state-invariant text effect; an effect present only at first decisions supports history-dependent attenuation.

---

## C. Payoff salience for the harmful directive

**Question.** Do agents execute the harmful E–E swap because they fail to represent the salvage loss, or despite representing it?

**Design.** 2 × 2 at fixed E–E states drawn from the W-SGB harmful-arm and neutral-arm traces (first meetings, mid-run, and endgame t ≥ 22, balanced): {Neutral, Harmful E–E} × {original prompt, original prompt + a neutral local payoff table}. The table states, in the existing prompt format, the agent's end-of-round score change under each feasible outcome (keep: +0.5 salvage; swap: 0; give one-way: 0) without directive language. Objective, disclaimer, and schema are unchanged.

A separate comprehension call per state (never in the same call as the action) asks for the score change under keep and under swap, scored against the engine.

**Pre-specified readings.**

- Harmful swaps fall materially with the table (≥ 0.25, p ≤ 0.025): poor payoff representation or low salience.
- Swaps persist with an accurate comprehension answer: instruction compliance overrides the stated objective (a behavioral statement, not a claim about private states).
- Swaps stop only at endgame states: forward-looking judgments; follow up separately.

Budget: ~120 states × 4 arms × 2 replicates + 120 comprehension calls ≈ 1,100 calls.

---

## D. Money buyer diagnostic (optional)

**Already answered without calls (X1).** The zero-sale outcome is buyer-side: 0 mark offers in 3,443 Hard decisions taken while holding a mark, across 13 arms; Easy sellers proposed sales in almost every opportunity.

**Remaining question, only if the money claim is retained.** Is non-payment a failure to see the purchase mechanism, or a valuation of marks?

**Design.** Fixed E–H states with a mark-holding Hard agent; arms: (i) money exact; (ii) money exact + a sentence restating the engine rule ("if you offer 1 mark and the partner requires a mark, you receive their check and they receive your mark"); (iii) a positive-capability control in which the mark is given a stated terminal value of 0.1. Arm (iii) changes the economy and is reported only as a capability check, never as a replication of the valueless-mark environment. Budget ≈ 600 calls.

---

## E. Second model family and environment boundaries

**Model replication.** A distinct model family whose returned identity and fingerprint are verified distinct before freezing. Arms: Neutral, Gift exact, Harmful E–E, and Gift with H–H blocked, on 12 fresh seeds (~3,700 calls). Primary contrasts: the W-RG H–H blocking contrast and the W-SGB gift − neutral and harmful − neutral H–H contrasts, with the original gates.

**Environment boundaries** (same model, small runs; each a separate frozen study):

- Salvage value v ∈ {0.25, 1.0} under Harmful E–E: does compliance respond to the cost (−2v per swap)?
- p_P = p_H: removes the gain from receiving a check; does H–H giving under gift persist when it no longer pays?
- Neutral role labels (type X / type Y instead of Hard / Easy) with unchanged payoffs: does H–H giving depend on the role names?

The aim is to find where the effects stop, not to establish universality.

---

## Not proposed

- **Partial-exposure contagion.** Every agent receives the announcement directly, so the paper now describes cross-role responses as population responses, not peer-to-peer contagion. A partial-exposure design would be needed before any contagion claim; it is not required for the current claims.
