# X0 Frozen-trace reanalysis

Generated 2026-10-01T04:54:55.917Z. This is a zero-call analysis of W-RG and W-SGB records. The seed-level population run remains the inferential unit.

## Named-relation proposal engagement

| Arm | Named relation | Proposal rate | 95% bootstrap CI | Neutral rate | Arm-minus-neutral | Gate at 0.25 |
|---|---|---:|---:|---:|---:|---|
| neutral | none | 0.000 | [0.000, 0.000] | 0.000 | 0.000 | fail / unengaged |
| gift-exact | E→H gift | 0.123 | [0.081, 0.165] | 0.000 | 0.123 | fail / unengaged |
| gift-easy-only | E→H gift | 0.000 | [0.000, 0.000] | 0.000 | 0.000 | fail / unengaged |
| gift-any-holder | E/H→H gift | 0.484 | [0.433, 0.532] | 0.119 | 0.365 | pass |
| gift-hard-partner-only | actor→H gift | 0.446 | [0.404, 0.492] | 0.119 | 0.327 | pass |
| money-exact | E→H sale | 1.000 | [1.000, 1.000] | 0.937 | 0.063 | fail / unengaged |
| easy-easy-negative | E↔E gift proposal | 0.991 | [0.973, 1.000] | 0.000 | 0.991 | pass |

## Role-conditional proposal map

Rates are proposals per directed actor opportunity; gift means giveCheck=true and requireChit=false.

| Arm | Cell | Opportunities | Gift proposals | Sale proposals | Gift rate | Sale rate | Executed gift rate | Executed sale rate |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| neutral | E->E | 228 | 0 | 9 | 0.000 | 0.039 | 0.000 | 0.000 |
| neutral | E->H | 304 | 0 | 285 | 0.000 | 0.938 | 0.000 | 0.000 |
| neutral | H->E | 304 | 3 | 301 | 0.010 | 0.990 | 0.010 | 0.000 |
| neutral | H->H | 250 | 64 | 186 | 0.256 | 0.744 | 0.256 | 0.000 |
| gift-exact | E->E | 228 | 16 | 2 | 0.070 | 0.009 | 0.070 | 0.000 |
| gift-exact | E->H | 304 | 37 | 248 | 0.122 | 0.816 | 0.122 | 0.000 |
| gift-exact | H->E | 304 | 127 | 177 | 0.418 | 0.582 | 0.418 | 0.000 |
| gift-exact | H->H | 250 | 228 | 22 | 0.912 | 0.088 | 0.912 | 0.000 |
| gift-easy-only | E->E | 228 | 6 | 6 | 0.026 | 0.026 | 0.026 | 0.000 |
| gift-easy-only | E->H | 304 | 0 | 281 | 0.000 | 0.924 | 0.000 | 0.000 |
| gift-easy-only | H->E | 304 | 16 | 287 | 0.053 | 0.944 | 0.053 | 0.000 |
| gift-easy-only | H->H | 250 | 87 | 163 | 0.348 | 0.652 | 0.348 | 0.000 |
| gift-any-holder | E->E | 228 | 6 | 1 | 0.026 | 0.004 | 0.026 | 0.000 |
| gift-any-holder | E->H | 304 | 35 | 236 | 0.115 | 0.776 | 0.115 | 0.000 |
| gift-any-holder | H->E | 304 | 123 | 180 | 0.405 | 0.592 | 0.405 | 0.000 |
| gift-any-holder | H->H | 250 | 233 | 17 | 0.932 | 0.068 | 0.932 | 0.000 |
| gift-hard-partner-only | E->E | 228 | 0 | 0 | 0.000 | 0.000 | 0.000 | 0.000 |
| gift-hard-partner-only | E->H | 304 | 5 | 147 | 0.016 | 0.484 | 0.016 | 0.000 |
| gift-hard-partner-only | H->E | 304 | 19 | 282 | 0.063 | 0.928 | 0.063 | 0.000 |
| gift-hard-partner-only | H->H | 250 | 240 | 10 | 0.960 | 0.040 | 0.960 | 0.000 |
| money-exact | E->E | 228 | 0 | 38 | 0.000 | 0.167 | 0.000 | 0.000 |
| money-exact | E->H | 304 | 0 | 304 | 0.000 | 1.000 | 0.000 | 0.000 |
| money-exact | H->E | 304 | 0 | 304 | 0.000 | 1.000 | 0.000 | 0.000 |
| money-exact | H->H | 250 | 48 | 202 | 0.192 | 0.808 | 0.192 | 0.000 |
| easy-easy-negative | E->E | 228 | 227 | 0 | 0.996 | 0.000 | 0.996 | 0.000 |
| easy-easy-negative | E->H | 304 | 4 | 296 | 0.013 | 0.974 | 0.013 | 0.000 |
| easy-easy-negative | H->E | 304 | 36 | 268 | 0.118 | 0.882 | 0.118 | 0.000 |
| easy-easy-negative | H->H | 250 | 184 | 66 | 0.736 | 0.264 | 0.736 | 0.000 |

