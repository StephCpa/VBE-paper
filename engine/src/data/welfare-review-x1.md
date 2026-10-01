# X1 zero-call mechanism audit

**Zero model/API calls.** Post-hoc, supplementary reanalysis of frozen W-CO, W-RG and W-SGB traces. The seed-level population run remains the inferential unit; meeting-level counts are descriptive. Version 1.0.

Source SHA-256:

- `src/data/welfare-crowding-out.json`: `f6438915387c05fc1eb1b4a94c9b70ba7ae4a77b0addd0e6bf1ed86d66779c96`
- `src/data/welfare-role-channel.json`: `149cedf566502b250e0dcaa53076698c9318188b9bb077d3ac96f5e8347b9b2c`
- `src/data/welfare-semantic-boundary.json`: `f4ab7c137903926871d9d1ef8d163f58d4b14dd60e209341cdf13d0597c09e26`

## Replay and reconciliation

Every frozen run was replayed through the frozen engine by feeding back its recorded proposals. Each replay reproduces the recorded final scores and every meeting resolution, so every reconstructed prompt below is the prompt the model actually received. Every run's realized welfare also reconciles exactly to a never-transfer baseline plus per-transaction contributions.

| Study | Runs | Exact replays | Reconciled | Decisions |
|---|---:|---:|---:|---:|
| W-CO | 36 | 36 | 36 | 2728 |
| W-RG | 48 | 48 | 48 | 3680 |
| W-SGB | 98 | 98 | 98 | 7602 |

Recomputed seed-level effects match 21 frozen effect vectors exactly.

## 1. Transaction payoff identities

Expected direct change relative to no transfer, computed analytically and verified against the frozen engine by integrating over the payoff-draw strata. Marks carry no value, so a sale moves the same payoff as a gift in the same direction.

| Category | Giver | Receiver | Total |
|---|---:|---:|---:|
| H>H:gift | -0.96 | 2.33 | 1.37 |
| H>H:sale | -0.96 | 2.33 | 1.37 |
| H>E:gift | -0.96 | 0.00 | -0.96 |
| H>E:sale | -0.96 | 0.00 | -0.96 |
| E>H:gift | -0.50 | 2.33 | 1.83 |
| E>H:sale | -0.50 | 2.33 | 1.83 |
| E>E:gift | -0.50 | 0.00 | -0.50 |
| E>E:sale | -0.50 | 0.00 | -0.50 |
| HH:swap | 1.83 | 1.83 | 3.66 |
| EH:swap | -0.50 | 1.83 | 1.33 |
| EE:swap | -0.50 | -0.50 | -1.00 |

Stage games implied by these identities (expected round payoffs; action 0 = keep, 1 = unconditional give):

- **H-H** (row H, column H): keep/keep 0.96, 0.96; keep/give 3.29, 0.00; give/keep 0.00, 3.29; give/give 2.79, 2.79. Dominant: row keep, column keep. Welfare-maximizing: H give, H give. Prisoner's Dilemma: true.
- **E-H** (row E, column H): keep/keep 3.50, 0.96; keep/give 3.50, 0.00; give/keep 3.00, 3.29; give/give 3.00, 2.79. Dominant: row keep, column keep. Welfare-maximizing: E give, H keep. Prisoner's Dilemma: false.

## 2. Benchmarks on the same seeds

Model-free engine runs with the same paired schedules and payoff draws. The ex-ante first best maximizes expected welfare meeting by meeting over the engine's action space without using realized draws (H-H swap; one-way E->H gift; otherwise keep); it is a planner benchmark and not an equilibrium. The ex-post first best uses realized draws and is an omniscient upper bound.

| Study | Never transfer | Ex-ante first best | Ex-post first best | Always give |
|---|---:|---:|---:|---:|
| W-CO | 53.583 | 62.250 | 62.330 | 59.879 |
| W-RG | 52.531 | 61.813 | 61.896 | 59.500 |
| W-SGB | 54.241 | 63.188 | 63.263 | 60.813 |

## 3. Exact welfare accounting

Per arm: realized mean welfare, the same seeds' never-transfer welfare, and the share of the ex-ante feasible gain captured. Category contributions are per account (summed over meetings, divided by seeds x 8 accounts). The residual is realized minus expected, i.e. payoff-draw luck.

### W-CO

| Arm | Welfare | Never | Gain | Share of ex-ante gain | HH:swap n / real. | EH:swap n / real. | E>H:gift n / real. | H>E:gift n / real. | H>H:gift n / real. | EE:swap n / real. |
|---|---:|---:|---:|---:|---|---|---|---|---|---|
| money-talk | 54.542 | 53.583 | 0.958 | 0.111 | 27 / 0.771 | 0 / 0.000 | 0 / 0.000 | 0 / 0.000 | 13 / 0.191 | 0 / 0.000 |
| gift-talk | 56.875 | 53.583 | 3.292 | 0.380 | 138 / 3.729 | 37 / 0.434 | 12 / 0.125 | 146 / -1.042 | 15 / 0.156 | 2 / -0.014 |

