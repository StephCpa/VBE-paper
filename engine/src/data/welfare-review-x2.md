# X2 zero-call boundary audit

**Zero model/API calls.** Post-hoc, descriptive reanalysis of the frozen W-CO, W-RG and W-SGB traces, replayed exactly through the frozen engine by X1. Version 1.0. 14010 decisions. Every interval resamples whole seeds (20000 percentile-bootstrap resamples, seed 20261008, stratified by study); a decision or meeting is never treated as an independent unit. History, round and partner are not randomized, so nothing here identifies a mechanism.

Source SHA-256:

- `src/data/welfare-crowding-out.json`: `f6438915387c05fc1eb1b4a94c9b70ba7ae4a77b0addd0e6bf1ed86d66779c96`
- `src/data/welfare-role-channel.json`: `149cedf566502b250e0dcaa53076698c9318188b9bb077d3ac96f5e8347b9b2c`
- `src/data/welfare-semantic-boundary.json`: `f4ab7c137903926871d9d1ef8d163f58d4b14dd60e209341cdf13d0597c09e26`

## 1. Endgame by exact round

Rates are unconditional-give rates in the directed cell. Rounds are calendar rounds (the prompt states `Round t of 24`). For symmetric cells, final-round meetings and meetings in which both gave are also counted, because the two decisions in one meeting are not independent. `Final − earlier` is the pooled final-round rate minus the pooled rate in rounds 1–23, with a seed-cluster bootstrap interval.

| Selection | Cell | Final round (t=24) | Meetings / both gave | Rounds 22–24 | Rounds 1–21 | Rounds 1–8 | Final − earlier [95% CI] |
|---|---|---|---|---|---|---|---|
| Gift (standard execution), three studies pooled | H>H | 0.90 (27/30; 15 seeds) | 15 / 13 | 0.93 (93/100; 34 seeds) | 0.91 (613/672; 44 seeds) | 0.93 (249/268; 42 seeds) | -0.02 [-0.18, 0.10] |
| Gift (standard execution), three studies pooled | E>H | 0.13 (4/31; 20 seeds) | 31 / — | 0.06 (7/116; 40 seeds) | 0.13 (105/823; 44 seeds) | 0.23 (70/300; 44 seeds) | 0.01 [-0.08, 0.10] |
| Neutral, W-RG and W-SGB pooled | H>H | 0.20 (4/20; 10 seeds) | 10 / 2 | 0.19 (12/62; 21 seeds) | 0.28 (111/402; 26 seeds) | 0.38 (54/142; 25 seeds) | -0.07 [-0.29, 0.21] |
| W-SGB gift-exact | H>H | 0.90 (9/10; 5 seeds) | 5 / 4 | 0.94 (30/32; 10 seeds) | 0.91 (198/218; 14 seeds) | 0.93 (69/74; 13 seeds) | -0.01 [-0.24, 0.13] |
| W-SGB gift-exact | H>E | 0.62 (8/13; 9 seeds) | 13 / — | 0.47 (20/43; 13 seeds) | 0.41 (107/261; 14 seeds) | 0.46 (42/91; 14 seeds) | 0.21 [-0.11, 0.51] |
| W-SGB gift-exact | E>H | 0.23 (3/13; 9 seeds) | 13 / — | 0.09 (4/43; 13 seeds) | 0.13 (33/261; 14 seeds) | 0.26 (24/91; 14 seeds) | 0.11 [-0.09, 0.30] |
| W-SGB gift-any-holder | H>H | 0.90 (9/10; 5 seeds) | 5 / 4 | 0.91 (29/32; 10 seeds) | 0.94 (204/218; 14 seeds) | 0.93 (69/74; 13 seeds) | -0.03 [-0.27, 0.10] |
| W-SGB gift-hard-partner-only | H>H | 1.00 (10/10; 5 seeds) | 5 / 5 | 1.00 (32/32; 10 seeds) | 0.95 (208/218; 14 seeds) | 0.93 (69/74; 13 seeds) | 0.04 [0.01, 0.08] |
| W-SGB neutral | H>H | 0.40 (4/10; 5 seeds) | 5 / 2 | 0.16 (5/32; 10 seeds) | 0.27 (59/218; 14 seeds) | 0.38 (28/74; 13 seeds) | 0.15 [-0.28, 0.74] |
| W-SGB easy-easy-negative | H>H | 0.70 (7/10; 5 seeds) | 5 / 3 | 0.72 (23/32; 10 seeds) | 0.74 (161/218; 14 seeds) | 0.84 (62/74; 13 seeds) | -0.04 [-0.44, 0.31] |
| W-SGB easy-easy-negative | E>E | 1.00 (6/6; 3 seeds) | 3 / 3 | 1.00 (20/20; 7 seeds) | 1.00 (207/208; 14 seeds) | 1.00 (78/78; 13 seeds) | 0.00 [0.00, 0.02] |
| W-RG gift-standard | H>H | 0.80 (8/10; 5 seeds) | 5 / 4 | 0.87 (26/30; 11 seeds) | 0.88 (161/184; 12 seeds) | 0.88 (60/68; 12 seeds) | -0.08 [-0.51, 0.16] |
| W-RG neutral-standard | H>H | 0.00 (0/10; 5 seeds) | 5 / 0 | 0.23 (7/30; 11 seeds) | 0.28 (52/184; 12 seeds) | 0.38 (26/68; 12 seeds) | -0.29 [-0.39, -0.21] |
| W-CO gift-talk | H>H | 1.00 (10/10; 5 seeds) | 5 / 5 | 0.97 (37/38; 13 seeds) | 0.94 (254/270; 18 seeds) | 0.95 (120/126; 17 seeds) | 0.06 [0.03, 0.09] |
| W-CO money-talk | H>H | 0.40 (4/10; 5 seeds) | 5 / 2 | 0.32 (12/38; 13 seeds) | 0.20 (55/270; 18 seeds) | 0.21 (27/126; 17 seeds) | 0.19 [-0.23, 0.74] |

