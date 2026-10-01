# X0 v1.1 frozen-trace role and engagement reanalysis

Generated 2026-10-01T07:34:59.685Z. **Zero model/API calls.** The W-SGB seed-level population run (n=14) remains the inferential unit; meeting-level counts are descriptive.

Source: `VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY`, model: `deepseek-flash`; frozen source artifact SHA-256: `f4ab7c137903926871d9d1ef8d163f58d4b14dd60e209341cdf13d0597c09e26`. Gate manifest SHA-256: `258b2e55227a4b0a38edc9ae2350303391eaffbde2b9a513d18ad760f378b66e`.

## Frozen proposal-level engagement gate

The gate manifest was fixed within X0 v1.1 before computing these rows: named proposal rate minus the paired neutral rate must be at least 0.25 and pass a one-sided exact paired sign-flip test against zero, with Holm correction across the six non-neutral named-package rows (alpha=0.025). This analysis is post hoc with respect to the original W-SGB study and is not a prospective claim.

| Arm | Named relation | Mean proposal rate | 95% CI | Neutral rate | Delta | Delta CI | Holm p | Gate |
|---|---|---:|---:|---:|---:|---:|---:|---|
| neutral | none | 0.000 | [0.000, 0.000] | 0.000 | 0.000 | [0.000, 0.000] | NA | FAIL / UNENGAGED |
| gift-exact | E→H gift | 0.123 | [0.081, 0.165] | 0.000 | 0.123 | [0.081, 0.165] | 0.000732 | FAIL / UNENGAGED |
| gift-easy-only | E→H gift | 0.000 | [0.000, 0.000] | 0.000 | 0.000 | [0.000, 0.000] | 1.000000 | FAIL / UNENGAGED |
| gift-any-holder | actor→H gift | 0.484 | [0.434, 0.532] | 0.119 | 0.365 | [0.301, 0.430] | 0.000366 | PASS |
| gift-hard-partner-only | actor→H gift | 0.446 | [0.404, 0.493] | 0.119 | 0.327 | [0.277, 0.381] | 0.000366 | PASS |
| money-exact | E→H sale | 1.000 | [1.000, 1.000] | 0.937 | 0.063 | [0.039, 0.087] | 0.000977 | FAIL / UNENGAGED |
| easy-easy-negative | E↔E gift proposal | 0.991 | [0.973, 1.000] | 0.000 | 0.991 | [0.973, 1.000] | 0.000366 | PASS |

## Role-conditional proposal map

Each row is a directed actor opportunity. A gift is `giveCheck=true, requireChit=false`; a sale is `giveCheck=true, requireChit=true`; a mark offer is `giveChits>=1`; keep is the remaining action. Reported rates below are means of seed-level rates; pooled counts are included for auditability.

| Arm | Cell | Pooled opportunities | Gift | Sale | Mark offer | Keep | Gift rate | Sale rate | Gift executed rate | Sale executed rate |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| neutral | E->E | 228 | 0 | 9 | 0 | 219 | 0.000 | 0.042 | 0.000 | 0.000 |
| neutral | E->H | 304 | 0 | 285 | 0 | 19 | 0.000 | 0.937 | 0.000 | 0.000 |
| neutral | H->E | 304 | 3 | 301 | 0 | 0 | 0.012 | 0.988 | 1.000 | 0.000 |
| neutral | H->H | 250 | 64 | 186 | 0 | 0 | 0.261 | 0.739 | 1.000 | 0.000 |
| gift-exact | E->E | 228 | 16 | 2 | 0 | 210 | 0.072 | 0.009 | 1.000 | 0.000 |
| gift-exact | E->H | 304 | 37 | 248 | 0 | 19 | 0.123 | 0.811 | 1.000 | 0.000 |
| gift-exact | H->E | 304 | 127 | 177 | 0 | 0 | 0.427 | 0.573 | 1.000 | 0.000 |
| gift-exact | H->H | 250 | 228 | 22 | 0 | 0 | 0.906 | 0.094 | 1.000 | 0.000 |
| gift-easy-only | E->E | 228 | 6 | 6 | 0 | 216 | 0.031 | 0.026 | 1.000 | 0.000 |
| gift-easy-only | E->H | 304 | 0 | 281 | 0 | 23 | 0.000 | 0.921 | 0.000 | 0.000 |
| gift-easy-only | H->E | 304 | 16 | 287 | 0 | 1 | 0.054 | 0.942 | 1.000 | 0.000 |
| gift-easy-only | H->H | 250 | 87 | 163 | 0 | 0 | 0.353 | 0.647 | 1.000 | 0.000 |
| gift-any-holder | E->E | 228 | 6 | 1 | 0 | 221 | 0.026 | 0.007 | 1.000 | 0.000 |
| gift-any-holder | E->H | 304 | 35 | 236 | 0 | 33 | 0.113 | 0.774 | 1.000 | 0.000 |
| gift-any-holder | H->E | 304 | 123 | 180 | 0 | 1 | 0.420 | 0.578 | 1.000 | 0.000 |
| gift-any-holder | H->H | 250 | 233 | 17 | 0 | 0 | 0.927 | 0.073 | 1.000 | 0.000 |
| gift-hard-partner-only | E->E | 228 | 0 | 0 | 0 | 228 | 0.000 | 0.000 | 0.000 | 0.000 |
| gift-hard-partner-only | E->H | 304 | 5 | 147 | 0 | 152 | 0.020 | 0.478 | 1.000 | 0.000 |
| gift-hard-partner-only | H->E | 304 | 19 | 282 | 0 | 3 | 0.066 | 0.924 | 1.000 | 0.000 |
| gift-hard-partner-only | H->H | 250 | 240 | 10 | 0 | 0 | 0.963 | 0.037 | 1.000 | 0.000 |
| money-exact | E->E | 228 | 0 | 38 | 0 | 190 | 0.000 | 0.168 | 0.000 | 0.000 |
| money-exact | E->H | 304 | 0 | 304 | 0 | 0 | 0.000 | 1.000 | 0.000 | 0.000 |
| money-exact | H->E | 304 | 0 | 304 | 0 | 0 | 0.000 | 1.000 | 0.000 | 0.000 |
| money-exact | H->H | 250 | 48 | 202 | 0 | 0 | 0.191 | 0.809 | 1.000 | 0.000 |
| easy-easy-negative | E->E | 228 | 227 | 0 | 0 | 1 | 0.991 | 0.000 | 1.000 | 0.000 |
| easy-easy-negative | E->H | 304 | 4 | 296 | 0 | 4 | 0.013 | 0.973 | 1.000 | 0.000 |
| easy-easy-negative | H->E | 304 | 36 | 268 | 0 | 0 | 0.130 | 0.870 | 1.000 | 0.000 |
| easy-easy-negative | H->H | 250 | 184 | 66 | 0 | 0 | 0.737 | 0.263 | 1.000 | 0.000 |

