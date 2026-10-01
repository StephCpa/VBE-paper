# VBE Study W-RG: Formal Welfare Role-Generalization Execution-Channel Report

**Report version:** 1.1 · 2026-09-14  
**Protocol:** `VBE-welfare-role-generalization-channel-protocol.md` v1.0  
**Status:** complete project-internal prospective mechanism experiment; no external-registration claim  
**Model:** `deepseek-flash` in the provider-labeled V4.1 Flash serving era  
**Formal verdict:** `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`
**Verdict-name boundary:** this is the frozen machine label. “Replicated gift-talk welfare effect” means an advantage over the no-recommendation neutral arm in this study, directionally consistent with W-CO; it does not identify a gift-semantic increment over arbitrary public directives.

## Abstract

This study turned the post-hoc H–H check-swap mechanism from W-CO into a prospective execution-layer intervention. Across 12 fresh seeds and four paired arms, the three gift arms showed the model byte-identical prompts. Only after the model produced its original proposal did the engine suppress either H–H check transfers or Easy-to-Hard unconditional gifts. All 48 cells and 3,680 target calls completed with no API, schema, or parse failure; the pre/post provider bracket was healthy and identity-consistent.

Gift-talk raised mean welfare over a no-exchange-recommendation neutral arm by `+1.6823` points per account, paired bootstrap 95% interval `[+0.8542,+2.4635]`, one-sided exact `p=0.00341797`. That contrast includes the effect of having a directive at all and cannot by itself be assigned to gift semantics. Under the identical gift prompt, suppressing the H–H channel reduced welfare by `3.2083`, interval `[2.4688,3.8906]`, positive in all 12 seeds, `p=0.00024414`. The regime retaining H–H while suppressing E→H gifts exceeded the regime suppressing H–H while retaining E→H gifts by `2.7604`, interval `[2.0938,3.4115]`, positive in all 12 seeds, `p=0.00024414`.

The W-CO welfare effect was therefore not carried mainly by the one-way Easy-to-Hard gift literally named in the prompt. It was carried primarily by H–H check circulation induced through role generalization. This is causal evidence about an observable dynamic execution channel, not identification of a private mental state or a natural-mediation proportion.

## 1. Design and integrity

The arms were `neutral-standard`, `gift-standard`, `gift-hh-blocked`, and `gift-eh-gift-blocked`. Within each of 12 seeds, all arms shared structural randomness and agent-by-round payoff draws. Every arm appeared three times in every run position, with 6/6 precedence for every arm pair. All runs used eight accounts, 24 rounds, and frozen `DEFAULT_PARAMS`.

All integrity checks passed:

- 12/12 schedule-matched and call-matched blocks;
- byte-identical prompts across the three gift arms;
- transform fidelity, action schemas, position balance, and pairwise precedence all passed;
- 48 cells and exactly 3,680 LLM-controller target calls;
- identical private/public result SHA-256 `45cfd56b…612c0c`;
- freeze-manifest SHA-256 `134ad109…57cb2`.

Both provider brackets had six distinct raw responses, 4/4 positive controls, 0/4 negative controls, returned model `deepseek-flash`, and fingerprint `aeb56401ca74e127821c4f9126dcb669`. Catalog, prompt hashes, returned model, and fingerprint matched across the serving-era baseline, pre-flight, and post-flight. The bracket verdict was `BRACKET HEALTHY`.

## 2. Arm outcomes

| Arm | Mean welfare | H–H swaps | E→H gifts | Hard solves | All transfers | Blocked proposals |
|---|---:|---:|---:|---:|---:|---:|
| neutral-standard | 53.6146 | 24/107 (0.224) | 0/262 (0.000) | 370/1152 (0.321) | 38 | 0 |
| gift-standard | 55.2969 | 83/107 (0.776) | 1/262 (0.004) | 429/1152 (0.372) | 242 | 0 |
| gift-hh-blocked | 52.0885 | 0/107 (0.000) | 3/262 (0.011) | 327/1152 (0.284) | 108 | 214 |
| gift-eh-gift-blocked | 54.8490 | 84/107 (0.785) | 0/262 (0.000) | 409/1152 (0.355) | 226 | 20 |

Although the gift prompt explicitly names Easy giving to Hard, the standard arm produced only 1/262 executed one-way E→H gifts and 83/107 H–H swaps. There were 26 materially feasible original E→H gift intentions; 25 met an unconditional check-giving response from Hard and resolved as swaps, leaving one one-way gift.

