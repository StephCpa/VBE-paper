# VBE Study W-RG: Welfare Role-Generalization Execution-Channel Protocol

**Version:** 1.0 · 2026-09-14  
**Status:** project-internal prospective mechanism experiment frozen before target calls; no external-registration claim  
**Model era:** `deepseek-flash`, serving era `deepseek-v4.1-flash-post-2026-09-14T04:00Z`; temperature 0; thinking disabled  
**Prior-evidence boundary:** W-CO H–H swaps, Hard solves, and welfare outcomes motivate the hypothesis only and are not pooled with this study

## 1. Question and leverage point

W-CO found higher mean welfare under gift-talk than money-talk, but its frozen joint gate for Easy-to-Hard gifts replacing mark sales did not pass. A post-hoc mechanism audit instead found the largest behavioral difference in Hard–Hard reciprocal check giving (`swap`): 138/154 under gift-talk versus 27/154 under money-talk, accompanied by more solved Hard assignments. This suggests that the model may generalize the public norm “Easy helps Hard” into “any check-holder helps Hard,” creating welfare through H–H check circulation.

This experiment converts that interpretation into an intervention and a falsifiable causal question. Holding the visible gift-talk prompt exactly fixed, the execution layer separately suppresses H–H check transfers or the intended Easy-to-Hard unconditional-gift channel. The target is not the model's private reason; it is the observable execution channel carrying the dynamic welfare effect.

## 2. Four arms and exact interventions

Every seed block runs:

1. `neutral-standard`: the fixed `NEUTRAL_ANNOUNCE`; no proposal transform;
2. `gift-standard`: the historical `GIFT_ANNOUNCE` byte-for-byte; no transform;
3. `gift-hh-blocked`: the exact same visible bytes as `gift-standard`; after the model responds, a check-holding H facing H with an original check-giving proposal has only `giveCheck` set to `false` in the executed proposal;
4. `gift-eh-gift-blocked`: the exact same visible bytes as `gift-standard`; after the model responds, a check-holding Easy agent facing Hard with an unconditional check-gift proposal has only `giveCheck` set to `false` in the executed proposal.

The three gift arms have identical system prompts, user prompts, model, parameters, and JSON schemas. Every original and executed proposal is retained. The transform covers all 24 rounds because a final-round received check can still solve the current assignment. Every controller is the same LLM; there are no robots and no replacement action after a failed call.

The neutral text is:

```text
PUBLIC. It is common knowledge: this message announces no exchange recommendation and changes no engine rule. You may choose any valid action. Maximize your own score.
```

It estimates the dynamic total effect of gift-talk relative to no exchange recommendation. It is not a text-matched semantic-component control.

## 3. Workload, randomization unit, and call arithmetic

The study retains `DEFAULT_PARAMS`: eight accounts, 24 rounds, `R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`. `runPopulationAsyncPaired` makes all four arms within a seed share initial holdings, roles, pairings, and pre-generated agent-by-round payoff draws. The randomization and inference unit is the seed-level population run. Meetings and agents are not independent; within-population interference is part of the estimand.

Twelve previously unused LLM-experiment seeds are frozen:

```text
13217, 13219, 13229, 13241, 13249, 13259,
13267, 13291, 13297, 13309, 13313, 13327
```

Each arm occupies each position three times, and every pairwise precedence is 6/6. Offline enumeration fixes 920 decision calls per arm and 3,680 target calls overall. Any API, schema, or parse failure stops execution; no substitute action is retained. Completed cells are resumable and must not be rerun. Fourteen pre-flight and 14 post-flight calls bring the full workflow to 3,708 calls.

## 4. Primary causal estimands

The first primary estimand is the welfare loss from suppressing the H–H channel:

\[
\Delta^{HH}_s=Score_{s,gift\text{-}standard}-Score_{s,gift\text{-}hh\text{-}blocked}.
\]

`HH welfare contribution` passes only with all 12 matched blocks, a mean of at least `+0.5` points per account, and a zero-centered one-sided exact paired sign-flip `p≤0.025`.

The second primary estimand compares which retained channel produces more welfare:

\[
\Delta^{dominance}_s=Score_{s,gift\text{-}eh\text{-}gift\text{-}blocked}-Score_{s,gift\text{-}hh\text{-}blocked}.
\]