## Proposal-to-execution conversion

The trace does not encode a rejection reason. For every attempted action, the following observed outcome classes are available: executed; no trade resolved; a counterparty gift resolved the meeting; a counterparty sale resolved it; or another resolution. These labels do not imply why the engine failed to execute an action.

### neutral

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->E | sale | 9 | 0 | 9 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | sale | 285 | 0 | 282 | 3 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 3 | 3 | 0 | 0 | 0 | 0 |
| H->E | sale | 301 | 0 | 301 | 0 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 64 | 64 | 0 | 0 | 0 | 0 |
| H->H | sale | 186 | 0 | 176 | 10 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### gift-exact

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 16 | 16 | 0 | 0 | 0 | 0 |
| E->E | sale | 2 | 0 | 2 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 37 | 37 | 0 | 0 | 0 | 0 |
| E->H | sale | 248 | 0 | 156 | 92 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 127 | 127 | 0 | 0 | 0 | 0 |
| H->E | sale | 177 | 0 | 168 | 9 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 228 | 228 | 0 | 0 | 0 | 0 |
| H->H | sale | 22 | 0 | 4 | 18 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### gift-easy-only

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 6 | 6 | 0 | 0 | 0 | 0 |
| E->E | sale | 6 | 0 | 6 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | sale | 281 | 0 | 266 | 15 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 16 | 16 | 0 | 0 | 0 | 0 |
| H->E | sale | 287 | 0 | 287 | 0 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 87 | 87 | 0 | 0 | 0 | 0 |
| H->H | sale | 163 | 0 | 134 | 29 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### gift-any-holder

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 6 | 6 | 0 | 0 | 0 | 0 |
| E->E | sale | 1 | 0 | 1 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 35 | 35 | 0 | 0 | 0 | 0 |
| E->H | sale | 236 | 0 | 156 | 80 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 123 | 123 | 0 | 0 | 0 | 0 |
| H->E | sale | 180 | 0 | 174 | 6 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 233 | 233 | 0 | 0 | 0 | 0 |
| H->H | sale | 17 | 0 | 6 | 11 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### gift-hard-partner-only

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->E | sale | 0 | 0 | 0 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 5 | 5 | 0 | 0 | 0 | 0 |
| E->H | sale | 147 | 0 | 134 | 13 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 19 | 19 | 0 | 0 | 0 | 0 |
| H->E | sale | 282 | 0 | 278 | 4 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 240 | 240 | 0 | 0 | 0 | 0 |
| H->H | sale | 10 | 0 | 0 | 10 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### money-exact

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->E | sale | 38 | 0 | 38 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | sale | 304 | 0 | 304 | 0 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | sale | 304 | 0 | 304 | 0 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 48 | 48 | 0 | 0 | 0 | 0 |
| H->H | sale | 202 | 0 | 196 | 6 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

### easy-easy-negative