Stage-game arithmetic for a Hard agent in an H–H meeting (Table 2 of the paper): keeping instead of giving gains 3.29 − 2.79 = 0.50 when the partner gives and 0.96 − 0 = 0.96 when the partner keeps. In the final round no future meeting remains.

## 2. First meeting versus prior meeting at the same exact round

Round 1 cannot contain history, so a comparison that pools first meetings over rounds 1–2 against prior-meeting decisions (which exist only in round 2) mixes a round contrast into the history contrast. The rows below compare the two groups within each exact round, and a Mantel–Haenszel round-standardized risk difference pools rounds 2–6 within study (weights n_first·n_prior/(n_first+n_prior)). First meeting = the account's first meeting of the run (empty memory); prior meeting = at least one earlier meeting in any role.

### E>H, Gift (standard execution), three studies

- Pooled rounds 1–2 (confounded by round): first 0.51 (41/81; 41 seeds) vs prior 0.05 (1/20; 18 seeds); difference 0.46.
- Round-standardized (rounds 2–6): difference 0.44 [0.28, 0.61]; 51 first-meeting and 131 prior-meeting decisions.

| Round | First meeting | Prior meeting | Difference |
|---:|---|---|---:|
| 2 | 0.45 (13/29; 22 seeds) | 0.05 (1/20; 18 seeds) | 0.40 |
| 3 | 0.33 (3/9; 8 seeds) | 0.16 (4/25; 21 seeds) | 0.17 |
| 4 | 0.50 (3/6; 6 seeds) | 0.00 (0/28; 18 seeds) | 0.50 |
| 5 | 0.33 (1/3; 3 seeds) | 0.00 (0/25; 20 seeds) | 0.33 |
| 6 | 1.00 (4/4; 4 seeds) | 0.03 (1/33; 23 seeds) | 0.97 |

### E>H, Gift exact, W-SGB

