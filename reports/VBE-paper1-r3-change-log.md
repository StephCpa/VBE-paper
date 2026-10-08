# Paper 1 r3 revision change log

Date: 2026-10-08
Base commit: `647c383ba4ffa39dfc580711078631e764ef5974` (r2)
Branch: `claude/compassionate-heisenberg-fo3wyv`

This revision answers the third pre-review (`reports/VBE-paper1-review-response-2026-10-08.md`). It is a zero-call revision. No model call was made, and no frozen protocol, prompt, trace, gate, verdict, or X1 artifact changed (`welfare-review-x1.json` and `.md` are byte-identical to r2).

## Engine, data, and tests

- **New X2 boundary audit.** Files: `engine/src/lib/vbe/welfare-review-x2.ts`, `reanalyze-welfare-review-x2.ts`, and `welfare-review-x2.test.ts` (6 tests). Outputs: `engine/src/data/welfare-review-x2.json` and `.md`. The output is deterministic, with a fixed bootstrap seed and no wall-clock fields. Contents:
  - endgame giving by exact round, with meetings and seeds as units;
  - first- versus prior-meeting giving within exact rounds, plus a round-standardized difference;
  - giving after an unreciprocated transfer, split by where the loss occurred and by partner identity;
  - named-gift encounter tables under two definitions, with numerators, denominators, and seeds;
  - seed-cluster bootstrap intervals for the Figure 2B curves and for each welfare-accounting component;
  - seed-clustered tests of first-decision discrepancies against same-prompt noise.
- `.gitignore` allowlist extended for the X2 files.
- Paper 1 test set: 55 pass, 0 fail (`env*.test.ts`, `welfare-*.test.ts` except `welfare-crowding-out.test.ts`, the X0 v1.1 test, `paper1-scope-exploratory.test.ts`).

## Figures (`figures/scripts/make_x1_figures.py`)

- **Drawing size.** Main figures are now drawn at the 7.0 in text width without tight cropping and included at `\textwidth`, so the scale is about 1.00 and labels keep their nominal 7–8.5 pt size. In r2 the scales were 1.13 for Figure 1 and 0.935 for Figure 2.
- **Figure 1A.** Retitled "Execution intervention (W-RG)", with a "Same Gift announcement" bracket over the gift arms. Axis labels are now "Gift + H–H filter" and "Gift + E→H filter". A paired-difference bracket shows −3.21 [−3.89, −2.47] with 12/12 seeds lower. Seed lines are now light gray. The first-best line moved to the caption, and no Neutral-blocked point is drawn.
- **Figure 1B.** Shows the W-SGB realized accounting only, with seed-bootstrap whiskers and printed intervals per component. The net row is separated and shows the frozen interval. Rows that involve the named transfer are marked *. The caption notes that rounded components may not sum to the displayed total. W-RG moved to the supplement.
- **Figure 2A.** Every cell shows k/n. A color scale and an outline legend were added. The Money row has no outline, carries a footnote, and its cell is not replaced by the full-run count. Text was enlarged.
- **Figure 2B.** The x axis is the agent's meeting index ("not calendar round"), with the 4th+ bin shaded and labeled pooled. Whiskers come from a seed-cluster bootstrap, and a denominator table sits under the axis. Lines now differ by marker shape and the harmful series is dashed. A subtitle reads "Observed trajectories; history is not randomized".
- **New supplementary figures.**
  - `figures/VBE-x2-supp-accounting.pdf`: W-RG Gift − Neutral and W-SGB Harmful − Neutral accounting.
  - `figures/VBE-x2-supp-curves.pdf`: Neutral curves and other cells on Figure 2B's axes.
  - `figures/VBE-x2-supp-endgame.pdf`: giving by calendar-round bins.

## Manuscript (`paper/VBE-paper1-aamas2027.tex`, `.bib`; compiled as `paper/VBE-paper1-aamas2027-r3.pdf`)