Decomposition of each arm's welfare difference from the reference arm into realized category contributions (accounting identity, not causal mediation):

- **gift-talk - money-talk**: welfare +2.3333 = sum of category deltas 2.3334; HH:swap +111 (+2.958); EH:swap +37 (+0.434); EE:swap +2 (-0.014); H>H:gift +2 (-0.035); H>E:gift +146 (-1.042); E>H:gift +12 (+0.125); E>E:gift +27 (-0.094); none -337 (+0.000).

### W-RG

| Arm | Welfare | Never | Gain | Share of ex-ante gain | HH:swap n / real. | EH:swap n / real. | E>H:gift n / real. | H>E:gift n / real. | H>H:gift n / real. | EE:swap n / real. |
|---|---:|---:|---:|---:|---|---|---|---|---|---|
| neutral-standard | 53.615 | 52.531 | 1.083 | 0.117 | 24 / 0.875 | 0 / 0.000 | 0 / 0.000 | 2 / 0.000 | 11 / 0.213 | 0 / 0.000 |
| gift-standard | 55.297 | 52.531 | 2.766 | 0.298 | 83 / 3.281 | 25 / 0.401 | 1 / 0.031 | 98 / -1.125 | 21 / 0.266 | 3 / -0.031 |
| gift-hh-blocked | 52.089 | 52.531 | -0.443 | -0.048 | 0 / 0.000 | 18 / 0.281 | 3 / 0.063 | 81 / -0.750 | 0 / 0.000 | 1 / -0.010 |
| gift-eh-gift-blocked | 54.849 | 52.531 | 2.318 | 0.250 | 84 / 3.219 | 0 / 0.000 | 0 / 0.000 | 119 / -1.156 | 18 / 0.281 | 0 / 0.000 |

Decomposition of each arm's welfare difference from the reference arm into realized category contributions (accounting identity, not causal mediation):

- **gift-standard - neutral-standard**: welfare +1.6823 = sum of category deltas 1.6823; HH:swap +59 (+2.406); EH:swap +25 (+0.401); EE:swap +3 (-0.031); H>H:gift +10 (+0.052); H>E:gift +96 (-1.125); E>H:gift +1 (+0.031); E>E:gift +10 (-0.052); none -204 (+0.000).
- **gift-hh-blocked - neutral-standard**: welfare -1.5261 = sum of category deltas -1.5259; HH:swap -24 (-0.875); EH:swap +18 (+0.281); EE:swap +1 (-0.010); H>H:gift -11 (-0.213); H>E:gift +79 (-0.750); E>H:gift +3 (+0.063); E>E:gift +4 (-0.021); none -70 (+0.000).
- **gift-eh-gift-blocked - neutral-standard**: welfare +1.2344 = sum of category deltas 1.2345; HH:swap +60 (+2.344); H>H:gift +7 (+0.068); H>E:gift +117 (-1.156); E>E:gift +4 (-0.021); none -188 (+0.000).

### W-SGB

| Arm | Welfare | Never | Gain | Share of ex-ante gain | HH:swap n / real. | EH:swap n / real. | E>H:gift n / real. | H>E:gift n / real. | H>H:gift n / real. | EE:swap n / real. |
|---|---:|---:|---:|---:|---|---|---|---|---|---|
| neutral | 55.277 | 54.241 | 1.036 | 0.116 | 27 / 0.964 | 0 / 0.000 | 0 / 0.000 | 3 / 0.000 | 10 / 0.071 | 0 / 0.000 |
| gift-exact | 57.339 | 54.241 | 3.098 | 0.346 | 105 / 3.161 | 28 / 0.357 | 9 / 0.080 | 99 / -0.616 | 18 / 0.188 | 2 / -0.018 |
| gift-easy-only | 55.228 | 54.241 | 0.987 | 0.110 | 29 / 0.991 | 0 / 0.000 | 0 / 0.000 | 16 / -0.161 | 29 / 0.183 | 1 / -0.009 |
| gift-any-holder | 57.245 | 54.241 | 3.005 | 0.336 | 111 / 3.348 | 28 / 0.438 | 7 / 0.080 | 95 / -0.938 | 11 / 0.103 | 0 / 0.000 |
| gift-hard-partner-only | 57.683 | 54.241 | 3.442 | 0.385 | 115 / 3.455 | 1 / 0.022 | 4 / 0.054 | 18 / -0.188 | 10 / 0.098 | 0 / 0.000 |
| money-exact | 55.071 | 54.241 | 0.830 | 0.093 | 21 / 0.777 | 0 / 0.000 | 0 / 0.000 | 0 / 0.000 | 6 / 0.054 | 0 / 0.000 |
| easy-easy-negative | 55.464 | 54.241 | 1.223 | 0.137 | 75 / 2.196 | 1 / 0.022 | 3 / 0.054 | 35 / -0.348 | 34 / 0.313 | 113 / -1.009 |