- Pooled rounds 1–2 (confounded by round): first 0.43 (12/28; 12 seeds) vs prior 0.20 (1/5; 5 seeds); difference 0.23.
- Round-standardized (rounds 2–6): difference 0.22 [-0.04, 0.56]; 17 first-meeting and 32 prior-meeting decisions.

| Round | First meeting | Prior meeting | Difference |
|---:|---|---|---:|
| 2 | 0.38 (3/8; 7 seeds) | 0.20 (1/5; 5 seeds) | 0.17 |
| 3 | 0.25 (1/4; 3 seeds) | 0.11 (1/9; 7 seeds) | 0.14 |
| 4 | 0.33 (1/3; 3 seeds) | 0.00 (0/7; 5 seeds) | 0.33 |
| 5 | 0.00 (0/1; 1 seeds) | 0.00 (0/8; 6 seeds) | 0.00 |
| 6 | 1.00 (1/1; 1 seeds) | 0.33 (1/3; 2 seeds) | 0.67 |

### H>E, Gift (standard execution), three studies

- Pooled rounds 1–2 (confounded by round): first 0.74 (64/86; 41 seeds) vs prior 0.47 (7/15; 14 seeds); difference 0.28.
- Round-standardized (rounds 2–6): difference 0.17 [-0.01, 0.35]; 55 first-meeting and 127 prior-meeting decisions.

| Round | First meeting | Prior meeting | Difference |
|---:|---|---|---:|
| 2 | 0.65 (22/34; 24 seeds) | 0.47 (7/15; 14 seeds) | 0.18 |
| 3 | 0.56 (5/9; 9 seeds) | 0.60 (15/25; 20 seeds) | -0.04 |
| 4 | 0.60 (3/5; 5 seeds) | 0.48 (14/29; 20 seeds) | 0.12 |
| 5 | 0.33 (1/3; 3 seeds) | 0.24 (6/25; 19 seeds) | 0.09 |
| 6 | 1.00 (4/4; 4 seeds) | 0.55 (18/33; 24 seeds) | 0.45 |

### H>H, Gift (standard execution), three studies

- Pooled rounds 1–2 (confounded by round): first 0.95 (39/41; 19 seeds) vs prior 1.00 (19/19; 12 seeds); difference -0.05.
- Round-standardized (rounds 2–6): difference -0.04 [-0.17, 0.08]; 39 first-meeting and 125 prior-meeting decisions.

| Round | First meeting | Prior meeting | Difference |
|---:|---|---|---:|
| 2 | 0.95 (18/19; 12 seeds) | 1.00 (19/19; 12 seeds) | -0.05 |
| 3 | 0.78 (7/9; 8 seeds) | 0.87 (20/23; 14 seeds) | -0.09 |
| 4 | 1.00 (5/5; 4 seeds) | 0.83 (19/23; 13 seeds) | 0.17 |
| 5 | 0.67 (2/3; 3 seeds) | 1.00 (29/29; 15 seeds) | -0.33 |
| 6 | 1.00 (3/3; 3 seeds) | 0.94 (29/31; 16 seeds) | 0.06 |

### H>H, Neutral, W-RG and W-SGB

- Pooled rounds 1–2 (confounded by round): first 0.20 (5/25; 11 seeds) vs prior 0.33 (3/9; 6 seeds); difference -0.13.
- Round-standardized (rounds 2–6): difference 0.12 [-0.20, 0.41]; 20 first-meeting and 66 prior-meeting decisions.

| Round | First meeting | Prior meeting | Difference |
|---:|---|---|---:|
| 2 | 0.18 (2/11; 7 seeds) | 0.33 (3/9; 6 seeds) | -0.15 |
| 3 | 0.67 (2/3; 3 seeds) | 0.38 (5/13; 7 seeds) | 0.28 |
| 4 | 0.67 (2/3; 2 seeds) | 0.13 (2/15; 8 seeds) | 0.53 |
| 5 | 0.50 (1/2; 2 seeds) | 0.57 (8/14; 7 seeds) | -0.07 |
| 6 | 0.00 (0/1; 1 seeds) | 0.40 (6/15; 8 seeds) | -0.40 |

