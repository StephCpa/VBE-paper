# VBE Study W-MER: Engaged-Money Semantic Repair Protocol

**Study ID:** `VBE-W-MER-ENGAGED-MONEY-REPAIR`  
**Version:** 1.0  
**Date:** 2026-09-14  
**Status:** frozen project-internal prospective protocol; not externally registered; zero target and bracket calls at freeze.

## 1. Question and evidential boundary

W-SGB's exact money arm produced no named mark sales, so its H–H null cannot distinguish a priced-semantic boundary from failed treatment engagement. W-MER asks whether an explicitly bilateral priced directive expands into unmentioned H–H check circulation **conditional on first producing its named E→H mark sales**.

The study can support or fail to support a package-level boundary. It cannot identify token-level semantics, private belief, natural mediation, a monetary equilibrium, or cross-model generality.

## 2. Fixed environment and model era

- VBE `DEFAULT_PARAMS`: `n=8`, `T=24`, `R=3`, `q=0.4`, `B=1`, `M=4`, `pHard=0.32`, `pPartner=0.93`, `v=0.5`, `K=4`.
- All eight controllers are LLM calls; no robot substitutions are allowed.
- Action schema: exactly `{"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean}`.
- Execution is unmodified in every arm.
- Requested model: canonical `deepseek-flash`, temperature 0, in the existing provider-labeled V4.1 Flash era.
- Provider-health mode: `compare` against `src/data/provider-era-baseline-deepseek-v4.1-flash-post-20260914.json`.
- A failed pre-flight blocks target calls. A failed or identity-mismatched post-flight invalidates the study.

## 3. Arms and exact notices

The five arms are:

1. `neutral`: exact W-SGB neutral notice;
2. `gift-exact`: exact historical `GIFT_ANNOUNCE`;
3. `money-exact`: exact historical `ANNOUNCE`;
4. `gift-bilateral`:

> PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check without requiring one mark, and the Hard agent gives no mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

5. `money-bilateral`:

> PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check while requiring one mark, and the Hard agent gives one mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

The two new notices each contain 65 whitespace-delimited words. Their UTF-8 byte lengths are 374 and 373. They preserve sentence structure and role order but are not claimed to be token-identical.

## 4. Seeds, order, and call count

Fresh seeds are:

`13513, 13523, 13537, 13553, 13567, 13577, 13591, 13613, 13619, 13627`.

The five cyclic arm rotations and their reversals are assigned in seed order. Every arm appears twice in each position, and each pairwise precedence relation is 5/5.

The engine-computed schedule contains `786` calls per arm and `3,930` target calls. Pre/post provider health adds `28`, for `3,958` calls in a complete valid workflow. All cells within a seed must have identical schedule hashes and call counts.

The canonical dry-run SHA-256 is `61a1bf6a3a781b1a34616e4bae13886be78bbbfaa6f50470a34292f6bbb96aec`.

## 5. Outcomes

The seed-level population run is the inferential unit.

- **Money sale rate:** among pre-terminal E–H meetings where Easy has a check and Hard has a mark, the fraction executing `chit-for-check` with Easy as seller.
- **Gift intention rate:** among pre-terminal E–H meetings where Easy has a check, the fraction in which Easy originally proposes `giveCheck=true` and `requireChit=false`.
- **Primary semantic outcome:** H–H swap rate.
- **Secondary system outcome:** mean final score per account.
- Hard solve rate, realized E→H gifts, mark holdings, and bilateral proposal complementarity are descriptive dependency measures.

Meeting events are counts, not independent observations.

## 6. Tests and multiplicity

All tests use paired seed differences, exact one-sided sign-flip probabilities, paired bootstrap intervals, and complete per-seed deltas.

### 6.1 Engagement family

Holm FWER `0.025`, MRES `+0.25`:

1. `money-bilateral − neutral` money sale rate;
2. `gift-bilateral − neutral` gift intention rate.

Each engagement gate requires all ten pairs, mean effect at least `+0.25`, and Holm-adjusted `p≤0.025`.

### 6.2 H–H semantic family

Holm FWER `0.025` across five tests:

1. `gift-exact − neutral`, MRES `+0.25`;
2. `gift-bilateral − neutral`, MRES `+0.25`;
3. `money-bilateral − neutral`, MRES `+0.25`;
4. `gift-bilateral − money-bilateral`, MRES `+0.25`;
5. `0.25 − (money-bilateral − neutral)`, the shifted reverse-threshold test.

Test 5 is necessary for a boundary verdict. Failure of test 3 alone is not evidence that the priced effect is materially absent.

### 6.3 Welfare family

Holm FWER `0.05`, MRES `+0.5`, for `gift-exact − neutral`, `gift-bilateral − neutral`, `money-bilateral − neutral`, and `gift-bilateral − money-bilateral`. Welfare is secondary to the semantic verdict, and no welfare comparison outside this family is upgraded.

## 7. Verdict order

1. Missing cells or failed structural integrity → `INCOMPLETE` or `INVALID`.
2. Missing post-flight → `AWAITING POST-FLIGHT`.
3. Failed provider bracket → `INVALID`.
4. Failed exact-gift H–H reference → `REFERENCE GIFT EFFECT NOT ACTIVE`.
5. Failed money engagement → `MONEY REPAIR NOT ENGAGED — NO SEMANTIC CONCLUSION`.
6. Failed matched-gift engagement or H–H response → `MATCHED CONTROL NOT VALIDATED`.
7. Engaged money clears the positive H–H gate → `ENGAGED PRICED DIRECTIVE GENERALIZES`.
8. Engaged money clears the reverse-threshold test and gift exceeds money by the H–H MRES → `ENGAGED PRICED-DIRECTIVE BOUNDARY SUPPORTED`.
9. Otherwise → `ENGAGED MONEY SEMANTIC PROFILE UNRESOLVED`.

The exact-money arm is a repair anchor and does not gate validity.

## 8. Integrity and stopping rules

- Strict raw schemas; API or parse failures are not converted to idle actions.
- Every run must contain only LLM controllers and exactly two calls per meeting.
- Notices, order, schedules, call counts, model, prompt hashes, and stored mechanisms are recomputed.
- The result analyzer must run with credentials and ambient provider variables removed.
- No notice or threshold changes are permitted after the freeze.
- Failed engagement ends this study; it does not authorize another wording search within the same protocol.
- The AAMAS submission proceeds without this result if provider identity, implementation audit, or timing is inadequate.

## 9. Pre-call artifacts

Before any call: final bilingual protocols, core, execution, runner, analyzer, tests, provider-health plan, dry-run hash, and a SHA-256 manifest with zero-call counters. The manifest must hash every file that can change stimuli, execution, analysis, or verdicts.
