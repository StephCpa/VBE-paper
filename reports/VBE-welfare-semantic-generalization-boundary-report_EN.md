# VBE Welfare Semantic-Generalization Boundary — Formal Report

**Study ID:** `VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY`  
**Version:** 1.0  
**Date:** 2026-09-14  
**Status:** project-internal prospective experiment; not externally registered  
**Formal verdict:** `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`  
**Semantic status:** `GENERIC DIRECTIVE SPILLOVER`  
**Quantifier status:** `SUBJECT EXCLUSIVITY BINDS`

## Abstract

W-SGB used 14 fresh paired seeds and seven execution-unmodified public-message arms to distinguish whether the H–H check circulation found in W-RG reflects helping semantics, a directive about check movement, generic directive salience, or loose subject-quantifier generalization. All 98 cells and all 7,602 target calls completed successfully. The 14-call pre and post provider-health brackets were healthy and matched on model, fingerprint, catalog, and prompt hashes.

Exact gift versus neutral increased both H–H swap rate by `+0.6070` (95% bootstrap `[+0.5097,+0.7140]`) and mean welfare by `+2.0625` (`[+1.4286,+2.8125]`), with Holm-adjusted `p=0.0004883` for both and 14/14 directional consistency. The gift reference therefore replicated on fresh seeds. Exact money versus neutral increased neither endpoint, and no arm produced any mark sales.

The mechanism classification turns on the mechanically welfare-reducing E–E directive. It induced its named E–E swaps in 113/114 opportunities and increased H–H swap rate over neutral by `+0.3777` (`[+0.2875,+0.4745]`, Holm-adjusted `p=0.0004883`), but its welfare effect was only `+0.1875` (`[-0.3393,+0.7098]`), below the `+0.5` MRES. A public directive can therefore generalize across roles even when its stated content is not helping and is mechanically harmful. Behavioral generalization itself does not guarantee welfare improvement.

Subject exclusivity also clearly binds. `Easy only` collapses nearly to neutral, whereas `any check-holder` and `only when the partner is Hard` preserve strong H–H circulation and welfare effects. The result is not unconditional quantifier neglect: the model respects an explicit exclusive subject restriction, but without that restriction it can generalize the actor role through beneficiary structure or permissive pragmatics.

## 1. Design and frozen boundary

- Seven arms: no-recommendation neutral, exact historical gift, `Easy only`, `any check-holder`, `only when the partner is Hard`, exact historical money talk, and a mechanically welfare-reducing E–E reciprocal-transfer directive.
- Fourteen fresh seeds used cyclic orders and their reversals. Every arm occupied every position twice and every pairwise precedence relation was balanced 7/7.
- H–H swap rate and mean welfare were co-primary. Each endpoint had eight directional contrasts with separate Holm control at familywise alpha 0.025.
- The H–H MRES was `+0.25`; the welfare MRES was `+0.5`. The negative arm additionally required E–E engagement of at least `+0.25`.
- The exact neutral, gift, and money packages were historically identical. New semantic arms were not token- or length-matched, so the experiment identifies package-level semantic boundaries rather than a lexical feature.
- Freeze-manifest SHA-256: `affb3e0a8d9939a4107630eeb1d39540d02401c77c6613443b5c085e6872b72b`; both target and bracket calls were zero at freeze.

## 2. Execution and integrity

| Item | Result |
|---|---:|
| Fresh paired seeds | 14 |
| Arms / complete cells | 7 / 98 |
| Target calls | 7,602 / 7,602 |
| Provider-health calls | 28 / 28 |
| API / schema / parse failures | 0 / 0 / 0 |
| Schedule-matched blocks | 14 / 14 |
| Call-matched blocks | 14 / 14 |
| Notice / historical-notice exactness | Passed |
| Order / pairwise-precedence balance | Passed |
| Negative directive mechanically non-improving | Passed; `−1.0` welfare per named transaction |
| Provider bracket | `BRACKET HEALTHY` |