## 3. Giving after an unreciprocated transfer

An unreciprocated transfer is a meeting in which the account's check moved and it received none (as shown in its own memory). Agents are randomly rematched each round, and the prompt shows partner ids in the agent's last four meetings, so giving toward a new partner after a loss is not a test of retaliation against the partner who failed to reciprocate. Rows are not mutually exclusive.

### H>H, Gift (standard execution), three studies

| Condition | Give rate (k/n; seeds) | 95% CI |
|---|---|---|
| first meeting | 0.91 (59/65; 30 seeds) | [0.84, 0.97] |
| previous meeting: mutual transfer | 0.99 (165/166; 40 seeds) | [0.98, 1.00] |
| previous meeting: unreciprocated own transfer | 0.89 (94/106; 42 seeds) | [0.82, 0.95] |
|   same cell, new partner | 0.64 (9/14; 12 seeds) | [0.40, 0.87] |
|   same partner as the loss | 0.92 (11/12; 11 seeds) | [0.82, 1.00] |
|   previous meeting in another cell | 0.92 (85/92; 39 seeds) | [0.87, 0.98] |
| previous meeting: received without giving | 0.89 (88/99; 39 seeds) | [0.83, 0.94] |
| previous meeting: no transfer | 0.89 (300/336; 44 seeds) | [0.85, 0.93] |
| last same-cell meeting was an unreciprocated own transfer | 0.73 (22/30; 21 seeds) | [0.62, 0.86] |
| last same-cell meeting was mutual | 0.97 (365/377; 44 seeds) | [0.95, 0.98] |
| partner is an account that earlier failed to reciprocate | 0.91 (67/74; 37 seeds) | [0.83, 0.97] |
| partner is an account that earlier reciprocated | 0.98 (103/105; 31 seeds) | [0.95, 1.00] |
| any earlier unreciprocated transfer, partner new | 0.94 (162/173; 43 seeds) | [0.90, 0.97] |

### H>H, Gift exact, W-SGB

| Condition | Give rate (k/n; seeds) | 95% CI |
|---|---|---|
| first meeting | 0.94 (17/18; 8 seeds) | [0.83, 1.00] |
| previous meeting: mutual transfer | 0.98 (56/57; 12 seeds) | [0.94, 1.00] |
| previous meeting: unreciprocated own transfer | 0.89 (25/28; 13 seeds) | [0.72, 1.00] |
|   same cell, new partner | 0.50 (2/4; 3 seeds) | [0.00, 1.00] |
|   same partner as the loss | 1.00 (3/3; 2 seeds) | [1.00, 1.00] |
|   previous meeting in another cell | 0.96 (23/24; 12 seeds) | [0.86, 1.00] |
| previous meeting: received without giving | 0.89 (24/27; 12 seeds) | [0.76, 1.00] |
| previous meeting: no transfer | 0.88 (106/120; 14 seeds) | [0.79, 0.95] |
| last same-cell meeting was an unreciprocated own transfer | 0.70 (7/10; 7 seeds) | [0.45, 0.91] |
| last same-cell meeting was mutual | 0.97 (119/123; 14 seeds) | [0.92, 1.00] |
| partner is an account that earlier failed to reciprocate | 0.95 (19/20; 11 seeds) | [0.83, 1.00] |
| partner is an account that earlier reciprocated | 1.00 (35/35; 10 seeds) | [1.00, 1.00] |
| any earlier unreciprocated transfer, partner new | 0.91 (48/53; 13 seeds) | [0.80, 0.98] |

### H>H, Harmful E-E, W-SGB