Decomposition of each arm's welfare difference from the reference arm into realized category contributions (accounting identity, not causal mediation):

- **gift-exact - neutral**: welfare +2.0625 = sum of category deltas 2.0624; HH:swap +78 (+2.196); EH:swap +28 (+0.357); EE:swap +2 (-0.018); H>H:gift +8 (+0.116); H>E:gift +96 (-0.616); E>H:gift +9 (+0.080); E>E:gift +12 (-0.054); none -233 (+0.000).
- **gift-easy-only - neutral**: welfare -0.0491 = sum of category deltas -0.0491; HH:swap +2 (+0.027); EE:swap +1 (-0.009); H>H:gift +19 (+0.112); H>E:gift +13 (-0.161); E>E:gift +4 (-0.018); none -39 (+0.000).
- **gift-any-holder - neutral**: welfare +1.9687 = sum of category deltas 1.9688; HH:swap +84 (+2.384); EH:swap +28 (+0.438); H>H:gift +1 (+0.031); H>E:gift +92 (-0.938); E>H:gift +7 (+0.080); E>E:gift +6 (-0.027); none -218 (+0.000).
- **gift-hard-partner-only - neutral**: welfare +2.4062 = sum of category deltas 2.4063; HH:swap +88 (+2.491); EH:swap +1 (+0.022); H>H:gift +0 (+0.027); H>E:gift +15 (-0.188); E>H:gift +4 (+0.054); none -108 (+0.000).
- **money-exact - neutral**: welfare -0.2054 = sum of category deltas -0.2053; HH:swap -6 (-0.188); H>H:gift -4 (-0.018); H>E:gift -3 (+0.000); none +13 (+0.000).
- **easy-easy-negative - neutral**: welfare +0.1875 = sum of category deltas 0.1875; HH:swap +48 (+1.232); EH:swap +1 (+0.022); EE:swap +113 (-1.009); H>H:gift +24 (+0.241); H>E:gift +32 (-0.348); E>H:gift +3 (+0.054); E>E:gift +1 (-0.004); none -222 (+0.000).

Reviewer-specific arithmetic:

- `wsgbGiftExactHtoEGifts`: 99
- `wsgbNeutralHtoEGifts`: 3
- `wsgbGiftExactHtoEExpectedPerAccount`: -0.8486
- `wsgbGiftMinusNeutralHtoEExpectedPerAccount`: -0.8229
- `wrgGiftStandardEHSwaps`: 25
- `wrgGiftStandardEtoHOneWay`: 1
- `wrgEHSwapAvoidableLossVersusOneWayTotal`: 12.5
- `staticHHMagnitude`: 3.1644

## 4. Joint proposals and the money funnel

Joint unconditional-give proposals per meeting (original model proposals; for E-H the first agent is Easy), with the local engine resolution of those proposals.

### W-CO

| Arm | Pair | Meetings | Neither | Only first | Only second | Both | Local resolutions |
|---|---|---:|---:|---:|---:|---:|---|
| money-talk | H-H | 154 | 114 | 6 | 7 | 27 | gift: 13, none: 114, swap: 27 |
| money-talk | E-H | 373 | 373 | 0 | 0 | 0 | none: 373 |
| money-talk | E-E | 155 | 154 | 0 | 1 | 0 | none: 154, gift: 1 |
| gift-talk | H-H | 154 | 1 | 11 | 4 | 138 | swap: 138, gift: 15, none: 1 |
| gift-talk | E-H | 373 | 178 | 12 | 146 | 37 | gift: 158, none: 178, swap: 37 |
| gift-talk | E-E | 155 | 125 | 17 | 11 | 2 | none: 125, gift: 28, swap: 2 |

### W-RG

