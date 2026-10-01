# VBE Study W-CO: Cross-Era Welfare Crowding-Out Replication Protocol

**Version:** 1.0 · 2026-09-13  
**Status:** project-internal prospective replication frozen before target calls; no external-registration claim  
**Model era:** provider-labeled V4.1 Flash era; canonical API model `deepseek-flash`, temperature 0, thinking disabled  
**Boundary on prior evidence:** Grok-era and earlier Flash-era results motivate the hypothesis and describe migration only; they are not pooled with this study

## 1. Research question

In the historical all-label environment, public money talk produced 24/44 interior mark sales and 0/76 unconditional gifts. Public gift talk produced 18/50 gifts and 0/28 mark sales, with an approximately +1.2-point mean-welfare contrast over three historical seeds. This first study in the new serving era tests whether gift talk, relative to money talk, replicates higher seed-level mean welfare while increasing gifts and reducing mark sales under an otherwise identical engine, population, parameterization, and random schedule.

“Crowding out” here denotes the dynamic total effect and behavioral substitution between two historical speech packages. The arms change multiple public sentences and there is no neutral/no-announcement arm. The study therefore does not identify pure suppression by money relative to no policy, a natural mediation effect, or a unique psychological mechanism.

## 2. Arms and exact stimuli

Each of 18 fresh seed blocks runs two arms:

1. `money-talk`: the historical `ANNOUNCE` byte-for-byte;
2. `gift-talk`: the historical `GIFT_ANNOUNCE` byte-for-byte.

Every controller is the same LLM. The study uses `DEFAULT_PARAMS`: eight accounts, 24 rounds, `R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`. Both arms use all-label prompts, with no Harari story, robot, forced execution, reward modification, or hidden treatment. Treatment is randomized at the seed-level population run. Meetings and agents are not independent units, and within-population interference is explicit.

## 3. Fresh seeds, pairing, and order

```text
13001, 13003, 13007, 13009, 13033, 13037,
13043, 13049, 13063, 13093, 13099, 13103,
13109, 13121, 13127, 13147, 13151, 13159
```

The two arms use `runPopulationAsyncPaired` within every seed, sharing initial holders, roles, pairings, and pre-generated agent-by-round payoff draws. Nine blocks run money first and nine run gift first. A structural-schedule hash mismatch or within-seed call-count mismatch invalidates the study. Offline enumeration fixes 1,364 environment decision calls per arm, 2,728 across both arms. The historical speech/unconfound runners used the older single-RNG path. This study preserves the stimuli and environment distribution but upgrades execution to separated structural/payoff randomness for strict pairing. It is a construct-and-workload replication, not a claim that the full historical data-generating process is byte-identical.

Any API, schema, or parse failure stops execution immediately; no idle or robot action substitutes for a failed model action. Completed cells are resumable and must not be rerun. No substantive verdict is computed before all 36 cells complete.

## 4. Primary estimand and criterion

The randomization and inference unit is the seed. The primary estimand is

\[
\Delta^{score}_s = \overline{Score}_{s,gift}-\overline{Score}_{s,money}.
\]

The welfare effect passes only if:

1. all 18 blocks are complete and schedule/call matched, with zero retained failures and all schema, stimulus, and order checks passing;
2. mean \(\Delta^{score}\ge +0.5\) points per account over 24 rounds;
3. the zero-centered one-sided exact paired sign-flip test has \(p\le0.025\).

The `+0.5` threshold is a study-specific minimum relevant welfare contrast, approximately 0.9% of the historical mean total score. It is below the hypothesis-generating three-seed contrast of about +1.2 while excluding near-zero changes that merely share direction. It is not borrowed from a ratio threshold in another experiment.

## 5. Joint mechanism-consistent substitution gate

For rounds 1–23:

- a gift opportunity is an H–E meeting in which Easy holds a check before choice; an Easy-to-Hard transfer without a mark is a gift;
- a sale opportunity additionally requires Hard to hold a mark before choice; one mark for one Easy check is a sale.

Opportunity rates are first computed within seed and arm, then paired:

\[
\Delta^{gift}_s=GiftRate_{gift}-GiftRate_{money},\qquad
\Delta^{sale}_s=SaleRate_{money}-SaleRate_{gift}.
\]