Both pre and post had six unique raw responses and 2.3249 bits of entropy; external controls were 4/4, dominant-positive buys were 4/4, and dominant-negative buys were 0/4. Both phases returned `deepseek-flash`, fingerprint `aeb56401ca74e127821c4f9126dcb669`, and the exact catalog `deepseek-flash, deepseek-v4-pro`, matching the established serving-era baseline.

## 3. Pooled arm summaries

| Arm | Mean score | H–H swaps | H–H rate | E–E swaps | E→H gifts | Mark sales | Hard solves |
|---|---:|---:|---:|---:|---:|---:|---:|
| neutral | 55.2768 | 27/125 | 0.216 | 0/114 | 0 | 0 | 494/1344 |
| gift-exact | 57.3393 | 105/125 | 0.840 | 2/114 | 9 | 0 | 577/1344 |
| gift-easy-only | 55.2277 | 29/125 | 0.232 | 1/114 | 0 | 0 | 490/1344 |
| gift-any-holder | 57.2455 | 111/125 | 0.888 | 0/114 | 7 | 0 | 573/1344 |
| gift-hard-partner-only | 57.6830 | 115/125 | 0.920 | 0/114 | 4 | 0 | 584/1344 |
| money-exact | 55.0714 | 21/125 | 0.168 | 0/114 | 0 | 0 | 487/1344 |
| easy-easy-negative | 55.4643 | 75/125 | 0.600 | 113/114 | 3 | 0 | 535/1344 |

## 4. Frozen contrasts

| Contrast | H–H swap-rate Δ (95% CI) | Holm p / gate | Welfare Δ (95% CI) | Holm p / gate |
|---|---:|---:|---:|---:|
| gift − neutral | +0.6070 `[+0.5097,+0.7140]` | 0.000488 / pass | +2.0625 `[+1.4286,+2.8125]` | 0.000488 / pass |
| gift − money | +0.6631 `[+0.5681,+0.7551]` | 0.000488 / pass | +2.2679 `[+1.6696,+2.9598]` | 0.000488 / pass |
| gift − negative | +0.2293 `[+0.1049,+0.3506]` | 0.005371 / **fails MRES** | +1.8750 `[+1.3482,+2.4330]` | 0.000488 / pass |
| money − neutral | −0.0560 `[−0.1259,−0.0009]` | 0.968750 / fail | −0.2054 `[−0.3393,−0.0714]` | 0.996094 / fail |
| negative − neutral | +0.3777 `[+0.2875,+0.4745]` | 0.000488 / pass | +0.1875 `[−0.3393,+0.7098]` | 0.509155 / fail |
| gift − Easy only | +0.5923 `[+0.4820,+0.6974]` | 0.000488 / pass | +2.1116 `[+1.4643,+2.8125]` | 0.000488 / pass |
| any holder − neutral | +0.6576 `[+0.5488,+0.7713]` | 0.000488 / pass | +1.9688 `[+1.2946,+2.6964]` | 0.000488 / pass |
| Hard partner only − neutral | +0.7034 `[+0.5956,+0.8100]` | 0.000488 / pass | +2.4063 `[+1.7589,+3.1071]` | 0.000488 / pass |

Negative-directive E–E engagement was `+0.9821` (`[+0.9464,+1.0000]`, Holm-adjusted `p=0.0000610`), passing its manipulation gate.

## 5. Interpretation

### 5.1 The gift reference replicated on fresh seeds

Exact gift cleared the MRES on both co-primary endpoints against neutral, with 14/14 directional consistency. This replicates the W-CO/W-RG welfare difference while prospectively confirming H–H circulation as a stable behavioral phenotype. It supports the claim that public language changes system behavior and welfare. Because neutral contains no recommendation, this contrast still combines gift content with the total effect of issuing a directive at all.

### 5.2 Generalization is not helping-specific

The negative directive explicitly told Easy–Easy pairs to exchange checks reciprocally, a transaction that destroys 1.0 welfare whenever executed. The model almost perfectly implemented the named behavior (113/114) and also increased unnamed H–H swaps from 27/125 to 75/125. H–H generalization therefore cannot be explained solely as helping Hard or as a gift norm.