| Arm | Pair | Meetings | Neither | Only first | Only second | Both | Local resolutions |
|---|---|---:|---:|---:|---:|---:|---|
| neutral-standard | H-H | 107 | 72 | 4 | 7 | 24 | swap: 24, none: 72, gift: 11 |
| neutral-standard | E-H | 262 | 260 | 0 | 2 | 0 | none: 260, gift: 2 |
| neutral-standard | E-E | 91 | 90 | 1 | 0 | 0 | none: 90, gift: 1 |
| gift-standard | H-H | 107 | 3 | 11 | 10 | 83 | swap: 83, gift: 21, none: 3 |
| gift-standard | E-H | 262 | 138 | 1 | 98 | 25 | swap: 25, none: 138, gift: 99 |
| gift-standard | E-E | 91 | 77 | 5 | 6 | 3 | none: 77, gift: 11, swap: 3 |
| gift-hh-blocked | H-H | 107 | 5 | 12 | 16 | 74 | swap: 74, gift: 28, none: 5 |
| gift-hh-blocked | E-H | 262 | 160 | 3 | 81 | 18 | swap: 18, none: 160, gift: 84 |
| gift-hh-blocked | E-E | 91 | 85 | 2 | 3 | 1 | none: 85, gift: 5, swap: 1 |
| gift-eh-gift-blocked | H-H | 107 | 5 | 11 | 7 | 84 | swap: 84, gift: 18, none: 5 |
| gift-eh-gift-blocked | E-H | 262 | 139 | 4 | 103 | 16 | swap: 16, none: 139, gift: 107 |
| gift-eh-gift-blocked | E-E | 91 | 86 | 4 | 1 | 0 | none: 86, gift: 5 |

### W-SGB

| Arm | Pair | Meetings | Neither | Only first | Only second | Both | Local resolutions |
|---|---|---:|---:|---:|---:|---:|---|
| neutral | H-H | 125 | 88 | 3 | 7 | 27 | gift: 10, none: 88, swap: 27 |
| neutral | E-H | 304 | 301 | 0 | 3 | 0 | none: 301, gift: 3 |
| neutral | E-E | 114 | 114 | 0 | 0 | 0 | none: 114 |
| gift-exact | H-H | 125 | 2 | 11 | 7 | 105 | swap: 105, gift: 18, none: 2 |
| gift-exact | E-H | 304 | 168 | 9 | 99 | 28 | gift: 108, swap: 28, none: 168 |
| gift-exact | E-E | 114 | 100 | 6 | 6 | 2 | none: 100, gift: 12, swap: 2 |
| gift-easy-only | H-H | 125 | 67 | 12 | 17 | 29 | swap: 29, none: 67, gift: 29 |
| gift-easy-only | E-H | 304 | 288 | 0 | 16 | 0 | none: 288, gift: 16 |
| gift-easy-only | E-E | 114 | 109 | 4 | 0 | 1 | none: 109, gift: 4, swap: 1 |
| gift-any-holder | H-H | 125 | 3 | 6 | 5 | 111 | swap: 111, gift: 11, none: 3 |
| gift-any-holder | E-H | 304 | 174 | 7 | 95 | 28 | none: 174, gift: 102, swap: 28 |
| gift-any-holder | E-E | 114 | 108 | 4 | 2 | 0 | none: 108, gift: 6 |
| gift-hard-partner-only | H-H | 125 | 0 | 7 | 3 | 115 | swap: 115, gift: 10 |
| gift-hard-partner-only | E-H | 304 | 281 | 4 | 18 | 1 | none: 281, gift: 22, swap: 1 |
| gift-hard-partner-only | E-E | 114 | 114 | 0 | 0 | 0 | none: 114 |
| money-exact | H-H | 125 | 98 | 4 | 2 | 21 | none: 98, swap: 21, gift: 6 |
| money-exact | E-H | 304 | 304 | 0 | 0 | 0 | none: 304 |
| money-exact | E-E | 114 | 114 | 0 | 0 | 0 | none: 114 |
| easy-easy-negative | H-H | 125 | 16 | 25 | 9 | 75 | swap: 75, gift: 34, none: 16 |
| easy-easy-negative | E-H | 304 | 265 | 3 | 35 | 1 | none: 265, gift: 38, swap: 1 |
| easy-easy-negative | E-E | 114 | 0 | 1 | 0 | 113 | swap: 113, gift: 1 |

Bilateral E->H sale funnel with nested denominators: E-H meetings -> Hard buyer holds a mark -> Easy seller proposes a mark-contingent sale -> Hard buyer offers a mark -> proposals compatible -> executed.

| Study | Arm | E-H meetings | Buyer holds mark | Seller offers sale | Buyer offers mark | Compatible | Executed | Hard decisions holding a mark | Mark offers (any cell) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| W-CO | money-talk | 373 | 203 | 203 | 0 | 0 | 0 | 344 | 0 |
| W-CO | gift-talk | 373 | 203 | 185 | 0 | 0 | 0 | 344 | 0 |
| W-RG | neutral-standard | 262 | 131 | 128 | 0 | 0 | 0 | 232 | 0 |
| W-RG | gift-standard | 262 | 131 | 123 | 0 | 0 | 0 | 232 | 0 |
| W-RG | gift-hh-blocked | 262 | 131 | 121 | 0 | 0 | 0 | 232 | 0 |
| W-RG | gift-eh-gift-blocked | 262 | 131 | 115 | 0 | 0 | 0 | 232 | 0 |
| W-SGB | neutral | 304 | 140 | 136 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | gift-exact | 304 | 140 | 124 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | gift-easy-only | 304 | 140 | 135 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | gift-any-holder | 304 | 140 | 131 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | gift-hard-partner-only | 304 | 140 | 78 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | money-exact | 304 | 140 | 140 | 0 | 0 | 0 | 261 | 0 |
| W-SGB | easy-easy-negative | 304 | 140 | 140 | 0 | 0 | 0 | 261 | 0 |

