# Paper 1 Internal Review Response

**Date:** 2026-09-14  
**Scope:** responses to the reviews beginning “The W-RG core is strong...” and “The conversion is clean...”  
**Status:** manuscript repair completed; no protocol, verdict, prompt, result artifact, or target call changed.

## 1. Money-arm engagement

**Accepted.** The exact money arm had zero named mark sales, so its H–H and welfare effects cannot identify a priced-semantic boundary. The submission draft now:

- removes the claim that money rules out “any public text about moving checks or marks”;
- labels the money arm unengaged in Methods, Results, Discussion, Limitations, Conclusion, the submission spine, and Figure 1;
- reports the historical 24/44 mark-sale observation only as non-pooled prior-era context;
- states that an engagement-gated money manipulation is required to recover a priced-semantics claim.

This correction leaves the frozen W-SGB verdict unchanged. The supported comparison is among engaged uncompensated-transfer directives, not between gift and priced exchange as semantic categories.

The second review correctly notes that both bootstrap intervals sit below zero. The paper now reports the H–H difference (−0.0560) and welfare difference (−0.2054) as a slight negative descriptive pattern. The registered tests were one-sided for positive effects, so this is not upgraded to a tested suppression claim.

## 2. Title and conceptual frame

**Accepted.** The title is now:

> *From Public Rules to Executed Institutions: Scope Expansion and Welfare in a Language-Model Economy*

The main text uses **scope expansion** for the observed phenomenon and **distributed policy program** for the systems abstraction. “Semantic generalization” is no longer the headline claim. Formal artifact names and the frozen machine label `GENERIC DIRECTIVE SPILLOVER` remain unchanged for auditability.

The manuscript now states the exact interpretive boundary of gift minus negative: `+0.2293`, 95% `[+0.1049,+0.3506]`, Holm-adjusted `p=0.005371`, but below the prespecified `+0.25` MRES. A helping-specific layer may exist, but the study did not establish it at the declared threshold.

## 3. Earlier service era

**Accepted.** The former Results §4.4 has moved to Discussion as “Prior-era system-layer context (not pooled).” Every row is explicitly contextual rather than an estimate of the main W-RG/W-SGB effect.

The belief row now uses repaired E-BIS: 204/216 reports at `(0.5,0.5)` and 216/216 with `pAccept=pSecond`. The text also records why the superseded metric is not probative: its second-order target made universal midpoint reporting self-ratifying, and total forgone reporting reward was only about 0.061 points per agent-run against scores near 55.

## 4. Smaller manuscript changes

- The Hard-partner-only arm remains a descriptive, non-preregistered ranking but is now identified as a design lead: effective institutional text may specify a partner condition without naming the desired transaction or donor role.
- The abstract is 148 words and retains three effect numbers.
- Provider bracketing now receives a substantive Methods treatment: controls, dominance anchors, prompt hashes, catalog and returned-model checks, output-diversity gates, fingerprints, baseline establishment, pre/post matching, and the motivating serving incident.
- Related work now includes Kiyotaki–Wright search-theoretic money; formal electronic institutions and normative MAS; and the Barrie–Törnberg contamination critique plus the Flint Ashery–Aiello–Baronchelli reply.

## 5. Venue and second-model decision

The venue ranking is retained as a strategy recommendation, not a manuscript claim: COLM is the best topical fit, ARR/ACL is the most flexible active review path, and AAMAS is a plausible conceptual venue after the literature repair.

No second-model calls were launched. `deepseek-v4-pro` cannot supply the requested replication now: DeepSeek's official V4.1 announcement states that all requests to that name route to V4.1 Flash after 04:00 UTC on 2026-09-14 until V4.1 Pro is released. A request alias is not an independent model family. Any future replication must establish a distinct returned model and fingerprint before freezing target calls.

## 6. Frozen-trace exploratory analysis

**Accepted with an inferential guard.** A pure analyzer now reconstructs all 11 realizable role–relation cells from the 98 frozen W-SGB runs, checks the completed study and healthy provider bracket, bins H–H dynamics by four rounds, and pairs all 112 persistent account trajectories.

The full matrix reveals broader descriptive expansion than the confirmatory H–H cell alone: exact gift has 99 H→E gifts versus 3 under neutral and 28 E–H swaps versus 0; the harmful E–E package has 35 H→E gifts versus 3. These meeting-level observations were not preregistered and are never upgraded.

Dynamics do not show monotone adoption: exact gift begins at 14/17 H–H swaps in rounds 1–4 and ends at 17/20 in rounds 21–24. Distributionally, 70/112 accounts improve under gift versus neutral, 20 tie, and 22 worsen; the mean seed-level minimum rises 2.68 and mean within-run SD falls 0.34. The paper labels all of these frozen-data exploratory.

The formal arm table now reports \(S_D=(A_D,B_D,R_D,Q_D)\); the harmful 113/114 result has its own subsection; the neutral H–H baseline is explained as amplification rather than creation; and the abstract specifies that 3.2083 is per account.

## 7. AAMAS literature positioning

**Accepted.** Related Work now separates top-down social-law synthesis from bottom-up norm emergence and adds Shoham–Tennenholtz and Sen–Airiau. Searle and Ostrom bound what the paper does not identify: collective status assignment, self-governance, and institution legitimacy. The three-seed grok comparison has moved to one limitation sentence.

## 8. Files changed

- `VBE-paper1-submission-draft.md`
- `VBE-paper1-submission-spine.md`
- `VBE-paper1-supplement-router.md`
- `VBE-paper1-aamas2027.tex` and `.bib`
- `vbe-engine/src/lib/vbe/analyze-paper1-scope-exploratory.ts`
- `vbe-engine/src/lib/vbe/paper1-scope-exploratory.test.ts`
- `vbe-engine/src/lib/vbe/plot-paper1-exploratory.ts`
- `vbe-engine/src/lib/vbe/plot-paper1-welfare.ts`
- regenerated `figures/VBE-paper1-welfare-mechanism.svg` and `.png`
- generated `figures/VBE-paper1-exploratory.svg` and `.png`