It uses the same `+0.5` and one-sided exact `p≤0.025` rule. This compares the dynamic regimes “retain H–H while suppressing E→H gift” and “suppress H–H while retaining E→H gift”; it is not a natural-mediation proportion.

The auxiliary total effect, `gift-standard − neutral-standard`, uses the same threshold. It upgrades the final label only. A controlled H–H channel effect can stand even if this auxiliary total-effect gate fails.

## 5. Channel-manipulation validity

Four checks must pass before any substantive channel verdict:

1. the seed-level H–H swap-rate contrast `gift-standard − gift-hh-blocked` averages at least `+0.50` with one-sided exact `p≤0.025`, and at least one H–H swap occurs in the standard arm;
2. executed H–H swaps equal exactly zero in `gift-hh-blocked`, with at least one original check-giving proposal suppressed;
3. at least one executed Easy-to-Hard gift occurs in `gift-standard`;
4. executed Easy-to-Hard gifts equal exactly zero in `gift-eh-gift-blocked`, with at least one corresponding original proposal suppressed.

Failure produces `CHANNEL MANIPULATION NOT VALIDATED`, not a substantive null. Transform fidelity is recomputed from every original proposal. The transform may not alter unrelated role pairs, mark-requiring sale proposals, `giveChits`, or `requireChit`.

## 6. Outcomes and auxiliary mechanism measures

Each arm reports mean welfare, H–H meetings and swaps, H–E opportunities with an Easy check and Easy-to-Hard gifts, Hard assignments and solves, all non-null transfers, original mutual-gift intentions, and blocked proposals. Frozen auxiliary paired effects are gift-standard versus neutral-standard H–H swap rate, gift-standard versus neutral-standard Hard-solve rate, and gift-standard versus E→H-blocked E→H gift rate. Apart from the validity checks in §5, these do not enter the primary verdict. Welfare is the average total score of all eight accounts across the full 24-round run.

## 7. Integrity and provider bracket

Required invariants are: zero retained failures; all controllers are LLMs; matched structural-schedule hashes and call counts within every block; byte-identical gift prompts; valid schemas; exactly recomputable transforms; exact position and pairwise-precedence balance; 12 unique seeds; and exactly 3,680 target calls.

After freezing, provider health uses `eraBaselineMode=compare` against the existing serving-era baseline. The sequence is freeze → 14-call pre-flight → 48 target cells → immediate 14-call post-flight → zero-target-call finalization. Pre-flight must be healthy and baseline-consistent; pre/post catalog, returned-model, fingerprint, and prompt-hash sets must match. A completed target remains `AWAITING POST-FLIGHT` until post-flight. An unhealthy or identity-changing bracket yields `INVALID`. Historical sentinels remain descriptive cross-era drift only and are excluded from health gates.

## 8. Verdict tree

In order:

1. `INCOMPLETE`;
2. `INVALID`;
3. `AWAITING POST-FLIGHT`;
4. `CHANNEL MANIPULATION NOT VALIDATED`;
5. `NO MATERIAL HH EXECUTION-CHANNEL CONTRIBUTION`;
6. `HH EXECUTION CHANNEL CONTRIBUTES WITHOUT DOMINANCE`;
7. `HH EXECUTION CHANNEL DOMINATES UNDER GIFT TALK`;
8. `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`.

The last label requires valid manipulation, material and exact H–H welfare contribution, material and exact channel dominance, and a material and exact gift-versus-neutral welfare effect.

## 9. Interpretation boundary

The identical-prompt gift-arm interventions identify the population-level dynamic total effect of suppressing a specified execution channel under this gift-talk regime. They do not identify natural mediation, private mental states, individual causal effects, consent, legitimacy, or general-equilibrium welfare. Suppression changes subsequent state and subsequent model responses; that is the dynamic channel effect, not contamination to be conditioned away. A contributing H–H channel supports observable role generalization of a public norm, not a unique internal abstraction rule.

## 10. Frozen artifacts

- this protocol and its Chinese counterpart;
- `welfare-role-channel.ts`, execution, runner, analyzer, and tests;
- the run-specific provider-health plan;
- shared env, params, prompts, speech, LLM, provider-health, and observed-chat code;
- a SHA-256 manifest and dry-run hash;
- post-run private/public result mirrors and the provider bracket.

No API key may enter any artifact.