Across all 13 arms of the three studies: 0 mark offers in 3443 Hard decisions taken while holding a mark; 0 executed sales.

## 5. Fixed-state comparisons

At a decider's first meeting its prompt contains no post-treatment history: same round, role, inventories, score, and an empty memory. The reconstructed prompts are byte-identical across arms once the announcement is removed (asserted for every first meeting). Differences at these states are the announcement's direct effect at a fixed state, free of trajectory feedback. Rates use original model proposals; 'give' is an unconditional give. The closed-loop column is the seed-level difference over all decisions in the cell.

First-meeting decisions per arm: W-CO 144, W-RG 96, W-SGB 112.

| Study | Arm vs reference | Cell | n | Arm give | Ref give | Arm-only / Ref-only | First-meeting diff [95% CI] | Closed-loop diff |
|---|---|---|---:|---:|---:|---:|---|---:|
| W-CO | gift-talk vs money-talk | H>H | 28 | 0.964 | 0.179 | 22 / 0 | 0.769 [0.590, 0.910] | 0.722 |
| W-CO | gift-talk vs money-talk | H>E | 46 | 0.696 | 0.000 | 32 / 0 | 0.656 [0.500, 0.796] | 0.481 |
| W-CO | gift-talk vs money-talk | E>H | 41 | 0.634 | 0.000 | 26 / 0 | 0.616 [0.444, 0.778] | 0.132 |
| W-CO | gift-talk vs money-talk | E>E | 29 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.102 |
| W-RG | gift-standard vs neutral-standard | H>H | 19 | 0.789 | 0.263 | 10 / 0 | 0.452 [0.156, 0.741] | 0.573 |
| W-RG | gift-standard vs neutral-standard | H>E | 34 | 0.794 | 0.000 | 27 / 0 | 0.795 [0.591, 0.977] | 0.452 |
| W-RG | gift-standard vs neutral-standard | E>H | 31 | 0.516 | 0.000 | 16 / 0 | 0.507 [0.313, 0.708] | 0.101 |
| W-RG | gift-standard vs neutral-standard | E>E | 12 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.124 |
| W-SGB | gift-exact vs neutral | H>H | 18 | 0.944 | 0.389 | 10 / 0 | 0.552 [0.271, 0.823] | 0.644 |
| W-SGB | gift-exact vs neutral | H>E | 35 | 0.686 | 0.000 | 24 / 0 | 0.720 [0.548, 0.869] | 0.415 |
| W-SGB | gift-exact vs neutral | E>H | 39 | 0.436 | 0.000 | 17 / 0 | 0.482 [0.321, 0.649] | 0.123 |
| W-SGB | gift-exact vs neutral | E>E | 20 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.072 |
| W-SGB | gift-easy-only vs neutral | H>H | 18 | 0.444 | 0.389 | 2 / 1 | 0.094 [-0.063, 0.281] | 0.092 |
| W-SGB | gift-easy-only vs neutral | H>E | 35 | 0.057 | 0.000 | 2 / 0 | 0.042 [0.000, 0.101] | 0.042 |
| W-SGB | gift-easy-only vs neutral | E>H | 39 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.000 |
| W-SGB | gift-easy-only vs neutral | E>E | 20 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.031 |
| W-SGB | gift-any-holder vs neutral | H>H | 18 | 1.000 | 0.389 | 11 / 0 | 0.594 [0.281, 0.875] | 0.666 |
| W-SGB | gift-any-holder vs neutral | H>E | 35 | 0.629 | 0.000 | 22 / 0 | 0.554 [0.369, 0.726] | 0.408 |
| W-SGB | gift-any-holder vs neutral | E>H | 39 | 0.077 | 0.000 | 3 / 0 | 0.100 [0.000, 0.271] | 0.113 |
| W-SGB | gift-any-holder vs neutral | E>E | 20 | 0.050 | 0.000 | 1 / 0 | 0.056 [0.000, 0.167] | 0.025 |
| W-SGB | gift-hard-partner-only vs neutral | H>H | 18 | 1.000 | 0.389 | 11 / 0 | 0.594 [0.281, 0.875] | 0.702 |
| W-SGB | gift-hard-partner-only vs neutral | H>E | 35 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.054 |
| W-SGB | gift-hard-partner-only vs neutral | E>H | 39 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.020 |
| W-SGB | gift-hard-partner-only vs neutral | E>E | 20 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.000 |
| W-SGB | money-exact vs neutral | H>H | 18 | 0.056 | 0.389 | 0 / 6 | -0.375 [-0.688, -0.125] | -0.070 |
| W-SGB | money-exact vs neutral | H>E | 35 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | -0.012 |
| W-SGB | money-exact vs neutral | E>H | 39 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.000 |
| W-SGB | money-exact vs neutral | E>E | 20 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.000 |
| W-SGB | easy-easy-negative vs neutral | H>H | 18 | 0.833 | 0.389 | 8 / 0 | 0.427 [0.208, 0.646] | 0.475 |
| W-SGB | easy-easy-negative vs neutral | H>E | 35 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.118 |
| W-SGB | easy-easy-negative vs neutral | E>H | 39 | 0.000 | 0.000 | 0 / 0 | 0.000 [0.000, 0.000] | 0.013 |
| W-SGB | easy-easy-negative vs neutral | E>E | 20 | 1.000 | 0.000 | 20 / 0 | 1.000 [1.000, 1.000] | 0.991 |

