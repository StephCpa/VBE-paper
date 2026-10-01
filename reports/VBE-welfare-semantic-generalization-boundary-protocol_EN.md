# VBE Study W-SGB: Welfare Semantic-Generalization Boundary Protocol

**Version:** 1.0 · 2026-09-14  
**Status:** project-internal prospective experiment frozen before target calls; no external-registration claim  
**Model era:** requested `deepseek-flash`, serving era `deepseek-v4.1-flash-post-2026-09-14T04:00Z`; temperature 0; thinking disabled  
**Prior-evidence boundary:** W-CO and W-RG motivate the hypotheses and MRES values only. Their data are not pooled with W-SGB.

## 1. Research contract

| Field | Frozen answer |
|---|---|
| Real subject | An eight-agent LLM population repeatedly allocating expiring verification checks under public cheap talk |
| Workload | 24 rounds, changing Easy/Hard roles, stochastic meetings, persistent marks, four-round memory, and within-population interference |
| Default assumption under challenge | The transaction literally named by a public directive is the behavioral mechanism carrying its welfare effect |
| Conflict | W-RG names Easy→Hard giving, but 25/26 feasible E→H intentions were absorbed by Hard reciprocity and the causal welfare path was H–H circulation |
| Objective | Identify which observable semantic boundary predicts H–H circulation and whether the same boundary carries system welfare |
| Hard constraints | No execution transform; exact historical gift, money, and neutral texts retained; fresh seeds; complete paired blocks; provider bracket; familywise error control |
| Non-goals | Private reasoning, token-level lexical causality, natural mediation, consent, legitimacy, deployment welfare, or cross-model equivalence |
| Falsification | Failure of the exact gift reference to raise both H–H swaps and welfare ends substantive semantic localization for this study |

## 2. Competing mechanism hypotheses

1. **Helping-semantic generalization:** a directive about unpriced help generalizes across donor roles; exact money talk and an engaged harmful transfer directive do not induce comparable H–H circulation.
2. **Check-movement directive generalization:** any public directive organizing check movement, including priced exchange, can induce H–H circulation.
3. **Generic directive spillover:** even a directive naming an Easy–Easy transaction that mechanically destroys salvage can induce H–H circulation.
4. **Subject-quantifier binding:** the original indefinite subject (“an Easy agent”) permits pragmatic role generalization, while explicit `only Easy` wording suppresses it; explicit donor broadening or a Hard-partner predicate preserves it.

These are observable response profiles, not claims about a unique internal representation.

## 3. Seven arms

Every one of 14 seed blocks runs all seven arms without an execution-layer intervention:

1. `neutral`: exact W-RG no-recommendation neutral;
2. `gift-exact`: historical `GIFT_ANNOUNCE`, byte-for-byte;
3. `gift-easy-only`: explicitly restricts the donor role to Easy and states that Hard does not give under the directive;
4. `gift-any-holder`: explicitly broadens the donor to any check-holder while retaining Hard as beneficiary;
5. `gift-hard-partner-only`: permits unpriced giving only when the current partner is Hard, irrespective of donor role;
6. `money-exact`: historical money-talk `ANNOUNCE`, byte-for-byte;
7. `easy-easy-negative`: directs reciprocal check giving between two Easy agents.

The four new notices are frozen as:

```text
PUBLIC. It is common knowledge: only an Easy agent gives a leftover check to a Hard agent without requiring a mark. A Hard agent does not give a leftover check under this statement. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: any agent who holds a leftover check gives it to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: an agent gives a leftover check without requiring a mark only when the current partner is Hard. Under this statement, do not give a leftover check when the current partner is Easy. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: when two Easy agents meet and each has a leftover check, each gives that check to the other without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

Under the frozen engine, two Easy agents who both give lose two checks that otherwise salvage for 0.5 each. One named E–E swap therefore changes total welfare by exactly `−1.0`. This makes the last arm a mechanically negative named-transaction control, not merely a differently worded recommendation.

## 4. Workload, seeds, order, and call arithmetic

The study retains `DEFAULT_PARAMS`: eight accounts, 24 rounds, `R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`. Within each seed, all arms share initial holdings, roles, pairings, and pre-generated account-by-round payoff draws. The seed-level population run is the randomization and inference unit; meetings and accounts are not independent.

Fourteen previously unused LLM-experiment seeds are frozen:

```text
13331, 13337, 13339, 13367, 13381, 13397, 13411,
13417, 13421, 13441, 13451, 13457, 13463, 13469
```

The first seven blocks use all cyclic rotations of the arm list and the next seven use their reversals. Every arm occupies every position twice; every pairwise precedence is 7/7. Offline enumeration fixes 1,086 decisions per arm and 7,602 target calls. Fourteen pre-flight and 14 post-flight calls make the full workflow 7,630 calls. Any API, schema, or parse failure stops execution; completed cells are resumable and may not be rerun.

## 5. Co-primary outcomes and frozen contrast families

The co-primary outcomes are:

- seed-level H–H swap rate, the direct mechanism discriminator;
- mean population welfare per account over the complete 24-round run, the system consequence.

Eight directional paired contrasts are evaluated for both outcomes:

| Contrast | Role in identification |
|---|---|
| `gift-exact − neutral` | reference activation and fresh-seed replication |
| `gift-exact − money-exact` | helping content versus priced check movement |
| `gift-exact − easy-easy-negative` | helping content versus an engaged harmful transfer directive |
| `money-exact − neutral` | check-movement directive generalization |
| `easy-easy-negative − neutral` | generic directive spillover into H–H behavior |
| `gift-exact − gift-easy-only` | restrictive subject-quantifier attenuation |
| `gift-any-holder − neutral` | response under explicit donor broadening |
| `gift-hard-partner-only − neutral` | response under an explicit Hard-beneficiary predicate |

The MRES is `+0.25` for H–H swap rate and `+0.5` points per account for welfare. Each effect uses the matched-seed mean, a paired bootstrap interval, and a zero-centered one-sided exact sign-flip p-value. Holm adjustment controls familywise error at `0.025` separately within the eight H–H tests and the eight welfare tests. A directional gate passes only if all 14 pairs are present, the mean reaches its MRES, and the Holm-adjusted p-value is at most `0.025`.

All-arm H–H, E–E, E→H gift, mark-sale, Hard-solve, and transfer counts are reported. They cannot replace a failed co-primary gate.

## 6. Negative-control engagement

The negative directive is behaviorally engaged only if `easy-easy-negative − neutral` raises the seed-level E–E swap rate by at least `+0.25` with a one-sided exact p-value at most `0.025`. This is a single validity check, outside the two eight-test substantive families. Failure does not invalidate the study, but it prevents the label `HELPING-SEMANTIC SPECIFICITY`: a non-responsive negative directive cannot rule out generic salience.

## 7. Frozen classification

The reference is active only if `gift-exact − neutral` passes for both H–H swaps and welfare. Without it, the headline is `REFERENCE GIFT EFFECT NOT REPLICATED` and all semantic localization is descriptive.

Conditional on an active reference, the H–H profile is classified in this priority order:

1. `GENERIC DIRECTIVE SPILLOVER` if negative-minus-neutral H–H passes;
2. `CHECK-MOVEMENT DIRECTIVE GENERALIZATION` if money-minus-neutral H–H passes;
3. `HELPING-SEMANTIC SPECIFICITY` if gift-minus-money and gift-minus-negative H–H both pass and the negative directive is engaged;
4. `MIXED OR UNRESOLVED` otherwise.

Priority prevents a more specific label from hiding a broader positive spillover. All eight welfare results remain co-primary and are printed next to the mechanism profile; the mechanism label itself is intentionally driven by the more proximal H–H outcome.

The quantifier status is separate. `SUBJECT EXCLUSIVITY BINDS` requires both co-primary outcomes to pass for gift-minus-Easy-only, any-holder-minus-neutral, and Hard-partner-minus-neutral. If only gift-minus-Easy-only passes on both, the status is `SUBJECT EXCLUSIVITY ATTENUATES`. Otherwise it is `SUBJECT-QUANTIFIER SEPARATION NOT SUPPORTED`, which is not an equivalence claim.

## 8. Integrity and provider bracket

Required invariants are: zero retained failures; all controllers are the same LLM; 14 schedule- and call-matched complete blocks; exact arm notices; byte equality with historical neutral, gift, and money constants; strict three-field action schemas; exact positional and pairwise-precedence balance; 14 unique fresh seeds; exactly 7,602 target calls; and the mechanically computed `−1.0` E–E named-transaction welfare delta.

Provider health uses `eraBaselineMode=compare` against the established V4.1 Flash baseline. The sequence is freeze → 14-call pre-flight → 98 target cells → immediate 14-call post-flight → zero-target-call finalization. Pre-flight must be healthy and baseline-consistent. Pre/post catalog, returned-model, fingerprint, and prompt-hash sets must match. Only `BRACKET HEALTHY` permits substantive interpretation; historical sentinels remain descriptive cross-era drift and never enter health gates.

## 9. Verdict tree

In order:

1. `INCOMPLETE`;
2. `INVALID`;
3. `AWAITING POST-FLIGHT`;
4. `REFERENCE GIFT EFFECT NOT REPLICATED`;
5. `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`;
6. `GIFT REFERENCE REPLICATED — CHECK-MOVEMENT GENERALIZATION`;
7. `GIFT REFERENCE REPLICATED — HELPING-SEMANTIC SPECIFICITY`;
8. `GIFT REFERENCE REPLICATED — SEMANTIC PROFILE UNRESOLVED`.

The separate quantifier status and every adjusted effect accompany the headline.

## 10. Boundaries and stopping conditions

The study identifies population-level dynamic total effects of seven public language packages in this workload. The new variants are not token- or length-matched, so differences localize semantic packages rather than individual words. The design does not identify private beliefs, a unique internal abstraction, natural mediation, individual effects, consent, legitimacy, deployment welfare, or cross-model equivalence.

If the reference is inactive, do not repair prompts or switch endpoints within this study. If the provider bracket is invalid, retain calls but do not interpret them. No unregistered arm, seed, threshold, contrast, or post-hoc upgrade may enter the verdict. A later lexical micro-disassembly would require a new freeze and fresh seeds.

## 11. Frozen artifacts

- this protocol and its Chinese counterpart;
- semantic core, execution, runner, analyzer, and tests;
- the run-specific provider-health plan;
- shared environment, parameters, prompt, speech, inference, LLM, observation, and provider-health code;
- a SHA-256 manifest and dry-run hash;
- post-run private/public result mirrors and provider bracket.

No API key may enter any artifact.
