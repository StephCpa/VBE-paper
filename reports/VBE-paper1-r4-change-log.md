# Paper 1 r4 change log — figure and wording pass after the R3 re-review

Date: 2026-10-08
Base: r3 (`226d487`)
Branch: `claude/compassionate-heisenberg-fo3wyv`

The R3 re-review asked for no reanalysis and no removal of intervals. It asked instead for a redistribution of content between plots, inline values, captions, and text, plus five local wording fixes. No model call was made, and no data artifact, test, or analysis changed: `welfare-review-x1.*` and `welfare-review-x2.*` are byte-identical to r3. Only the figure script, the manuscript, the README, and this log changed. The compiled PDF is `paper/VBE-paper1-aamas2027-r4.pdf`; the r3 PDF is removed from the active path and remains in Git history.

## Figure 1 (`figures/scripts/make_x1_figures.py`)

| Re-review request | r4 |
|---|---|
| A: shorter title block | "A Execution intervention" with subtitle "W-RG · 12 paired seeds"; the group bracket now reads only "Same Gift announcement" |
| A: one primary effect annotation | The bracket reads "Δ = −3.21 / 95% CI [−3.89, −2.47]". The "Blocked − standard" prefix and "12/12 seeds lower" are removed; the sign count stays in Table 5 |
| A: no legend block | Legend removed. The dashed line is labeled "Never-transfer" directly. Thin lines and large dots are explained once, in the caption. The 52.53 value moved to §4.1 |
| B: keep all rows and whiskers, drop the value column | All seven rows and every whisker remain. Values appear inline only for H–H swaps (+2.20), one-way H→E (−0.62), and net (+2.06). The full means and intervals are in X2 §5 and the supplementary accounting figure |
| B: wider data axis | The freed width goes to the axis. Ticks are now −1, 0, 1, 2, 3, the range runs from −1.8 to 3.45 so no whisker is clipped, and the zero line and net divider are kept |
| Explain asterisks once | The in-figure footnote is removed; the caption explains the asterisks |

`accounting_panel` now takes a `value_mode` argument. Figure 1B uses `"key"`; the supplementary accounting figure keeps `"all"` and serves as the numeric table.

## Captions

- **Figure 1** is replaced with the reviewer's draft, lightly adapted: 79 words, about six typeset lines, against about 186 words and ten lines in r3. The removed content moved as follows:

  | Removed from the caption | Now in |
  |---|---|
  | W-RG never-transfer (52.53) and ex-ante first best (61.81) | §4.1 execution paragraph, labeled as values for "these seeds" so they are not confused with Table 4's W-SGB baselines |
  | Identical announcement but different full prompts | §3 W-RG paragraph (already stated there) |
  | "H–H is the largest component" | §4.1 and the +2.20 label |
  | Net interval as Table 5 | §4.1 opening |
  | Rounding note | X2 §5 table note |
  | W-RG decomposition | §4.1 pointer to the supplementary accounting figure |

- **Figure 2** caption: 90 words. "Prompts are byte-identical" becomes "reconstructed user prompts differ only in the announcement". The duplicated Money sentence, the duplicated "not calendar round", and the "denominators below the axis" remark are removed; the figure itself still shows all of them. Intervals and denominators are unchanged.

## Wording

1. **§4.1.** "Without H–H circulation, the remaining transfers induced by the gift announcement are net negative … what remains of the announcement's effect is wasteful" becomes "Under H–H blocking, the Gift arm scores below the never-transfer benchmark (52.53 on these seeds; their ex-ante first best is 61.81) in 10 of 12 seeds."
2. **§4.3.** "…realized history, round, and partner, none of which is randomized" becomes "These analyses stratify realized trajectories rather than experimentally manipulate history content or remaining horizon; their mechanism interpretations are descriptive." Partners are randomized by the environment's shuffle.
3. **Table 2 and the stage-game claim.** The caption now says it covers the binary unconditional check-transfer subgame, with no mark offers or payment requirements. The text, abstract, and introduction say that the unconditional give/keep subgame of an H–H meeting is a strict Prisoner's Dilemma.
4. **Reconstructed versus saved requests.** The abstract, introduction, Figure 2 caption, and noise-floor paragraph now refer to *reconstructed* prompts. The full validation boundary is stated once, in §3.1.
5. **Arm ordering restored in §3.** The paragraph now describes the counterbalanced order, verified against the frozen `position` fields:
   - W-SGB used the seven cyclic rotations of its arm list and their reversals, so each arm occupies each position twice and each ordered pair of arms occurs seven times.
   - W-RG places each arm in each position three times, and each ordered pair occurs six times.
   - W-CO alternates its two arms.

   The provider-health sentence is shortened to make room; the details remain in the supplement.

## Not changed

- **Table 5.** The re-review offered moving p_MRES and the leave-one-seed-out results to the appendix as an optional layout choice. Table 5 is unchanged because page space is not binding: the main text still ends on page 8.
- **Figure 2.** Structure, intervals, and denominators are unchanged.
- **Build checks.** There are no undefined references and no overfull boxes.

## AI-use statement (2026-10-09, author-supplied)

The main-text "AI assistance and artifacts" paragraph is split in two. The "AI use" paragraph now carries the authors' statement verbatim: "The authors used ChatGPT and Claude Code to assist with manuscript organization, language polishing, and generation of plotting code. The authors executed and verified the scripts, validated all technical content, and take full responsibility for the submission." The "Artifacts" paragraph keeps the supplement sentence unchanged. `paper/VBE-paper1-aamas2027-r4.pdf` is rebuilt; the main text still ends on page 8.