Named-relation engagement in W-SGB, closed loop versus first decision. Delta is the seed-level named-relation rate minus neutral. The 0.25 value is the post-hoc descriptive screen used in X0; the threshold columns show where each conclusion would change.

| Arm | Named relation | Closed-loop delta [95% CI] | First-decision delta [95% CI] | Closed loop clears (0.05/0.1/0.15/0.2/0.25/0.3) | First decision clears |
|---|---|---|---|---|---|
| gift-exact | E->H gift | 0.123 [0.081, 0.166] | 0.482 [0.321, 0.649] | YYnnnn | YYYYYY |
| gift-easy-only | E->H gift | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] | nnnnnn | nnnnnn |
| gift-any-holder | actor->H gift | 0.365 [0.301, 0.430] | 0.242 [0.095, 0.414] | YYYYYY | YYYYnn |
| gift-hard-partner-only | actor->H gift | 0.327 [0.277, 0.381] | 0.189 [0.066, 0.331] | YYYYYY | YYYnnn |
| money-exact | E->H sale | 0.063 [0.039, 0.087] | 0.112 [0.018, 0.226] | Ynnnnn | YYnnnn |
| easy-easy-negative | E->E gift | 0.991 [0.973, 1.000] | 1.000 [1.000, 1.000] | YYYYYY | YYYYYY |

Temperature-0 determinism across W-RG's byte-identical gift arms (decisions whose full prompt, including the announcement, is identical):

| Arm A | Arm B | Identical prompts | Identical proposals | Agreement | A gives, B keeps | B gives, A keeps | First-meeting identical / agreeing |
|---|---|---:|---:|---:|---:|---:|---|
| gift-standard | gift-hh-blocked | 250 | 219 | 0.876 | 10 | 16 | 96 / 87 |
| gift-standard | gift-eh-gift-blocked | 388 | 350 | 0.902 | 16 | 15 | 96 / 85 |
| gift-hh-blocked | gift-eh-gift-blocked | 239 | 208 | 0.870 | 13 | 11 | 96 / 84 |

Closed-loop dynamics (descriptive): unconditional-give rate by the decider's meeting ordinal within a run. Later ordinals condition on realized history.

