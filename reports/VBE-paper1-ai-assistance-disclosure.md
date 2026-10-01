# AI-Assisted Technology Disclosure — Paper 1

**Status:** submission scaffold; the complete relevant prompt export must be appended before AAMAS submission.  
**Policy target:** AAMAS 2027 policy on AI-assisted technologies for authors.  
**Human accountability:** all authors remain responsible for hypotheses, methodology, implementation, analyses, citations, claims, and manuscript text. No AI system is an author.

## Tool and version record

- **Tool:** OpenAI Codex desktop application.
- **Model family visible to the authors:** GPT-5-based Codex agent.
- **Exact backend revision:** not exposed in the conversation interface available to the authors; if a more specific user-visible version is available at submission time, record it here without guessing.
- **Research target models:** DeepSeek serving identities used as experimental agents are study subjects, not authoring tools. Their returned identifiers, catalog records, fingerprints, prompts, and decoding settings are documented separately in the frozen study artifacts.

## Material uses

AI assistance contributed to:

1. critique and refinement of hypotheses about belief, execution, welfare, causal contribution, and counterfactual interventions;
2. experimental-design iteration, including paired arms, negative controls, engagement gates, minimum relevant effects, multiplicity control, provider-health brackets, and stopping rules;
3. implementation support for runners, analyzers, tests, manifests, hashes, and report generation;
4. audit-oriented interpretation of results and separation of confirmatory, exploratory, incomplete, and unsupported claims;
5. venue analysis, manuscript restructuring, English editing, LaTeX conversion, and bibliography checking.

AI assistance did not autonomously authorize API spending, select authors, assume accountability, or convert failed/incomplete studies into evidence. Frozen protocols and executable tests, rather than later prose, define the confirmatory gates.

## Representative prompt record

The following user prompts materially shaped hypotheses or methodology and are reproduced in their original language. They are representative, not yet the complete chronological export.

> “你有什么想法优化该研究，或者从哪里突破，脑洞可以开一些”

> “既然我们这里涉及到因果贡献，能否引入诸如‘反事实推理’或其他因果模型来优化我们的整体模型？”

> “这里的private，是什么样的private，是通过什么保证privacy的？”

> “下一步做什么？另外，我看到一篇论文：DCPO-Decoupling Reasoning and Confidence: Resurrecting Calibration in RL from Verifiable Rewards. 是否跟我们这个研究相关？”

> “在继续推进之前，我们先初步敲定venue，COLM主题虽然契合，但是需到明年再投，时间间隔太长，你怎么看？”

Many later turns used short continuation prompts such as “好的，继续推进”. For compliance, the final supplement should include those prompts together with the immediately preceding context or a full task transcript; listing the continuation phrase alone would omit the instruction it incorporated.

## Verification and human review

Before submission, human authors must verify and initial the following:

- [ ] Every numerical claim traces to a retained result artifact and pure analyzer output.
- [ ] Every confirmatory label follows a protocol frozen before target calls.
- [ ] Every citation resolves to a real primary or archival source and supports the adjacent claim.
- [ ] No API credential or identifying local path appears in the paper or supplement.
- [ ] The prose preserves the boundaries around private belief, money engagement, model eras, interference, and incomplete studies.
- [ ] The final prompt appendix is complete for hypothesis/methodology use and is anonymized.
- [ ] The final disclosure names the user-visible AI tool and version as precisely as the interface permits.

## Recommended supplement placement

Place this disclosure near the end of the anonymous supplement, before the artifact inventory. Keep the concise disclosure in the main paper so reviewers can see that assistance occurred even if they do not open the supplement. At camera-ready time, replace anonymous references with an archival link to the prompt/disclosure record if the authors choose to release it.

## Official policy source

[AAMAS 2027 submission instructions — Policy on AI-assisted Technologies for Authors](https://warwick.ac.uk/fac/sci/dcs/aamas2027/guidelines-and-policies/instructions/)