| Condition | Give rate (k/n; seeds) | 95% CI |
|---|---|---|
| first meeting | 0.83 (15/18; 8 seeds) | [0.67, 0.96] |
| previous meeting: mutual transfer | 0.88 (75/85; 14 seeds) | [0.82, 0.94] |
| previous meeting: unreciprocated own transfer | 0.37 (7/19; 11 seeds) | [0.16, 0.61] |
|   same cell, new partner | 0.38 (3/8; 6 seeds) | [0.00, 0.70] |
|   same partner as the loss | 0.33 (1/3; 3 seeds) | [0.00, 1.00] |
|   previous meeting in another cell | 0.44 (4/9; 7 seeds) | [0.14, 0.78] |
| previous meeting: received without giving | 0.50 (9/18; 9 seeds) | [0.27, 0.75] |
| previous meeting: no transfer | 0.71 (78/110; 14 seeds) | [0.61, 0.81] |
| last same-cell meeting was an unreciprocated own transfer | 0.43 (9/21; 11 seeds) | [0.18, 0.67] |
| last same-cell meeting was mutual | 0.86 (81/94; 14 seeds) | [0.78, 0.92] |
| partner is an account that earlier failed to reciprocate | 0.64 (7/11; 6 seeds) | [0.25, 0.92] |
| partner is an account that earlier reciprocated | 0.82 (42/51; 12 seeds) | [0.64, 0.95] |
| any earlier unreciprocated transfer, partner new | 0.55 (17/31; 14 seeds) | [0.38, 0.74] |

### H>H, Neutral, W-RG and W-SGB

| Condition | Give rate (k/n; seeds) | 95% CI |
|---|---|---|
| first meeting | 0.32 (12/37; 17 seeds) | [0.15, 0.53] |
| previous meeting: mutual transfer | 0.55 (12/22; 12 seeds) | [0.32, 0.73] |
| previous meeting: unreciprocated own transfer | 0.20 (1/5; 5 seeds) | [0.00, 0.60] |
|   same cell, new partner | 0.00 (0/3; 3 seeds) | [0.00, 0.00] |
|   same partner as the loss | 0.00 (0/1; 1 seeds) | [0.00, 0.00] |
|   previous meeting in another cell | 1.00 (1/1; 1 seeds) | [1.00, 1.00] |
| previous meeting: received without giving | 0.40 (2/5; 5 seeds) | [0.00, 0.80] |
| previous meeting: no transfer | 0.24 (96/395; 26 seeds) | [0.19, 0.30] |
| last same-cell meeting was an unreciprocated own transfer | 0.07 (1/15; 14 seeds) | [0.00, 0.18] |
| last same-cell meeting was mutual | 0.47 (33/70; 19 seeds) | [0.31, 0.61] |
| partner is an account that earlier failed to reciprocate | 0.20 (1/5; 4 seeds) | [0.00, 0.50] |
| partner is an account that earlier reciprocated | 1.00 (13/13; 5 seeds) | [1.00, 1.00] |
| any earlier unreciprocated transfer, partner new | 0.05 (1/20; 14 seeds) | [0.00, 0.14] |

## 4. Named E→H gift by encounter index, two definitions

`account meeting index` counts every meeting of the account in the run, in any role (roles are redrawn each round, so the n-th meeting may be in a different role from the first). `index within directed cell` counts only the account's meetings as an Easy decider facing a Hard partner. Bin `2+` pools every later encounter. R2 §4.3 reported first → second meeting under the first definition; first → all later meetings is the `2+` column.