| Claim in r2 | r3 |
|---|---|
| Accounting "attributes the gain to H–H swaps"; "not through the transaction it named" | The largest positive component is H–H swaps (+2.20 [1.53, 2.92]); named relations add smaller positive terms (E–H swaps +0.36 [0.17, 0.57]; one-way E→H +0.08 [0.00, 0.16]); "mostly not through the transaction it named" |
| Blocking H–H "removes the gain"; "the H–H execution channel carries the welfare gain" | Lowers welfare within the gift condition. The algebra Y(G,B) − Y(N,S) = −1.53 is given, and the paper states that τ_B is not identified; the −0.44 figure is a sizing prior only |
| "Explicit exclusion clauses bound the response; positive role predicates do not"; "only explicit exclusions bounded it" | Among tested packages, exclusion clauses reduced specific off-scope responses. The paper adds that they are not strict scope enforcement (18 H→E gifts under Hard partner; 29 H–H swaps under Easy only vs 27 under neutral), that restriction can remove intended giving, and that packages are not minimal contrasts |
| "collapses after one meeting" | Drops sharply. Denominators are given for second and all later meetings, the first-E→H-after-another-role split is added, and named gifts still occur late (4/31 final round) |
| (new) endgame | 27/30 final-round H→H gifts (15 meetings, 15 seeds); described as inconsistent with explanations relying entirely on future incentives, with the mechanism not identified |
| (new) history and round | The pooled rounds 1–2 comparison is flagged as round-confounded; the paper reports the round-2-only rates and a round-standardized 0.44 [0.28, 0.61], and says this narrows rather than removes confounding |
| (new) after losses | 0.89 overall, split into 0.64 after an H→H loss to a new partner, 0.73 vs 0.97 by last H–H outcome, and 0.37 under harmful; the paper says this is not a retaliation test |
| "persists without any enforcement" | Without any added exogenous sanction or enforcement; whether it relies on history-dependent responses is not identified |
| "lie far outside that noise" | Descriptive contrast with seed-clustered intervals; W-CO's gift − money is not pooled with gift − neutral |
| Harmful directive | Persistent, directly costly transfers; the net welfare effect is not distinguishable from zero |
| Money | The funnel locates where the sale fails but not why; no claim about monetary acceptance |
| "together rule out the intuitive explanation" | "show that the intuitive explanation accounts for little of the welfare effect here" |
| Related Work: scope "exceeds the written one unless an exclusion is stated" | Scope can exceed the written one; exclusions reduced but did not eliminate the excess |

Other manuscript changes:

- **§3.1.** New sentences on closed-loop diagnostics and request-level verification: the replay verifies the user prompt; the rest of each request is fixed in frozen code; request bodies were not logged.
- **§3, inference.** Pooled rates use seed-cluster resampling.
- **Related Work.** New paragraph citing Akata et al. 2025, Fontana et al. 2025, CoopEval (Tewolde et al. 2026), Selten & Stoecker 1986, Fischbacher et al. 2001, and Bicchieri 2006, with the positioning the review recommended. Six entries were added to the bibliography.
- **Discussion.** Adds "Behavioral adoption is not a reliable proxy for welfare quality".
- **Limitations.** Updated for the new descriptive analyses, the logging gap, and the v0.2 roadmap with its second-model claim boundary.
- **Length.** The main text ends on page 8 of 8, and references follow. There are no undefined references and no overfull boxes.
- **Superseded PDF.** `paper/VBE-paper1-aamas2027-r2.pdf` is removed from the active path, as r1 was in r2. It remains in Git history at the base commit.

## Reports

- `reports/VBE-paper1-review-response-2026-10-08.md`: point-by-point response, including the figure recommendations.
- `reports/VBE-paper1-r3-followup-protocols.md` (v0.2), which supersedes the r2 protocols:
  - **A.** Four-arm factorial with τ_S, τ_B, and I; a ±0.75 TOST bound; a direct harm test; 32 fresh seeds; and a budget derived from the sizing formula.
  - **B.** Modular fixed-state study in four parts: B1 scope with a refined package, B2 memory with joint prior actions and partner identity, B3 horizon, and B4 payoff table.
  - **C.** Bounded second-model replication.
  - **D.** Optional paired free-riding test.
- `reports/VBE-paper1-r2-followup-protocols.md`: marked superseded.
- `reports/VBE-paper1-supplement-router.md` (v1.6): S6D (X2), updated S7′ and figure routing.
- `reports/VBE-paper1-ai-assistance-disclosure.md`: entry for this session, prompt record, and verification checklist line.
- `README.md`: r3 PDF, X2 commands, new figures, reports.

## Known pre-submission items (unchanged)

1. Add the six frozen-manifest artifacts listed in the README.
2. Complete the human-verification and full prompt-export checklist, including checking the six new citations against their published versions.
3. Decide whether to run Protocol A, and then B.
4. Replace the OpenReview placeholder and perform the final anonymous-supplement check.