Each directional gate separately requires a mean of at least `+0.25` and a one-sided exact sign-flip `p≤0.025`. Only a passing welfare gate plus both behavior gates yields `WELFARE CROWDING-OUT PACKAGE REPLICATED`. A welfare pass with either behavior gate failing yields `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`. Because prior treatment behavior can alter later opportunity sets, these rates are post-treatment mechanism-consistent descriptions, not identified mediators.

## 6. Non-inferential shared-item bridge

Before the target environments and within the same provider-health bracket, the study runs 12 historical prompt byte strings:

- four E-BUY-WRAP-D `exact-narrow-anchor` items from blocks 1/4/7/10, historically 4/4 buys;
- four `exact-public-hard-anchor` items from the same blocks, historically 0/4 buys;
- four E-BUY `high-guaranteed` items from blocks 1/4/7/10, historically 4/4 buys.

The three classes occur four times each with within-block order rotation. The records retain prompt hash, raw response and hash, proposal, response ID, returned model, and fingerprint. Analysis reports class-specific historical agreement and the four transition counts only. The bridge has no pass threshold, never affects completeness, validity, significance, or verdict, and cannot establish old/new model equivalence. The 12 bridge calls plus 2,728 target calls make 2,740 study calls.

## 7. Provider-health bracket and serving-era baseline

After DeepSeek's announced 2026-09-14 04:00 UTC routing transition, `/models` must be read again. The full catalog, allowed returned model, unique output path, and the following fields must then be written into and frozen with the run-specific plan:

- `studyId=VBE-W-CO-WELFARE-CROWDING-OUT`;
- `requestedModel=deepseek-flash`;
- `eraBaselineMode=establish`;
- a new `servingEraId` and unique baseline path;
- historical sentinels fixed as cross-era descriptive only.

The required sequence is freeze → 14-call pre-flight → 12-call bridge → 36 target cells → immediate 14-call post-flight → zero-target-call finalization. The target runner requires a healthy pre-flight, a passing first-era baseline check, and no existing post-flight while target work remains. After interruption it resumes completed cells within the same bracket rather than opening or overwriting a bracket. A completed target remains `AWAITING POST-FLIGHT`; an unhealthy or identity-changing post bracket makes the formal verdict `INVALID`. Pre/post catalogs, returned-model sets, fingerprint sets, and prompt hashes must match. Only a healthy, identity-consistent post-flight establishes the era baseline. The full sequence requires an expected 2,768 calls.

Historical sentinels may differ from their earlier-Flash values by construction and remain outside health gates. The absence of a prior V4.1 Flash baseline is the normal first-run state under `establish`, not `BRACKET IDENTITY CHANGED`.

## 8. Verdicts and reporting boundary

- `INCOMPLETE`: fewer than 18 complete paired blocks;
- `INVALID`: schedule, call, stimulus, schema, failure, or order invariant fails;
- `AWAITING POST-FLIGHT`: target blocks are complete but the provider post-flight is not;
- `NO WELFARE PACKAGE EFFECT`: the primary welfare gate fails;
- `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`: welfare passes but the joint behavior gate does not;
- `WELFARE CROWDING-OUT PACKAGE REPLICATED`: welfare and both behavior gates pass.

Even the last verdict supports only: “the gift-talk package raises welfare relative to the money-talk package and is accompanied by gifts substituting for mark sales.” It does not support money reducing welfare relative to a neutral baseline, explicit-belief mediation, individual causal effects, or a general-equilibrium institutional claim. Pure crowding-out or mediation would require a separately frozen neutral arm, component randomization, or sequential mediation intervention.

## 9. Frozen artifacts

- `VBE-welfare-crowding-out-protocol.md` and `_EN.md`
- `vbe-engine/src/lib/vbe/welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/welfare-crowding-out-execution.ts`
- `vbe-engine/src/lib/vbe/run-welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/analyze-welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/welfare-crowding-out.test.ts`
- run-specific provider-health plan
- `vbe-engine/src/data/welfare-crowding-out-freeze.json`
- post-run private/public result mirrors and provider-health bracket/baseline

The manifest stores SHA-256 hashes for both protocols, core code, execution, runner, analyzer, tests, the health plan, shared env/prompts/speech/unconfound/minority/LLM/observed-chat/provider-health files, and the dry run. No API key may enter any artifact.