| Study | Arm | Definition | 1st | 2nd | 3rd | 4th+ | 2nd and later |
|---|---|---|---|---|---|---|---|
| W-CO | gift-talk | account meeting index | 0.63 (26/41; 18 seeds) | 0.02 (1/45; 18 seeds) | 0.06 (2/32; 15 seeds) | 0.08 (20/255; 18 seeds) | 0.07 (23/332; 18 seeds) |
| W-CO | gift-talk | index within directed cell | 0.23 (31/134; 18 seeds) | 0.09 (10/106; 18 seeds) | 0.05 (4/74; 18 seeds) | 0.07 (4/59; 14 seeds) | 0.08 (18/239; 18 seeds) |
| W-RG | gift-standard | account meeting index | 0.52 (16/31; 12 seeds) | 0.00 (0/24; 10 seeds) | 0.12 (3/26; 12 seeds) | 0.04 (7/181; 12 seeds) | 0.04 (10/231; 12 seeds) |
| W-RG | gift-standard | index within directed cell | 0.20 (18/91; 12 seeds) | 0.07 (5/75; 12 seeds) | 0.04 (2/48; 12 seeds) | 0.02 (1/48; 10 seeds) | 0.05 (8/171; 12 seeds) |
| W-SGB | gift-exact | account meeting index | 0.44 (17/39; 14 seeds) | 0.07 (2/29; 14 seeds) | 0.09 (2/23; 12 seeds) | 0.08 (16/213; 14 seeds) | 0.08 (20/265; 14 seeds) |
| W-SGB | gift-exact | index within directed cell | 0.21 (23/108; 14 seeds) | 0.08 (7/83; 14 seeds) | 0.09 (5/53; 14 seeds) | 0.03 (2/60; 12 seeds) | 0.07 (14/196; 14 seeds) |

First decision in the named cell, split by whether it is also the account's first meeting of the run (pooled rate, seed-cluster 95% interval):

| Selection | Cell | First meeting of the run | First E→H decision after a meeting in another role | Later E→H decisions |
|---|---|---|---|---|
| Gift (standard execution), three studies pooled | E>H | 0.53 (59/111; 44 seeds) [0.44, 0.63] | 0.06 (13/222; 44 seeds) [0.03, 0.09] | 0.07 (40/606; 44 seeds) [0.04, 0.09] |
| W-CO gift-talk | E>H | 0.63 (26/41; 18 seeds) [0.47, 0.79] | 0.05 (5/93; 18 seeds) [0.00, 0.12] | 0.08 (18/239; 18 seeds) [0.03, 0.13] |
| W-RG gift-standard | E>H | 0.52 (16/31; 12 seeds) [0.34, 0.70] | 0.03 (2/60; 12 seeds) [0.00, 0.08] | 0.05 (8/171; 12 seeds) [0.02, 0.07] |
| W-SGB gift-exact | E>H | 0.44 (17/39; 14 seeds) [0.28, 0.60] | 0.09 (6/69; 14 seeds) [0.03, 0.15] | 0.07 (14/196; 14 seeds) [0.04, 0.11] |

W-SGB curves used by Figure 2B and its supplementary companion (account meeting index; pooled rate with seed-cluster 95% interval):

