# VBE DeepSeek Model-Routing Diagnostic Incident Report

**Date:** 2026-09-13  
**Nature:** post-hoc scratch diagnostic; not part of the frozen calls of E-BUY-EV-L or E-BUY-TEMP-R  
**Verdict:** `DOCUMENTED V4-TO-V4.1 FLASH ALIAS PLUS V4.1-FLASH-SERVING-IDENTITY-SPECIFIC OUTPUT COLLAPSE`

## 1. One-Sentence Conclusion

DeepSeek officially released V4.1 Flash on September 10, 2026, naming `deepseek-flash` as its canonical API identifier and temporarily routing the old `deepseek-v4-flash` name to V4.1 Flash. The account catalog is therefore consistent with the announced migration rather than an unexplained account anomaly; arbitrary unknown names still receive HTTP 400. Explicit `deepseek-flash` returned the same constant on a historical positive control. Before the announced Pro reroute cutoff, however, the same prompt under `deepseek-v4-pro` produced the sensible buy action, and the same RULES prefix with an unrelated arithmetic suffix produced its externally specified different JSON. The harness, parser, shared prefix, and provider platform as a whole are insufficient explanations; the collapse localizes to the provider-labeled V4.1 Flash serving identity.

## 2. Diagnostic Results

| Check | Result | Implication |
|---|---|---|
| Official V4.1 announcement | Canonical API name is `deepseek-flash`; old V4 Flash name temporarily routes to V4.1 Flash | Explains the alias and catalog structure |
| Account `/models` at 2026-09-14 01:23 UTC | Only `deepseek-flash`, `deepseek-v4-pro` | Consistent with the announced migration period |
| Deliberately nonexistent name | HTTP 400, error explicitly lists the two supported names above | Rules out generic silent fallback |
| `deepseek-v4-flash`, `thinking` removed | HTTP 200, returns `deepseek-flash`, fingerprint `aeb56401…cb669` | Removing `thinking` produces reasoning tokens but does not change identity mapping |
| `deepseek-flash`, thinking disabled | HTTP 200, same fingerprint | The two names currently enter the same observable serving identity |
| `deepseek-flash` replays one historical exact-narrow prompt | Same constant JSON, 18 completion tokens | Rules out the request alias alone producing the constant output |
| `deepseek-v4-pro` replays the same historical prompt at 00:44 UTC | `giveChits=1`, different fingerprint | Before the 04:00 UTC reroute cutoff, harness, prompt, schema, and parser were healthy on the same endpoint/account |
| Pro + same RULES + irrelevant arithmetic suffix | Exactly returns the externally prespecified different JSON | Shared RULES/cache prefix does not dominate output; the suffix is read |

Official references: [V4.1 Flash announcement](https://deepseek.com/en/news/deepseek-v4-1-flash/), [Lists Models](https://api-docs.deepseek.com/api/list-models), and [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/).

The account explicitly rejects unknown names but preserves the documented compatibility mapping for the old Flash name. The mapping is now provider-confirmed rather than merely inferred. The remaining unverifiable boundary is historical identity: older calls did not retain returned-model or fingerprint fields, so the September 8 and earlier Flash results cannot be aligned to the current V4.1 Flash weight identity.

## 3. Positivity for the 96/96 Constant

The retained facts are: under the same endpoint and same requested name, the historical 12/12 positive cases became 0/12 in the current window; the 96 distinct prompts of EV-L + TEMP-R returned a byte-level constant. The new diagnostic shows the constant still appears when explicitly requesting `deepseek-flash` in the account catalog.

But we no longer elevate this into a new research main line, nor frame it as a drift of some verifiable weight model. The strongest supported statement is:

1. a provider-documented V4-to-V4.1 Flash alias migration occurred;
2. the provider-labeled V4.1 Flash serving identity shows a cross-family zero-entropy output collapse on this workload, while the pre-cutoff Pro positive control does not;
3. historical responses did not save returned model/fingerprint, so backend identity across the two time windows cannot be confirmed identical;
4. this is a methodological and engineering alarm, not a finding about wrapper economics or the underlying model capability.

## 4. Impact on the Research Line

- the priority elevation of "make temporal reproducibility the primary object of study" is withdrawn;
- E-BUY-EV-L remains `TIER MANIPULATION NOT VALIDATED`, with no grounding attribution restored;
- E-BUY-TEMP-R is retained as an auditable endpoint-level temporal-instability/output-collapse record, but demoted to methods/limitations material;
- the original main line did not await E-BIS, E-CI, or C-M: all three were already completed, with results of an insensitive explicit-belief channel, no material action ITT, and concentration causally reducing velocity under fixed supply.

The xAI cross-provider control was not run because there is no `XAI_API_KEY` in the execution environment. The same-account, same-endpoint Pro control—completed before the announced Pro reroute cutoff—already provides stronger localization, so xAI is no longer a necessary gap. After the cutoff, `deepseek-v4-pro` also routes to V4.1 Flash and no longer supplies a distinct Pro identity.

## 5. Governance Fixes

1. Each new study saves the account `/models` catalog, the requested name, and the allowed returned-model set before freezing; unexpected mappings must abort before the first target call.
2. All new calls save returned model, fingerprint, response ID, usage, allowlisted headers, raw structured output, and hash, without saving keys.
3. All analyzers must be pure functions over frozen artifacts, completable with no credentials and no ambient LLM config. `analysis-keyless.test.ts` encodes this constraint and passes for all 37 analyzers.

## 6. Reproducible Artifacts

- structured diagnostic: `vbe-engine/src/data/provider-routing-diagnostic.json`;
- central null contamination audit: `VBE-central-null-contamination-audit.md`;
- credential-less analyzer test: `vbe-engine/src/lib/vbe/analysis-keyless.test.ts`;
- affected frozen results remain byte-identical: `buyer-wrapper-ev-ladder.json` and `buyer-temporal-replay.json`.