| Study | Arm | Cell | 1st | 2nd | 3rd | 4th+ |
|---|---|---|---|---|---|---|
| W-CO | money-talk | H>H | 0.18 (5/28) | 0.15 (6/40) | 0.18 (7/38) | 0.24 (49/202) |
| W-CO | money-talk | H>E | 0.00 (0/46) | 0.00 (0/37) | 0.00 (0/42) | 0.00 (0/248) |
| W-CO | money-talk | E>H | 0.00 (0/41) | 0.00 (0/45) | 0.00 (0/32) | 0.00 (0/255) |
| W-CO | gift-talk | H>H | 0.96 (27/28) | 1.00 (40/40) | 0.95 (36/38) | 0.93 (188/202) |
| W-CO | gift-talk | H>E | 0.70 (32/46) | 0.51 (19/37) | 0.67 (28/42) | 0.42 (104/248) |
| W-CO | gift-talk | E>H | 0.63 (26/41) | 0.02 (1/45) | 0.06 (2/32) | 0.08 (20/255) |
| W-RG | neutral-standard | H>H | 0.26 (5/19) | 0.58 (14/24) | 0.26 (6/23) | 0.23 (34/148) |
| W-RG | neutral-standard | H>E | 0.00 (0/34) | 0.04 (1/23) | 0.04 (1/26) | 0.00 (0/179) |
| W-RG | neutral-standard | E>H | 0.00 (0/31) | 0.00 (0/24) | 0.00 (0/26) | 0.00 (0/181) |
| W-RG | gift-standard | H>H | 0.79 (15/19) | 0.88 (21/24) | 0.87 (20/23) | 0.89 (131/148) |
| W-RG | gift-standard | H>E | 0.79 (27/34) | 0.57 (13/23) | 0.46 (12/26) | 0.40 (71/179) |
| W-RG | gift-standard | E>H | 0.52 (16/31) | 0.00 (0/24) | 0.12 (3/26) | 0.04 (7/181) |
| W-SGB | neutral | H>H | 0.39 (7/18) | 0.43 (10/23) | 0.13 (3/24) | 0.24 (44/185) |
| W-SGB | neutral | H>E | 0.00 (0/35) | 0.00 (0/27) | 0.03 (1/35) | 0.01 (2/207) |
| W-SGB | neutral | E>H | 0.00 (0/39) | 0.00 (0/29) | 0.00 (0/23) | 0.00 (0/213) |
| W-SGB | neutral | E>E | 0.00 (0/20) | 0.00 (0/33) | 0.00 (0/30) | 0.00 (0/145) |
| W-SGB | gift-exact | H>H | 0.94 (17/18) | 1.00 (23/23) | 0.88 (21/24) | 0.90 (167/185) |
| W-SGB | gift-exact | H>E | 0.69 (24/35) | 0.37 (10/27) | 0.29 (10/35) | 0.40 (83/207) |
| W-SGB | gift-exact | E>H | 0.44 (17/39) | 0.07 (2/29) | 0.09 (2/23) | 0.08 (16/213) |
| W-SGB | gift-exact | E>E | 0.00 (0/20) | 0.06 (2/33) | 0.03 (1/30) | 0.09 (13/145) |
| W-SGB | easy-easy-negative | H>H | 0.83 (15/18) | 0.83 (19/23) | 0.75 (18/24) | 0.71 (132/185) |
| W-SGB | easy-easy-negative | H>E | 0.00 (0/35) | 0.22 (6/27) | 0.17 (6/35) | 0.12 (24/207) |
| W-SGB | easy-easy-negative | E>H | 0.00 (0/39) | 0.00 (0/29) | 0.00 (0/23) | 0.02 (4/213) |
| W-SGB | easy-easy-negative | E>E | 1.00 (20/20) | 1.00 (33/33) | 1.00 (30/30) | 0.99 (144/145) |

W-RG execution-filter audit: local resolution of the two original proposals versus the executed proposals, for every meeting touched by the filter.

- **gift-hh-blocked**: 214 blocked proposals; HH:swap -> none: 74; H>H:gift -> none: 28; none -> none: 5.
- **gift-eh-gift-blocked**: 20 blocked proposals; EH:swap -> H>E:gift: 16; E>H:gift -> none: 4.

## 6. Supplementary inference

Labelled supplementary; the frozen gates are unchanged. `p(0)` is the frozen one-sided exact sign-flip p for H0: delta <= 0. `p(MRES)` tests H0: delta <= MRES by applying the same test to delta - MRES; Holm is within each W-SGB endpoint family. The lower end of the two-sided 95% percentile interval is a one-sided 97.5% lower bound. Leave-one-out is the range of the mean after dropping each seed.