| Arm | Cell | 1st | 2nd | 3rd | 4th+ |
|---|---|---|---|---|---|
| gift-exact | H>H | 0.94 (17/18; 8 seeds) [0.83, 1.00] | 1.00 (23/23; 10 seeds) [1.00, 1.00] | 0.88 (21/24; 13 seeds) [0.67, 1.00] | 0.90 (167/185; 14 seeds) [0.85, 0.95] |
| gift-exact | H>E | 0.69 (24/35; 14 seeds) [0.53, 0.84] | 0.37 (10/27; 13 seeds) [0.22, 0.56] | 0.29 (10/35; 14 seeds) [0.15, 0.45] | 0.40 (83/207; 14 seeds) [0.34, 0.47] |
| gift-exact | E>H | 0.44 (17/39; 14 seeds) [0.28, 0.60] | 0.07 (2/29; 14 seeds) [0.00, 0.19] | 0.09 (2/23; 12 seeds) [0.00, 0.22] | 0.08 (16/213; 14 seeds) [0.04, 0.11] |
| gift-exact | E>E | 0.00 (0/20; 9 seeds) [0.00, 0.00] | 0.06 (2/33; 12 seeds) [0.00, 0.18] | 0.03 (1/30; 11 seeds) [0.00, 0.10] | 0.09 (13/145; 14 seeds) [0.05, 0.13] |
| easy-easy-negative | E>E | 1.00 (20/20; 9 seeds) [1.00, 1.00] | 1.00 (33/33; 12 seeds) [1.00, 1.00] | 1.00 (30/30; 11 seeds) [1.00, 1.00] | 0.99 (144/145; 14 seeds) [0.98, 1.00] |
| easy-easy-negative | H>H | 0.83 (15/18; 8 seeds) [0.67, 0.96] | 0.83 (19/23; 10 seeds) [0.65, 1.00] | 0.75 (18/24; 13 seeds) [0.57, 0.91] | 0.71 (132/185; 14 seeds) [0.63, 0.79] |
| easy-easy-negative | H>E | 0.00 (0/35; 14 seeds) [0.00, 0.00] | 0.22 (6/27; 13 seeds) [0.09, 0.33] | 0.17 (6/35; 14 seeds) [0.05, 0.32] | 0.12 (24/207; 14 seeds) [0.07, 0.17] |
| neutral | H>H | 0.39 (7/18; 8 seeds) [0.11, 0.67] | 0.43 (10/23; 10 seeds) [0.25, 0.68] | 0.13 (3/24; 13 seeds) [0.00, 0.32] | 0.24 (44/185; 14 seeds) [0.14, 0.34] |
| neutral | H>E | 0.00 (0/35; 14 seeds) [0.00, 0.00] | 0.00 (0/27; 13 seeds) [0.00, 0.00] | 0.03 (1/35; 14 seeds) [0.00, 0.11] | 0.01 (2/207; 14 seeds) [0.00, 0.02] |
| neutral | E>H | 0.00 (0/39; 14 seeds) [0.00, 0.00] | 0.00 (0/29; 14 seeds) [0.00, 0.00] | 0.00 (0/23; 12 seeds) [0.00, 0.00] | 0.00 (0/213; 14 seeds) [0.00, 0.00] |
| neutral | E>E | 0.00 (0/20; 9 seeds) [0.00, 0.00] | 0.00 (0/33; 12 seeds) [0.00, 0.00] | 0.00 (0/30; 11 seeds) [0.00, 0.00] | 0.00 (0/145; 14 seeds) [0.00, 0.00] |

## 5. Seed-clustered uncertainty

### Realized welfare accounting with per-component intervals

Per seed, each component is the realized contribution difference (arm − reference) summed over meetings and divided by 8 accounts; intervals bootstrap the seed-level values. Components are computed from unrounded values; rounding each to two decimals can make the displayed parts differ from the displayed total.

**W-SGB: gift-exact − neutral** (sum of unrounded components 2.0625; sum of rounded components 2.07; net 2.0625)

| Component | Mean per account | 95% CI | Seeds +/− |
|---|---:|---|---|
| H-H swap | 2.196 | [1.527, 2.920] | 13/0 of 14 |
| E-H swap | 0.357 | [0.165, 0.567] | 9/1 of 14 |
| One-way H->H | 0.116 | [-0.045, 0.263] | 9/2 of 14 |
| One-way E->H | 0.080 | [0.000, 0.161] | 3/0 of 14 |
| One-way H->E | -0.616 | [-0.804, -0.455] | 0/13 of 14 |
| Easy-Easy transfers | -0.071 | [-0.107, -0.036] | 0/9 of 14 |
| Net welfare change | 2.063 | [1.429, 2.808] | 14/0 of 14 |

**W-RG: gift-standard − neutral-standard** (sum of unrounded components 1.6823; sum of rounded components 1.69; net 1.6823)

| Component | Mean per account | 95% CI | Seeds +/− |
|---|---:|---|---|
| H-H swap | 2.406 | [1.875, 2.938] | 12/0 of 12 |
| E-H swap | 0.401 | [0.198, 0.604] | 8/1 of 12 |
| One-way H->H | 0.052 | [-0.162, 0.286] | 5/3 of 12 |
| One-way E->H | 0.031 | [0.000, 0.094] | 1/0 of 12 |
| One-way H->E | -1.125 | [-1.375, -0.844] | 0/11 of 12 |
| Easy-Easy transfers | -0.083 | [-0.135, -0.036] | 0/7 of 12 |
| Net welfare change | 1.682 | [0.859, 2.469] | 9/3 of 12 |