## Hard-actor spillover

| Arm | Cell | Proposal rate | Neutral rate | Difference |
|---|---|---:|---:|---:|
| neutral | H->H | 0.261 | 0.261 | 0.000 |
| neutral | H->E | 0.012 | 0.012 | 0.000 |
| gift-exact | H->H | 0.906 | 0.261 | 0.644 |
| gift-exact | H->E | 0.427 | 0.012 | 0.416 |
| gift-easy-only | H->H | 0.353 | 0.261 | 0.092 |
| gift-easy-only | H->E | 0.054 | 0.012 | 0.042 |
| gift-any-holder | H->H | 0.927 | 0.261 | 0.666 |
| gift-any-holder | H->E | 0.420 | 0.012 | 0.408 |
| gift-hard-partner-only | H->H | 0.963 | 0.261 | 0.702 |
| gift-hard-partner-only | H->E | 0.066 | 0.012 | 0.054 |
| money-exact | H->H | 0.191 | 0.261 | -0.070 |
| money-exact | H->E | 0.000 | 0.012 | -0.012 |
| easy-easy-negative | H->H | 0.737 | 0.261 | 0.476 |
| easy-easy-negative | H->E | 0.130 | 0.012 | 0.118 |

## Model-free scripted benchmarks

| Policy | Mean score | 95% CI | H-H swap rate | E-H gift rate | H-E gift rate | E-E swap rate |
|---|---:|---:|---:|---:|---:|---:|
| never-transfer | 54.241 | [53.705, 54.830] | 0.000 | 0.000 | 0.000 | 0.000 |
| first-best | 63.188 | [62.438, 63.857] | 1.000 | 1.000 | 0.000 | 0.000 |
| always-give | 60.813 | [60.058, 61.496] | 1.000 | 0.000 | 0.000 | 1.000 |
| gift-rho-surrogate | 56.790 | [55.987, 57.580] | 0.791 | 0.049 | 0.383 | 0.007 |
| gift-rho-without-H-to-E | 57.879 | [57.214, 58.554] | 0.791 | 0.082 | 0.000 | 0.007 |

## Transaction payoff table

| Relation | Giver expected delta | Receiver expected delta | Total expected delta |
|---|---:|---:|---:|
| H→H swap | 1.83 | 1.83 | 3.66 |
| E→H gift | -0.50 | 2.33 | 1.83 |
| H→E gift | -0.96 | 0.00 | -0.96 |
| E↔E swap | -0.50 | -0.50 | -1.00 |
| E→H mark sale | -0.50 | 2.33 | 1.83 |

## Interpretation boundary

The proposal map distinguishes realized H-H activation from the named E-H relation. It cannot by itself separate structured scope expansion, role misbinding, and generic transfer priming. The named-relation audit treats every package symmetrically; packages that fail the 0.25 proposal gate are not used to identify scope boundaries.

- The frozen W-SGB meeting record stores structured proposals and executed outcomes, but not a separate engine rejection code; non-executed proposals are therefore classified as unresolved incompatibility/infeasibility rather than attributed to a single cause.
- Proposal feasibility is one check per agent per round under the frozen VBE engine; directed meeting opportunities are therefore used as the denominator.
- The scripted benchmarks are model-free engine runs on the 14 W-SGB seeds and are descriptive surplus yardsticks, not new model evidence.