| Cell | Action | Attempts | Executed | No trade | Counterparty gift | Counterparty sale | Other |
|---|---|---:|---:|---:|---:|---:|---:|
| E->E | gift | 227 | 227 | 0 | 0 | 0 | 0 |
| E->E | sale | 0 | 0 | 0 | 0 | 0 | 0 |
| E->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| E->H | gift | 4 | 4 | 0 | 0 | 0 | 0 |
| E->H | sale | 296 | 0 | 262 | 34 | 0 | 0 |
| E->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->E | gift | 36 | 36 | 0 | 0 | 0 | 0 |
| H->E | sale | 268 | 0 | 265 | 3 | 0 | 0 |
| H->E | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |
| H->H | gift | 184 | 184 | 0 | 0 | 0 | 0 |
| H->H | sale | 66 | 0 | 32 | 34 | 0 | 0 |
| H->H | mark-offer | 0 | 0 | 0 | 0 | 0 | 0 |

## Hard-actor spillover

| Arm | Cell | Mean rate | 95% CI | Neutral mean | Delta | Delta CI |
|---|---|---:|---:|---:|---:|---:|
| neutral | H->H | 0.261 | [0.174, 0.351] | 0.261 | 0.000 | [0.000, 0.000] |
| neutral | H->E | 0.012 | [0.000, 0.025] | 0.012 | 0.000 | [0.000, 0.000] |
| gift-exact | H->H | 0.906 | [0.849, 0.955] | 0.261 | 0.644 | [0.566, 0.725] |
| gift-exact | H->E | 0.427 | [0.360, 0.498] | 0.012 | 0.416 | [0.350, 0.485] |
| gift-easy-only | H->H | 0.353 | [0.238, 0.471] | 0.261 | 0.092 | [0.041, 0.144] |
| gift-easy-only | H->E | 0.054 | [0.033, 0.074] | 0.012 | 0.042 | [0.015, 0.067] |
| gift-any-holder | H->H | 0.927 | [0.880, 0.968] | 0.261 | 0.666 | [0.576, 0.756] |
| gift-any-holder | H->E | 0.420 | [0.358, 0.483] | 0.012 | 0.408 | [0.351, 0.469] |
| gift-hard-partner-only | H->H | 0.963 | [0.930, 0.990] | 0.261 | 0.702 | [0.607, 0.796] |
| gift-hard-partner-only | H->E | 0.066 | [0.042, 0.091] | 0.012 | 0.054 | [0.036, 0.073] |
| money-exact | H->H | 0.191 | [0.118, 0.273] | 0.261 | -0.070 | [-0.124, -0.030] |
| money-exact | H->E | 0.000 | [0.000, 0.000] | 0.012 | -0.012 | [-0.025, 0.000] |
| easy-easy-negative | H->H | 0.737 | [0.656, 0.815] | 0.261 | 0.476 | [0.406, 0.552] |
| easy-easy-negative | H->E | 0.130 | [0.083, 0.180] | 0.012 | 0.118 | [0.073, 0.169] |

## Model-free scripted benchmarks

| Policy | Mean score | 95% CI | H-H swap | E-H gift | H-E gift | E-E swap |
|---|---:|---:|---:|---:|---:|---:|
| never-transfer | 54.241 | [53.705, 54.857] | 0.000 | 0.000 | 0.000 | 0.000 |
| first-best | 63.188 | [62.438, 63.857] | 1.000 | 1.000 | 0.000 | 0.000 |
| always-give | 60.813 | [60.063, 61.509] | 1.000 | 0.000 | 0.000 | 1.000 |
| gift-rho-surrogate | 56.683 | [55.888, 57.460] | 0.784 | 0.049 | 0.402 | 0.007 |
| gift-rho-without-H-to-E | 57.853 | [57.188, 58.536] | 0.784 | 0.082 | 0.000 | 0.007 |

## Transaction payoff table

| Relation | Giver expected delta | Receiver expected delta | Total expected delta |
|---|---:|---:|---:|
| H→H swap | 1.83 | 1.83 | 3.66 |
| E→H gift | -0.50 | 2.33 | 1.83 |
| H→E gift | -0.96 | 0.00 | -0.96 |
| E↔E swap | -0.50 | -0.50 | -1.00 |
| E→H mark sale | -0.50 | 2.33 | 1.83 |

## Boundary of interpretation

The map confirms a large gift-arm increase in H→H proposals while the named E→H gift gate fails for gift-exact and gift-easy-only. This pattern is compatible with scope expansion, role misbinding, or generic transfer priming; X0 does not identify among them. The E↔E proposal gate and the executed reciprocal-swap endpoint are reported separately.

- The frozen W-SGB trace stores structured proposals and the resolved meeting kind, but no engine rejection code. Conversion rows therefore report the observed outcome class (executed, no trade, or counterparty resolution), not a causal rejection reason such as infeasibility or non-acceptance.
- Each round endows one check to every account; directed meeting opportunities are therefore the denominator for the requested P(proposal | role pair, check held) map. Proposal rates are summarized as means of 14 seed-level rates; pooled counts are retained separately.
- For the E↔E directive, the named-relation gate is a directed proposal gate (227/228 pooled); the executed reciprocal-swap rate is a separate endpoint (113/114).
- The scripted benchmarks are model-free engine runs on the same 14 seeds and are descriptive surplus yardsticks, not new model evidence or a second policy family.
- The map cannot by itself separate structured scope expansion, role misbinding, and generic transfer priming; that discrimination requires the proposed replay/factorial experiments.
