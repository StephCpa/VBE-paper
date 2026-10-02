# Paper 1 r2 revision change log

Date: 2026-10-01  
Revision commit: `6a63a568db8e97a1f63c693d6d3bbf2b7110aa93`  
Base commit: `7aeefea311ead04d3a15386aa01602e17763461e`

This log records the second-round revision that was pushed to the public
`StephCpa/VBE-paper` repository. The revision is a zero-call audit and
reanalysis of the frozen W-CO, W-RG, and W-SGB traces; it does not change the
frozen protocols, prompts, model calls, tiers, or preregistered gates.

## Manuscript and figures

- Reworked the manuscript around the three evidence layers: welfare/accounting,
  execution-layer causal channel, and scope boundary.
- Added the exact environment specification, transfer accounting, stage-game
  payoff table, first-best benchmarks, and the exhaustive local environment
  validation described in Supplement S1.
- Added the X1 fixed-state and replay-based mechanism audit, including the
  money-engagement funnel, named-relation comparison, and harmful-directive
  scope analysis.
- Replaced the prior schematic figures used by the manuscript with data-derived
  X1 figures and added the reproducible figure-generation script.
- Added the compiled revision PDF
  `paper/VBE-paper1-aamas2027-r2.pdf`; the previous r1 PDF was removed from the
  active paper path to avoid ambiguity.
- Expanded the bibliography and updated the AI-assistance disclosure.

## Engine, data, and tests

- Added the frozen X1 reanalysis artifact and Markdown report.
- Added `welfare-review-x1.ts`, its test suite, the reanalysis runner, and the
  exhaustive environment test.
- Added the local `buyer-wrapper-disassembly.json` artifact used by the X1
  audit.
- Verified the deterministic revision test set: 27 tests pass, including the
  4,096-case local environment enumeration, payoff/accounting identities,
  replay invariants, fixed-state checks, and X0 synchronization checks.

## Reports and reproducibility

- Added the point-by-point second-round review response.
- Added the follow-up protocol document for the remaining call-requiring
  Protocols A/B/C.
- Added Supplement S1 (environment and payoff specification).
- Updated the supplement router and the AI-assistance disclosure.
- The repository contains no API keys or provider request secrets.

## Known pre-submission items

The revision is not a claim that every follow-up study is complete. Before a
formal submission, the following remain explicit:

1. Add the six frozen-manifest artifacts listed in the README, if they are to
   be part of the final reproducibility package.
2. Complete the human-verification and full prompt-export checklist.
3. Decide whether to run Protocols A/B/C; no new model calls are included in
   this r2 commit.
4. Replace the OpenReview placeholder and perform the final anonymous-supplement
   check.

The current revision is an incremental Git bundle over the base commit above.
Clone the repository first, then fetch the bundle or use the pushed `main`
branch directly.