The 25/26 result is not evidence that Easy agents rarely intended to help. The target intention was present, but Hard's unconditional reciprocation absorbed it almost every time into a bilateral swap. `gift-eh-gift-blocked` therefore does not cleanly remove an independently weak Easy-intention mediator; it removes a one-way realization path that was already almost completely consumed by reciprocity. The frozen dominance contrast remains valid as a comparison of dynamic regimes. Its causal reading is “one reciprocal channel consumed the literal one-way channel,” not a decomposition of two independent mediators by strength.

## 3. Frozen estimands and gates

| Frozen contrast | Mean | 95% bootstrap | One-sided exact p | Result |
|---|---:|---:|---:|---|
| gift − neutral welfare | +1.6823 | [+0.8542, +2.4635] | 0.00341797 | pass |
| gift − H–H-blocked welfare | +3.2083 | [+2.4688, +3.8906] | 0.00024414 | pass; 12/12 positive |
| E→H-blocked − H–H-blocked welfare | +2.7604 | [+2.0938, +3.4115] | 0.00024414 | pass; 12/12 positive |
| gift − H–H-blocked swap rate | +0.7525 | [+0.6327, +0.8615] | 0.00024414 | pass; manipulation valid |
| gift − neutral H–H swap rate | +0.5450 | [+0.4516, +0.6428] | 0.00024414 | auxiliary support |
| gift − neutral Hard-solve rate | +0.0512 | [+0.0269, +0.0747] | 0.00390625 | auxiliary support |

All four channel-validity gates passed: the standard gift H–H channel was active; H–H blocking reduced executed swaps exactly to zero; a standard-arm E→H gift occurred; and E→H blocking reduced executed E→H gifts exactly to zero. Both blocking arms suppressed at least one corresponding materially feasible original proposal.

The non-primary descriptive contrast `gift-standard − gift-eh-gift-blocked` was `+0.4479`, interval `[-0.0469,+0.9479]`, one-sided exact `p=0.0625`. It did not clear the common `+0.5` and `p≤0.025` rules. It must not be upgraded post hoc into a confirmatory null or used to claim that Easy intention was ineffective. It only describes the difference between standard gift and a regime that blocks the one-way realization path.

## 4. Welfare dependency path

Relative to standard gift, H–H suppression removed 102 Hard solves. At `R=3`, that accounts for 306 aggregate points. The observed aggregate welfare loss was `3.2083×12×8=308`; net check-salvage change explains only about two remaining points. The welfare effect therefore almost completely closes along the path “less H–H check circulation → fewer Hard solves.”

Retaining H–H while suppressing E→H gifts produced 82 more Hard solves than suppressing H–H while retaining E→H gifts, worth 246 points. The observed aggregate welfare advantage was `2.7604×12×8=265`; check salvage and other transfer states account for the remaining 19. This is deterministic dependency accounting, not an additional mediation-significance test.

## 5. Implications

The strongest conclusion is that reciprocal check circulation under the public gift directive generalized across roles. Easy agents almost always generated the literal target intention, but Hard reciprocation absorbed it into swaps; the same helping pattern also extended to H–H meetings never named by the text. Removing the H–H channel under the same visible prompt reduced welfare in every seed.

This advances the broader VBE program in three ways:

1. it moves from “language changes behavior” to a controlled result about which execution dependency carries welfare;
2. it shows that an institution's operative mechanism may arise from semantic generalization rather than the transaction literally named in its text;
3. it makes role spillovers, reciprocal circulation, and dynamic state feedback first-class audit targets for language-mediated institutions.

## 6. Boundary and next step

The experiment identifies a population-level dynamic channel effect in a finite, interfering 24-round environment. It does not identify private beliefs, a natural-mediation proportion, individual treatment effects, consent, legitimacy, or general-equilibrium welfare. H–H blocking suppresses all materially feasible H–H check-giving, so the claim is about the H–H check-transfer channel as a whole, not one unique psychological motive.

The highest-value next study is a semantic-generalization boundary experiment without execution intervention, with H–H swap rate and welfare as co-primary outcomes. At minimum it should compare no-recommendation neutral, the current gift directive, explicit `Easy only`, `any check-holder`, `only when the partner is Hard`, historical money-talk, and a directive naming a deterministically non-welfare-improving transfer (for example, Easy–Easy exchange that destroys leftover-check salvage value). The preregistered prediction is that, if “helping” generalizes, gift and Hard-beneficiary variants raise H–H swaps while money-talk does not. If money-talk also raises H–H swaps, the narrower mechanism is generalization of any public directive about check movement. If the negative-welfare directive also raises H–H swaps, generic directive salience remains viable. The study should use fresh seeds and a separate freeze, treating this effect size as design evidence rather than pooling data.