| Family | Contrast | n | Mean | +/-/0 | Min seed | 95% CI | LB > MRES | p(0) | p(MRES) | Holm p(MRES) | LOO range |
|---|---|---:|---:|---|---:|---|---|---:|---:|---:|---|
| W-CO | gift - money welfare | 18 | 2.3333 | 17/1/0 | -0.688 | [1.729, 2.931] | true | 0.000015 | 0.000038 | NA | [2.195, 2.511] |
| W-RG | gift-standard - neutral-standard welfare | 12 | 1.6823 | 9/3/0 | -0.438 | [0.854, 2.463] | true | 0.003418 | 0.011230 | NA | [1.489, 1.875] |
| W-RG | gift-standard - gift-hh-blocked welfare | 12 | 3.2083 | 12/0/0 | 0.813 | [2.469, 3.891] | true | 0.000244 | 0.000244 | NA | [3.057, 3.426] |
| W-RG | gift-eh-gift-blocked - gift-hh-blocked welfare | 12 | 2.7604 | 12/0/0 | 0.688 | [2.094, 3.412] | true | 0.000244 | 0.000244 | NA | [2.608, 2.949] |
| W-RG | gift-standard - gift-hh-blocked H-H swap rate | 12 | 0.7525 | 12/0/0 | 0.375 | [0.633, 0.862] | true | 0.000244 | 0.001953 | NA | [0.730, 0.787] |
| W-SGB H-H swap rate | gift-exact - neutral H-H swap rate | 14 | 0.6070 | 14/0/0 | 0.375 | [0.510, 0.714] | true | 0.000061 | 0.000061 | 0.000488 | [0.577, 0.625] |
| W-SGB H-H swap rate | gift-exact - money-exact H-H swap rate | 14 | 0.6631 | 14/0/0 | 0.375 | [0.568, 0.755] | true | 0.000061 | 0.000061 | 0.000488 | [0.644, 0.685] |
| W-SGB H-H swap rate | gift-exact - easy-easy-negative H-H swap rate | 14 | 0.2293 | 10/3/1 | -0.143 | [0.105, 0.351] | false | 0.002686 | 0.624023 | 1.000000 | [0.201, 0.258] |
| W-SGB H-H swap rate | money-exact - neutral H-H swap rate | 14 | -0.0560 | 1/5/8 | -0.429 | [-0.126, -0.001] | false | 0.968750 | 1.000000 | 1.000000 | [-0.068, -0.027] |
| W-SGB H-H swap rate | easy-easy-negative - neutral H-H swap rate | 14 | 0.3777 | 14/0/0 | 0.111 | [0.287, 0.474] | true | 0.000061 | 0.008850 | 0.026550 | [0.345, 0.398] |
| W-SGB H-H swap rate | gift-exact - gift-easy-only H-H swap rate | 14 | 0.5923 | 14/0/0 | 0.125 | [0.482, 0.697] | true | 0.000061 | 0.000122 | 0.000488 | [0.569, 0.628] |
| W-SGB H-H swap rate | gift-any-holder - neutral H-H swap rate | 14 | 0.6576 | 14/0/0 | 0.333 | [0.549, 0.771] | true | 0.000061 | 0.000061 | 0.000488 | [0.631, 0.682] |
| W-SGB H-H swap rate | gift-hard-partner-only - neutral H-H swap rate | 14 | 0.7034 | 14/0/0 | 0.400 | [0.596, 0.810] | true | 0.000061 | 0.000061 | 0.000488 | [0.681, 0.727] |
| W-SGB welfare | gift-exact - neutral welfare | 14 | 2.0625 | 14/0/0 | 0.500 | [1.429, 2.813] | true | 0.000061 | 0.000122 | 0.000854 | [1.793, 2.183] |
| W-SGB welfare | gift-exact - money-exact welfare | 14 | 2.2679 | 14/0/0 | 0.563 | [1.670, 2.960] | true | 0.000061 | 0.000061 | 0.000488 | [2.034, 2.399] |
| W-SGB welfare | gift-exact - easy-easy-negative welfare | 14 | 1.8750 | 14/0/0 | 0.188 | [1.348, 2.433] | true | 0.000061 | 0.000183 | 0.001099 | [1.731, 2.005] |
| W-SGB welfare | money-exact - neutral welfare | 14 | -0.2054 | 1/9/4 | -0.688 | [-0.339, -0.071] | false | 0.996094 | 1.000000 | 1.000000 | [-0.240, -0.168] |
| W-SGB welfare | easy-easy-negative - neutral welfare | 14 | 0.1875 | 9/5/0 | -1.125 | [-0.339, 0.710] | false | 0.254578 | 0.868774 | 1.000000 | [0.063, 0.288] |
| W-SGB welfare | gift-exact - gift-easy-only welfare | 14 | 2.1116 | 14/0/0 | 0.375 | [1.464, 2.813] | true | 0.000061 | 0.000244 | 0.001099 | [1.899, 2.245] |
| W-SGB welfare | gift-any-holder - neutral welfare | 14 | 1.9688 | 14/0/0 | 0.375 | [1.295, 2.696] | true | 0.000061 | 0.000244 | 0.001099 | [1.779, 2.091] |
| W-SGB welfare | gift-hard-partner-only - neutral welfare | 14 | 2.4063 | 14/0/0 | 0.063 | [1.759, 3.107] | true | 0.000061 | 0.000183 | 0.001099 | [2.168, 2.587] |

## Boundary of interpretation

- Everything here is post hoc with respect to the frozen studies and adds no model evidence. The frozen verdicts and gates are unchanged.
- The welfare decomposition is an exact accounting identity, not a natural-mediation estimate: arms differ in which transactions occur because model behavior responds to history.
- First-meeting comparisons fix the decider's state but not the population's later trajectory; they identify the announcement's effect on the first decision, not the closed-loop policy.
- The fixed-state sample is the empty-history slice of the state space, so it is representative of first decisions, not of all states.