**W-SGB: easy-easy-negative − neutral** (sum of unrounded components 0.1875; sum of rounded components 0.18; net 0.1875)

| Component | Mean per account | 95% CI | Seeds +/− |
|---|---:|---|---|
| H-H swap | 1.232 | [0.830, 1.661] | 12/0 of 14 |
| E-H swap | 0.022 | [0.000, 0.067] | 1/0 of 14 |
| One-way H->H | 0.241 | [0.040, 0.460] | 10/4 of 14 |
| One-way E->H | 0.054 | [0.000, 0.134] | 2/0 of 14 |
| One-way H->E | -0.348 | [-0.589, -0.134] | 0/7 of 14 |
| Easy-Easy transfers | -1.013 | [-1.183, -0.844] | 0/14 of 14 |
| Net welfare change | 0.188 | [-0.339, 0.701] | 9/5 of 14 |

### One-directional discrepancies, seed as unit

Decisions are paired across arms by (seed, round, agent). First-decision pairs require identical prompts once the announcement is removed; same-prompt pairs require identical full prompts (the W-RG gift arms share the announcement). The seed-level statistic is (A gives & B keeps − B gives & A keeps) / matched pairs in that seed; p is the exact two-sided sign-flip p over seeds. W-CO's reference is the money announcement, so its rows are gift − money, not gift − neutral, and are not pooled with the others.

| Comparison | Pairs | A-only / B-only | Seeds | Seed-mean net rate [95% CI] | Two-sided p |
|---|---:|---|---:|---|---:|
| W-SGB gift exact vs neutral, E->H (named) | 39 | 17 / 0 | 14 | 0.482 [0.321, 0.643] | 0.00050 |
| W-SGB gift exact vs neutral, H->H | 18 | 10 / 0 | 8 | 0.552 [0.271, 0.833] | 0.03130 |
| W-SGB gift exact vs neutral, H->E | 35 | 24 / 0 | 14 | 0.720 [0.548, 0.869] | 0.00020 |
| W-SGB harmful E-E vs neutral, H->H | 18 | 8 / 0 | 8 | 0.427 [0.219, 0.646] | 0.03130 |
| W-SGB money exact vs neutral, H->H | 18 | 0 / 6 | 8 | -0.375 [-0.688, -0.125] | 0.12500 |
| W-RG gift vs neutral, E->H (named) | 31 | 16 / 0 | 12 | 0.507 [0.313, 0.708] | 0.00200 |
| W-RG gift vs neutral, H->H | 19 | 10 / 0 | 9 | 0.452 [0.163, 0.741] | 0.06250 |
| W-CO gift vs money, E->H (named) | 41 | 26 / 0 | 18 | 0.616 [0.444, 0.778] | 0.00010 |
| W-CO gift vs money, H->H | 28 | 22 / 0 | 13 | 0.769 [0.590, 0.910] | 0.00050 |
| W-RG gift-standard vs gift-hh-blocked | 250 | 10 / 16 | 12 | -0.011 [-0.074, 0.075] | 0.84770 |
| W-RG gift-standard vs gift-eh-gift-blocked | 388 | 16 / 15 | 12 | 0.014 [-0.027, 0.055] | 0.55470 |
| W-RG gift-hh-blocked vs gift-eh-gift-blocked | 239 | 13 / 11 | 12 | 0.019 [-0.029, 0.070] | 0.50780 |

## Boundary of interpretation

- Everything here is post hoc and descriptive. Later meetings condition on realized history; round, history, partner identity and own prior action are correlated and none is randomized.
- Endgame persistence is inconsistent with an account in which giving is sustained only by future incentives and final-round best responses; it does not identify what sustains giving.
- Within-round first-versus-prior comparisons remove the round confound in the pooled comparison, but prior meetings also change scores, own prior actions and other prompt content. Identifying a memory effect requires a fixed-state memory intervention (Protocol B2).
- Giving toward a new partner after an unreciprocated transfer does not test retaliation against the partner who failed to reciprocate; same-partner cases are reported separately and are few.