The frozen label is `GENERIC DIRECTIVE SPILLOVER` because gift minus negative was statistically positive for H–H circulation but its `+0.2293` magnitude missed the preregistered `+0.25` MRES. “Generic” here means that, within this task, even an explicit, engaged, mechanically harmful public-transfer directive produced cross-role circulation. It does not imply that every directive, model, or environment will generalize.

### 5.3 Behavioral propagation and institutional quality separate

The negative arm produced two opposing system effects: E–E swaps consumed checks that Easy agents could retain, while H–H swaps improved Hard agents' opportunity to solve assignments. Its net welfare effect versus neutral was only `+0.1875` with an interval crossing zero. The capacity to propagate a rule across roles is therefore a model/interface property; whether the propagated rule improves welfare depends on its content, role structure, and executed consequences. A Harari-style shared story can acquire an operative institutional phenotype without thereby becoming a good institution.

### 5.4 Explicit subject exclusivity constrains generalization

The `Easy only` H–H rate was 0.232, nearly the neutral rate of 0.216, and gift minus Easy-only passed for both H–H circulation and welfare. In contrast, `any check-holder` and `only when the partner is Hard` both produced strong H–H circulation. This supports `SUBJECT EXCLUSIVITY BINDS`: explicitly restricting the actor blocks role generalization, whereas restricting only the beneficiary still lets Hard agents apply the directive in Hard–Hard meetings.

This is not a word-level causal attribution. The new packages were not fully matched on syntax, length, and wording. A narrower lexical/pragmatic conclusion would require a newly frozen, length-matched disassembly on fresh seeds.

### 5.5 Money talk does not trigger the same circulation

Exact money was below neutral on both H–H circulation and welfare, and all seven arms produced zero mark sales. This rejects the broad claim that any historical public text about check movement creates the same H–H circulation. The difference is associated with the command structure of the gift and negative directives, but the current design does not separately identify directive force, reciprocity structure, verbs, or price semantics.

## 6. Identification limits

The experiment identifies total effects of seven complete public-message packages on seed-level population trajectories. It does not identify private representations, common belief, natural-mediation proportions, token-level semantics, consent, legitimacy, or general-equilibrium welfare. The negative arm's net welfare combines harmful E–E execution with beneficial H–H circulation and cannot estimate their separate mediation shares. Although `gift-hard-partner-only` has the largest pooled values, the protocol did not preregister a direct inferential contrast against exact gift; it must not be described as significantly superior to exact gift.

## 7. Implications for the paper and next step

W-RG showed that the H–H execution channel carries welfare under a byte-identical gift prompt. W-SGB now shows that the channel is neither a literal implementation of gift-to-Hard content nor a helping-only norm. Together they form a stronger causal chain: **public language triggers cross-role rule generalization; execution creates H–H circulation; circulation can improve welfare; but harmful content can propagate without improving welfare.**

This is sufficient to serve as Paper 1's central result. The immediate priority should shift from expanding the experimental tree to integrating the paper, figures, and reviewer-facing boundaries. If another experiment is later warranted, the highest-value extension is a fresh-seed, token/length-matched lexical-pragmatic disassembly of directive force, reciprocity, subject-versus-beneficiary scope of `only`, and price semantics. The belief-instrument repair remains unrun but is no longer a dependency for Paper 1.

## 8. Auditable artifacts

- Formal protocol: `VBE-welfare-semantic-generalization-boundary-protocol.md`
- English protocol: `VBE-welfare-semantic-generalization-boundary-protocol_EN.md`
- Freeze manifest: `vbe-engine/src/data/welfare-semantic-boundary-freeze.json`
- Result: `vbe-engine/src/data/welfare-semantic-boundary.json`
- Public mirror: `vbe-engine/public/data/welfare-semantic-boundary.json`
- Provider bracket: `vbe-engine/src/data/provider-health-welfare-semantic-boundary.json`
- Result SHA-256: `f4ab7c137903926871d9d1ef8d163f58d4b14dd60e209341cdf13d0597c09e26`
- Provider-bracket SHA-256: `2c58b1de09c979e35ec6e8ac2bc14997f9bce6159363ea4020e506dc488205c1`

